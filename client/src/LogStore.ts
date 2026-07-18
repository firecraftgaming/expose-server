import { EventEmitter } from 'events';
import { parseRequest, parseResponse, type ParsedRequest, type ParsedResponse } from './HttpParser.js';

export interface ListEntry {
  id: string;
  duration: number;
  request_method: string;
  request_uri: string;
  status_code: number | null;
  plugin_data: null;
  complete: boolean;
}

export interface ExposeLog {
  id: string;
  performed_at: string;
  duration: number;
  subdomain: string;
  request: ParsedRequest;
  response: ParsedResponse;
  complete: boolean;
}

interface LiveEntry {
  reqChunks: Buffer[];
  resChunks: Buffer[];
  startedAt: number;
  subdomain: string;
  localPort: number;
}

// Coalesce per-chunk re-parse + broadcast for streamed bodies so a fast producer
// can't trigger an O(n²) reparse-of-the-whole-buffer on every chunk.
const UPDATE_THROTTLE_MS = 100;

class LogStore extends EventEmitter {
  private logs: ExposeLog[] = [];
  private live = new Map<string, LiveEntry>();
  private updateTimers = new Map<string, NodeJS.Timeout>();
  private readonly maxSize: number;

  constructor(maxSize = 1000) {
    super();
    this.maxSize = maxSize;
  }

  // Register an in-flight request the moment it reaches the local app, before any
  // response has arrived. Returns the id used by append*/finish.
  start(requestBytes: Buffer, startedAt: number, subdomain: string, localPort: number): string {
    const id = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;
    this.live.set(id, { reqChunks: [requestBytes], resChunks: [], startedAt, subdomain, localPort });

    const log = this.rebuild(id, false);
    if (this.logs.length >= this.maxSize) this.logs.shift();
    this.logs.push(log);
    this.emit('log', log);
    this.emit('update', log);
    return id;
  }

  appendRequest(id: string, chunk: Buffer): void {
    const live = this.live.get(id);
    if (!live) return;
    live.reqChunks.push(chunk);
    this.scheduleUpdate(id);
  }

  appendResponse(id: string, chunk: Buffer): void {
    const live = this.live.get(id);
    if (!live) return;
    live.resChunks.push(chunk);
    this.scheduleUpdate(id);
  }

  finish(id: string): void {
    if (!this.live.has(id)) return;
    this.clearTimer(id);
    const log = this.rebuild(id, true);
    this.live.delete(id);
    this.emit('log', log);
    this.emit('update', log);
  }

  private scheduleUpdate(id: string): void {
    if (this.updateTimers.has(id)) return;
    const timer = setTimeout(() => {
      this.updateTimers.delete(id);
      if (this.live.has(id)) this.emit('update', this.rebuild(id, false));
    }, UPDATE_THROTTLE_MS);
    timer.unref?.();
    this.updateTimers.set(id, timer);
  }

  private clearTimer(id: string): void {
    const timer = this.updateTimers.get(id);
    if (timer) {
      clearTimeout(timer);
      this.updateTimers.delete(id);
    }
  }

  private rebuild(id: string, complete: boolean): ExposeLog {
    const live = this.live.get(id)!;
    const log: ExposeLog = {
      id,
      performed_at: new Date(live.startedAt).toISOString(),
      duration: Date.now() - live.startedAt,
      subdomain: live.subdomain,
      request: parseRequest(Buffer.concat(live.reqChunks), live.localPort),
      response: parseResponse(Buffer.concat(live.resChunks)),
      complete,
    };
    const idx = this.logs.findIndex(l => l.id === id);
    if (idx > -1) this.logs[idx] = log;
    return log;
  }

  // Direct insert of an already-complete request/response pair (used by replay).
  add(requestBytes: Buffer, responseBytes: Buffer, startedAt: number, subdomain: string, localPort: number): ExposeLog {
    const id = `${startedAt}-${Math.random().toString(36).slice(2, 8)}`;

    const log: ExposeLog = {
      id,
      performed_at: new Date(startedAt).toISOString(),
      duration: Date.now() - startedAt,
      subdomain,
      request: parseRequest(requestBytes, localPort),
      response: parseResponse(responseBytes),
      complete: true,
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
      status_code: !log.complete && log.response.status === 0 ? null : log.response.status,
      plugin_data: null,
      complete: log.complete,
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
    for (const timer of this.updateTimers.values()) clearTimeout(timer);
    this.updateTimers.clear();
    this.logs = [];
    this.live.clear();
    this.emit('clear');
  }
}

export const logStore = new LogStore();
