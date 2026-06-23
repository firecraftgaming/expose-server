import express from 'express';
import http from 'http';
import net from 'net';
import { WebSocketServer, WebSocket } from 'ws';
import { logStore, type LogEntry } from '../LogStore.js';

export interface TunnelInfo {
  localHost: string;
  localPort: number;
  subdomain: string;
  serverHost: string;
  publicUrl: string;
  clientId: string;
}

function listenOnFreePort(server: http.Server, start: number): Promise<number> {
  return new Promise((resolve, reject) => {
    server.listen(start);
    server.once('listening', () => {
      const addr = server.address();
      resolve(typeof addr === 'object' && addr ? addr.port : start);
    });
    server.once('error', (e: NodeJS.ErrnoException) => {
      if (e.code === 'EADDRINUSE') {
        server.removeAllListeners('listening');
        server.removeAllListeners('error');
        listenOnFreePort(server, start + 1).then(resolve).catch(reject);
      } else {
        reject(e);
      }
    });
  });
}

let dashboardPort: number | null = null;

export async function startDashboard(preferredPort: number, tunnel: TunnelInfo): Promise<number> {
  if (dashboardPort !== null) return dashboardPort;

  const app = express();
  app.use(express.json());

  app.get('/api/tunnels', (_req, res) => {
    res.json([tunnel]);
  });

  app.get('/api/logs', (_req, res) => {
    res.json(logStore.list());
  });

  app.get('/api/log/:id', (req, res) => {
    const entry = logStore.get(req.params.id!);
    if (!entry) return res.status(404).json({ error: 'not found' });
    res.json({
      ...entry,
      requestBytes: entry.requestBytes.toString('base64'),
      responseBytes: entry.responseBytes.toString('base64'),
    });
  });

  app.post('/api/replay/:id', (req, res) => {
    const entry = logStore.get(req.params.id!);
    if (!entry) return res.status(404).json({ error: 'not found' });

    const startedAt = Date.now();
    const resChunks: Buffer[] = [];

    const sock = net.createConnection({ host: tunnel.localHost, port: tunnel.localPort });
    sock.setTimeout(10_000);
    sock.on('data', chunk => resChunks.push(chunk));
    // half-close after writing so keep-alive servers see EOF and close their end
    sock.end(entry.requestBytes);
    sock.on('close', () => {
      if (!res.headersSent) {
        const responseBytes = Buffer.concat(resChunks);
        const replayed = logStore.add(entry.requestBytes, responseBytes, startedAt);
        res.json({ id: replayed.id });
      }
    });
    sock.on('timeout', () => { sock.destroy(); if (!res.headersSent) res.status(504).json({ error: 'timeout' }); });
    sock.on('error', e => { if (!res.headersSent) res.status(502).json({ error: e.message }); });
  });

  app.post('/api/logs/clear', (_req, res) => {
    logStore.clear();
    res.json({ ok: true });
  });

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/socket' });
  const clients = new Set<WebSocket>();

  wss.on('connection', ws => {
    clients.add(ws);
    ws.on('close', () => clients.delete(ws));
  });

  const push = (event: string, data: unknown) => {
    const msg = JSON.stringify({ event, data });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  };

  logStore.on('log', (entry: LogEntry) => push('log', {
    ...entry,
    requestBytes: entry.requestBytes.toString('base64'),
    responseBytes: entry.responseBytes.toString('base64'),
  }));
  logStore.on('clear', () => push('clear', null));

  dashboardPort = await listenOnFreePort(server, preferredPort);
  return dashboardPort;
}
