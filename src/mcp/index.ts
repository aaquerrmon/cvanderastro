import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import chunksRag from '../data/db/chunks_rag.json';
import documentosRag from '../data/db/documentos_rag.json';
import educacion from '../data/db/educacion.json';
import experiencia from '../data/db/experiencia.json';
import idiomas from '../data/db/idiomas.json';
import perfil from '../data/db/perfil.json';
import proyectos from '../data/db/proyectos.json';
import tecnologias from '../data/db/tecnologias.json';

export type Row = Record<string, unknown>;

export interface RagChunk {
  id: number;
  doc_id: number;
  chunk_index: number;
  texto: string;
  metadata: Record<string, unknown> | null;
  embedding: number[];
}

type DbQueryArgs = {
  tabla: string;
  filtros?: Record<string, unknown>;
  orden?: string;
  desc?: boolean;
  limite?: number;
};

export interface SearchResult {
  id: number;
  content: string;
  metadata: Record<string, unknown>;
  similarity: number;
}

const TABLES: Record<string, Row[]> = {
  perfil: perfil as Row[],
  experiencia: experiencia as Row[],
  proyectos: proyectos as Row[],
  tecnologias: tecnologias as Row[],
  idiomas: idiomas as Row[],
  educacion: educacion as Row[],
  documentos_rag: documentosRag as Row[],
  chunks_rag: chunksRag as Row[],
};

const TABLE_NAMES = Object.keys(TABLES);
const chunks = chunksRag as unknown as RagChunk[];

// --------------------------------------------------
// API key: en el bundle solo viaja el SHA-256, nunca la key
// --------------------------------------------------

let authorized = false;

export async function authorize(apiKey: string): Promise<boolean> {
  // Acceso dinámico: permite stubear la env en tests; en build la variable
  // estática cubre el caso de que el objeto import.meta.env no la incluya
  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const expected = String(
    env['PUBLIC_MCP_KEY_HASH'] ?? import.meta.env.PUBLIC_MCP_KEY_HASH ?? ''
  ).toLowerCase();

  if (!apiKey || !expected) {
    authorized = false; // fail closed: sin hash configurado no se autoriza nunca
    return false;
  }

  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(apiKey));
  const hash = Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  authorized = hash === expected;
  return authorized;
}

const AUTH_ERROR =
  'API key requerida o inválida: valida authorize(apiKey) antes de llamar a las tools.';

function err(message: string): string {
  return JSON.stringify({ error: message });
}

function matches(row: Row, filtros: Record<string, unknown>): boolean {
  return Object.entries(filtros).every(([col, val]) => {
    const v = row[col];
    if (val === null) return v === null || v === undefined;
    if (Array.isArray(val)) return val.some((x) => x === v);
    return v === val;
  });
}

function compare(a: unknown, b: unknown): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a ?? '').localeCompare(String(b ?? ''), 'es');
}

export function runQuery(args: DbQueryArgs): string {
  const { tabla, filtros, orden, desc = false, limite = 100 } = args;

  const rows = TABLES[tabla];
  if (!rows) return err(`Tabla desconocida: ${tabla}. Tablas válidas: ${TABLE_NAMES.join(', ')}`);

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const known = (col: string) => columns.length === 0 || columns.includes(col);

  if (filtros) {
    for (const col of Object.keys(filtros)) {
      if (!known(col)) return err(`Columna desconocida en filtros: ${col}`);
    }
  }
  if (orden && !known(orden)) return err(`Columna desconocida en orden: ${orden}`);

  let out = rows;
  if (filtros) out = out.filter((row) => matches(row, filtros));
  if (orden) {
    const key = orden;
    out = [...out].sort((a, b) => (desc ? compare(b[key], a[key]) : compare(a[key], b[key])));
  }

  const max = Math.min(Math.max(Math.trunc(limite), 1), 500);
  const truncated = out.length > max;
  const page = out.slice(0, max);
  return JSON.stringify({ rows: page, count: page.length, truncated });
}

// --------------------------------------------------
// RAG: embeddings en el navegador (mismo e5 que el servidor)
// --------------------------------------------------

const E5_MODEL = 'Xenova/multilingual-e5-small';

type Extractor = (text: string, options?: Record<string, unknown>) => Promise<{ data: Float32Array }>;

let extractorPromise: Promise<Extractor> | null = null;

