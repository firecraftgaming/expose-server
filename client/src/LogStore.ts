import { EventEmitter } from 'events';

export interface LogEntry {
  id: string;
  startedAt: number;
  durationMs: number | null;
  method: string;
  path: string;
  status: number | null;
  requestBytes: Buffer;
  responseBytes: Buffer;
  requestHeaders: Record<string, string>;
  responseHeaders: Record<string, string>;
}

function parseRequestLine(buf: Buffer): { method: string; path: string; headers: Record<string, string> } {
  const text = buf.toString('utf8', 0, Math.min(buf.length, 8192));
  const lines = text.split('\r\n');
  const [method = 'GET', path = '/'] = (lines[0] ?? '').split(' ');
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) break;
    const colon = lines[i]!.indexOf(':');
    if (colon > 0) {
      headers[lines[i]!.slice(0, colon).toLowerCase().trim()] = lines[i]!.slice(colon + 1).trim();
    }
  }
  return { method: method ?? 'GET', path: path ?? '/', headers };
}

function parseResponseStatus(buf: Buffer): { status: number | null; headers: Record<string, string> } {
  const text = buf.toString('utf8', 0, Math.min(buf.length, 8192));
  const lines = text.split('\r\n');
  const statusMatch = (lines[0] ?? '').match(/^HTTP\/\S+\s+(\d+)/);
  const status = statusMatch ? parseInt(statusMatch[1]!, 10) : null;
  const headers: Record<string, string> = {};
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) break;
    const colon = lines[i]!.indexOf(':');
    if (colon > 0) {
      headers[lines[i]!.slice(0, colon).toLowerCase().trim()] = lines[i]!.slice(colon + 1).trim();
    }
  }
  return { status, headers };
}

class LogStore extends EventEmitter {
  private entries: LogEntry[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }

  add(requestBytes: Buffer, responseBytes: Buffer, startedAt: number): LogEntry {
    const id = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    const { method, path, headers: requestHeaders } = parseRequestLine(requestBytes);
    const { status, headers: responseHeaders } = parseResponseStatus(responseBytes);

    const entry: LogEntry = {
      id,
      startedAt,
      durationMs: Date.now() - startedAt,
      method,
      path,
      status,
      requestBytes,
      responseBytes,
      requestHeaders,
      responseHeaders,
    };

    if (this.entries.length >= this.maxSize) this.entries.shift();
    this.entries.push(entry);
    this.emit('log', entry);
    return entry;
  }

  list(): Omit<LogEntry, 'requestBytes' | 'responseBytes'>[] {
    return this.entries.map(({ requestBytes: _r, responseBytes: _s, ...rest }) => rest);
  }

  get(id: string): LogEntry | undefined {
    return this.entries.find(e => e.id === id);
  }

  clear(): void {
    this.entries = [];
    this.emit('clear');
  }
}

export const logStore = new LogStore();
