import { createHash } from 'node:crypto';

import { describe, expect, it, vi } from 'vitest';

import { authorize, createMcpClient } from './index';

const HASH = createHash('sha256').update('clave-correcta').digest('hex');

function parse(result: { content: unknown }): any {
  const content = result.content as Array<{ type: string; text: string }>;
  return JSON.parse(content[0].text);
}

describe('autorización con API key', () => {
  it('rechaza las tools sin key', async () => {
    const client = await createMcpClient();

    const db = parse(await client.callTool({ name: 'db_query', arguments: { tabla: 'perfil' } }));
    expect(db.error).toContain('API key');

    const rag = parse(
      await client.callTool({ name: 'rag_search', arguments: { question: 'hola' } })
    );
    expect(rag.error).toContain('API key');

    await client.close();
  });

  it('rechaza una key incorrecta', async () => {
    vi.stubEnv('PUBLIC_MCP_KEY_HASH', HASH);
    expect(await authorize('otra-key')).toBe(false);

    const client = await createMcpClient();
    const db = parse(await client.callTool({ name: 'db_query', arguments: { tabla: 'perfil' } }));
    expect(db.error).toContain('API key');
    await client.close();
  });

  it('acepta la key correcta', async () => {
    vi.stubEnv('PUBLIC_MCP_KEY_HASH', HASH);
    expect(await authorize('clave-correcta')).toBe(true);

    const client = await createMcpClient();
    const db = parse(await client.callTool({ name: 'db_query', arguments: { tabla: 'perfil' } }));
    expect(db.error).toBeUndefined();
    expect(db.count).toBe(1);
    await client.close();
  });
});
