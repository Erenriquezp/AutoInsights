import { afterEach, describe, expect, it, vi } from 'vitest';
import { api, sha256Hex } from './api';

describe('sha256Hex', () => {
  it('hashes the UTF-8 bytes of the text, as hex', async () => {
    expect(await sha256Hex('{"question":"abc"}')).toBe(
      'b9db261bc20029d4d039a5449bbca7a58771e419354b141ba9a9004000c19109',
    );
  });

  it('hashes non-ASCII text by its UTF-8 bytes', async () => {
    expect(await sha256Hex('{"question":"¿Qué marca?"}')).toBe(
      'cc9ccd69d8461edcf5c81b5e0dcb08a69dbc7d9e281b55129d1a976d58eca9a7',
    );
  });
});

describe('api.ask', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('sends the hash of the exact body it posts, as CloudFront requires for signed POSTs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await api.ask('abc');

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(init.body).toBe('{"question":"abc"}');
    expect(headers['x-amz-content-sha256']).toBe(await sha256Hex(init.body as string));
  });
});
