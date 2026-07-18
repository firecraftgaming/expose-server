import zlib from 'zlib';

export interface ParsedRequest {
  method: string;
  uri: string;
  httpVersion: string;
  headers: Record<string, string>;
  body: string;
  query: { name: string; value: string }[];
  post: { name: string; value: string }[];
  raw: string;
  curl: string;
}

export interface ParsedResponse {
  status: number;
  reason: string;
  headers: Record<string, string>;
  body: string;
  raw: string;
}

// Split at the Buffer level so binary/compressed body bytes can't corrupt the header block.
function splitMessage(buf: Buffer): { headerStr: string; bodyBuf: Buffer } {
  const sep = buf.indexOf('\r\n\r\n');
  const headerStr = (sep === -1 ? buf : buf.slice(0, sep)).toString('utf8');
  const bodyBuf = sep === -1 ? Buffer.alloc(0) : buf.slice(sep + 4);
  return { headerStr, bodyBuf };
}

function parseHeaders(headerStr: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of headerStr.split('\r\n').slice(1)) {
    const colon = line.indexOf(':');
    if (colon > 0) headers[line.slice(0, colon).trim()] = line.slice(colon + 1).trim();
  }
  return headers;
}

function getHeader(headers: Record<string, string>, name: string): string {
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === name) return v;
  }
  return '';
}

function dechunk(buf: Buffer): Buffer {
  const chunks: Buffer[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const lineEnd = buf.indexOf('\r\n', pos);
    if (lineEnd === -1) break;
    const size = parseInt(buf.slice(pos, lineEnd).toString('ascii').split(';')[0]!.trim(), 16);
    if (!Number.isFinite(size) || size < 0) break;
    if (size === 0) break;
    const start = lineEnd + 2;
    chunks.push(buf.slice(start, Math.min(start + size, buf.length)));
    pos = start + size + 2;
  }
  return chunks.length ? Buffer.concat(chunks) : buf;
}

// Undo transfer-encoding (chunked framing) first, then content-encoding (compression).
function decodeBody(bodyBuf: Buffer, headers: Record<string, string>): string {
  if (getHeader(headers, 'transfer-encoding').toLowerCase().includes('chunked')) {
    bodyBuf = dechunk(bodyBuf);
  }
  const encoding = getHeader(headers, 'content-encoding').toLowerCase();
  try {
    if (encoding.includes('br')) return zlib.brotliDecompressSync(bodyBuf).toString('utf8');
    if (encoding.includes('gzip')) return zlib.gunzipSync(bodyBuf).toString('utf8');
    if (encoding.includes('deflate')) return zlib.inflateSync(bodyBuf).toString('utf8');
  } catch {
    // fall through to raw
  }
  return bodyBuf.toString('utf8');
}

function parseQuery(uri: string): { name: string; value: string }[] {
  const q = uri.indexOf('?');
  if (q === -1) return [];
  return uri.slice(q + 1).split('&').flatMap(pair => {
    const [k, v = ''] = pair.split('=');
    return k ? [{ name: decodeURIComponent(k), value: decodeURIComponent(v) }] : [];
  });
}

function parsePost(body: string, contentType: string): { name: string; value: string }[] {
  if (!contentType.includes('application/x-www-form-urlencoded')) return [];
  return body.split('&').flatMap(pair => {
    const [k, v = ''] = pair.split('=');
    return k ? [{ name: decodeURIComponent(k), value: decodeURIComponent(v) }] : [];
  });
}

function buildCurl(method: string, uri: string, headers: Record<string, string>, body: string, localPort: number): string {
  const forwardedHost = getHeader(headers, 'x-forwarded-host') || getHeader(headers, 'x-original-host');
  const forwardedProto = getHeader(headers, 'x-forwarded-proto') || 'https';
  const url = forwardedHost
    ? `${forwardedProto}://${forwardedHost}${uri}`
    : `http://localhost:${localPort}${uri}`;
  const parts = [`curl -X ${method} "${url}"`];
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() === 'host') continue;
    parts.push(`-H "${k}: ${v.replace(/"/g, '\\"')}"`);
  }
  if (body) parts.push(`-d '${body.replace(/'/g, "\\'")}'`);
  return parts.join(' ');
}

export function parseRequest(buf: Buffer, localPort: number): ParsedRequest {
  const { headerStr, bodyBuf } = splitMessage(buf);
  const firstLine = headerStr.slice(0, headerStr.indexOf('\r\n'));
  const [method = 'GET', uri = '/', httpVersion = 'HTTP/1.1'] = firstLine.split(' ');
  const headers = parseHeaders(headerStr);
  const body = decodeBody(bodyBuf, headers);
  return {
    method: method!,
    uri: uri!,
    httpVersion: httpVersion!,
    headers,
    body,
    query: parseQuery(uri!),
    post: parsePost(body, getHeader(headers, 'content-type')),
    raw: buf.toString('utf8'),
    curl: buildCurl(method!, uri!, headers, body, localPort),
  };
}

export function parseResponse(buf: Buffer): ParsedResponse {
  const { headerStr, bodyBuf } = splitMessage(buf);
  const firstLine = headerStr.slice(0, headerStr.indexOf('\r\n'));
  const spaceIdx = firstLine.indexOf(' ');
  const rest = firstLine.slice(spaceIdx + 1);
  const space2 = rest.indexOf(' ');
  const status = parseInt(rest.slice(0, space2 === -1 ? undefined : space2), 10) || 0;
  const reason = space2 === -1 ? '' : rest.slice(space2 + 1);

  const headers = parseHeaders(headerStr);
  return { status, reason, headers, body: decodeBody(bodyBuf, headers), raw: buf.toString('utf8') };
}