function getExtractor(): Promise<Extractor> {
  // Import dinámico: onnxruntime-web (~decenas de MB) solo se carga en la 1ª búsqueda
  extractorPromise ??= import('@huggingface/transformers').then(
    (m) =>
      m.pipeline('feature-extraction', E5_MODEL, { dtype: 'q8' }) as unknown as Promise<Extractor>
  );
  return extractorPromise;
}

export async function embedQuery(text: string): Promise<Float32Array> {
  const extract = await getExtractor();
  // e5 exige prefijos: "query:" al buscar, los chunks se ingirieron con "passage:"
  const tensor = await extract(`query: ${text}`, { pooling: 'mean', normalize: true });
  return tensor.data;
}

function subsetMatch(metadata: Record<string, unknown>, filter: Record<string, unknown>): boolean {
  return Object.entries(filter).every(([k, v]) => metadata[k] === v);
}

export function cosineSearch(
  query: ArrayLike<number>,
  candidates: RagChunk[],
  topK: number,
  metadataFilter?: Record<string, unknown>
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const chunk of candidates) {
    const emb = chunk.embedding;
    if (!emb || emb.length !== query.length) continue;
    if (metadataFilter && !subsetMatch(chunk.metadata ?? {}, metadataFilter)) continue;

    let dot = 0;
    let normQ = 0;
    let normE = 0;
    for (let i = 0; i < emb.length; i++) {
      const q = query[i];
      const e = emb[i];
      dot += q * e;
      normQ += q * q;
      normE += e * e;
    }
    const similarity = normQ > 0 && normE > 0 ? dot / (Math.sqrt(normQ) * Math.sqrt(normE)) : 0;

    results.push({
      id: chunk.id,
      content: chunk.texto,
      metadata: chunk.metadata ?? {},
      similarity,
    });
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

// --------------------------------------------------
// Servidor MCP en memoria
// --------------------------------------------------

export function createServer(): McpServer {
  const server = new McpServer({ name: 'portfolio-mcp', version: '1.0.0' });

  server.registerTool(
    'db_query',
    {
      description:
        'Consulta datos del portfolio (JSON en el cliente, sin SQL). ' +
        `Tablas disponibles: ${TABLE_NAMES.join(', ')}.`,
      inputSchema: {
        tabla: z.string().describe(`Una de: ${TABLE_NAMES.join(', ')}`),
        filtros: z
          .record(z.string(), z.unknown())
          .optional()
          .describe(
            'Igualdad por columna: un valor filtra por igualdad, un array incluye (IN) y null es IS NULL'
          ),
        orden: z.string().optional().describe('Columna por la que ordenar'),
        desc: z.boolean().optional().describe('Orden descendente (por defecto ascendente)'),
        limite: z.number().optional().describe('Máximo de filas (1-500, por defecto 100)'),
      },
    },
    ({ tabla, filtros, orden, desc, limite }) => ({
      content: [
        {
          type: 'text',
          text: authorized
            ? runQuery({ tabla, filtros, orden, desc, limite })
            : err(AUTH_ERROR),
        },
      ],
    })
  );

  server.registerTool(
    'rag_search',
    {
      description:
        'Búsqueda semántica sobre los chunks de documentos del portfolio. Genera el ' +
        'embedding de la pregunta con multilingual-e5-small en el navegador (la primera ' +
        'llamada descarga el modelo, ~135 MB, y queda cacheado) y calcula la similitud coseno.',
      inputSchema: {
        question: z.string(),
        top_k: z.number().optional().describe('Número de resultados (1-20, por defecto 5)'),
        metadata_filter: z
          .record(z.string(), z.unknown())
          .optional()
          .describe('Filtro por subconjunto de la metadata JSONB'),
      },
    },
    async ({ question, top_k, metadata_filter }) => {
      if (!authorized) return { content: [{ type: 'text', text: err(AUTH_ERROR) }] };
      try {
        const queryEmbedding = await embedQuery(question);
        const topK = Math.min(Math.max(Math.trunc(top_k ?? 5), 1), 20);
        const results = cosineSearch(queryEmbedding, chunks, topK, metadata_filter);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ question, total_results: results.length, results }),
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: 'text', text: err(String(error)) }] };
      }
    }
  );

  return server;
}

export async function createMcpClient(): Promise<Client> {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  const client = new Client({ name: 'portfolio-terminal', version: '1.0.0' });
  await createServer().connect(serverTransport);
  await client.connect(clientTransport);

  return client;
}
