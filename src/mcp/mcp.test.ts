import { createHash } from 'node:crypto';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { authorize, cosineSearch, createMcpClient, type RagChunk } from './index';

// Este archivo prueba el comportamiento de las tools: se autoriza una vez.
beforeAll(async () => {
  vi.stubEnv('PUBLIC_MCP_KEY_HASH', createHash('sha256').update('test-key').digest('hex'));
  expect(await authorize('test-key')).toBe(true);
});

function parse(result: { content: unknown }): any {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

describe('portfolio-mcp (transporte en memoria)', () => {
  it('expone db_query y rag_search', async () => {
    const client = await createMcpClient();
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual(['db_query', 'rag_search']);
    await client.close();
  });

  it('db_query limita filas y marca truncated', async () => {
    const client = await createMcpClient();
    const data = parse(
      await client.callTool({ name: 'db_query', arguments: { tabla: 'tecnologias', limite: 2 } })
    );
    expect(data.error).toBeUndefined();
    expect(data.count).toBe(2);
    expect(data.truncated).toBe(true);
    expect(data.rows).toHaveLength(2);
    await client.close();
  });

  it('db_query filtra y ordena', async () => {
    const client = await createMcpClient();
    const data = parse(
      await client.callTool({
        name: 'db_query',
        arguments: { tabla: 'tecnologias', filtros: { nivel: 'Avanzado' }, orden: 'nombre' },
      })
    );
    expect(data.error).toBeUndefined();
    expect(data.rows.every((r: { nivel: string }) => r.nivel === 'Avanzado')).toBe(true);
    const names = data.rows.map((r: { nombre: string }) => r.nombre);
    expect([...names].sort((a, b) => a.localeCompare(b, 'es'))).toEqual(names);
    expect(data.truncated).toBe(false);
    await client.close();
  });

  it('db_query rechaza tabla y columna desconocidas', async () => {
    const client = await createMcpClient();
    const badTable = parse(
      await client.callTool({ name: 'db_query', arguments: { tabla: 'usuarios' } })
    );
    expect(badTable.error).toContain('Tabla desconocida');

    const badColumn = parse(
      await client.callTool({ name: 'db_query', arguments: { tabla: 'perfil', orden: 'password' } })
    );
    expect(badColumn.error).toContain('Columna desconocida');
    await client.close();
  });

  it('cosineSearch ordena por similitud y respeta metadata_filter', () => {
    const candidates: RagChunk[] = [
      { id: 1, doc_id: 1, chunk_index: 0, texto: 'uno', metadata: { seccion: 'a' }, embedding: [1, 0] },
      { id: 2, doc_id: 1, chunk_index: 1, texto: 'dos', metadata: { seccion: 'b' }, embedding: [0, 1] },
      { id: 3, doc_id: 2, chunk_index: 0, texto: 'tres', metadata: { seccion: 'a' }, embedding: [1, 1] },
    ];

    const all = cosineSearch([1, 0], candidates, 3);
    expect(all.map((r) => r.id)).toEqual([1, 3, 2]);
    expect(all[0].similarity).toBeCloseTo(1, 5);
    expect(all[1].similarity).toBeCloseTo(Math.SQRT1_2, 5);

    const filtered = cosineSearch([1, 0], candidates, 3, { seccion: 'a' });
    expect(filtered.map((r) => r.id)).toEqual([1, 3]);
  });
});
