import { EventEmitter } from 'events';
import { parseRequest, parseResponse, type ParsedRequest, type ParsedResponse } from './HttpParser.js';

export interface ListEntry {
  id: string;
  duration: number;
  request_method: string;
  request_uri: string;
  status_code: number;
  plugin_data: null;
}

export interface ExposeLog {
  id: string;
  performed_at: string;
  duration: number;
  subdomain: string;
  request: ParsedRequest;
  response: ParsedResponse;
}

class LogStore extends EventEmitter {
  private logs: ExposeLog[] = [];
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }

  add(requestBytes: Buffer, responseBytes: Buffer, startedAt: number, subdomain: string, localPort: number): ExposeLog {
    const id = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = Date.now() - startedAt;

    const log: ExposeLog = {
      id,
      performed_at: new Date(startedAt).toISOString(),
      duration,
      subdomain,
      request: parseRequest(requestBytes, localPort),
      response: parseResponse(responseBytes),
    };

    if (this.logs.length >= this.maxSize) this.logs.shift();
    this.logs.push(log);
    this.emit('log', log);
    return log;
  }

  toListEntry(log: ExposeLog): ListEntry {
    return {
      id: log.id,
      duration: log.duration,
      request_method: log.request.method,
      request_uri: log.request.uri,
      status_code: log.response.status,
      plugin_data: null,
    };
  }

  list(): ListEntry[] {
    return this.logs.map(l => this.toListEntry(l));
  }

  get(id: string): ExposeLog | undefined {
    return this.logs.find(l => l.id === id);
  }

  search(term: string): ListEntry[] {
    const t = term.toLowerCase();
    return this.logs
      .filter(l => l.request.uri.toLowerCase().includes(t) || l.request.method.toLowerCase().includes(t))
      .map(l => this.toListEntry(l));
  }

  clear(): void {
    this.logs = [];
    this.emit('clear');
  }
}

export const logStore = new LogStore();
