import express from 'express';
import http from 'http';
import net from 'net';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { logStore, type ExposeLog } from '../LogStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, 'public');

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

function serveIndex(tunnel: TunnelInfo): string {
  const html = readFileSync(join(publicDir, 'index.html'), 'utf8');
  const pageData = JSON.stringify({
    subdomains: [tunnel.publicUrl],
    user: { can_specify_subdomains: 1 },
    max_logs: 1000,
    local_url: `http://${tunnel.localHost}:${tunnel.localPort}`,
  });
  return html.replace(
    '<div id="internalDashboard"></div>',
    `<div id="internalDashboard" data-page='${pageData.replace(/'/g, '&#39;')}'></div>`,
  );
}

let dashboardPort: number | null = null;

export async function startDashboard(preferredPort: number, tunnel: TunnelInfo): Promise<number> {
  if (dashboardPort !== null) return dashboardPort;

  const app = express();
  app.use(express.json());

  // Inject pageData into the SPA entry point
  app.get('/', (_req, res) => res.type('html').send(serveIndex(tunnel)));

  // Static assets (JS, CSS, fonts, favicons)
  app.use(express.static(publicDir));

  app.get('/api/tunnels', (_req, res) => {
    res.json([tunnel]);
  });

  app.get('/api/logs', (_req, res) => {
    res.json(logStore.list());
  });

  app.get('/api/log/:id', (req, res) => {
    const log = logStore.get(req.params.id!);
    if (!log) return res.status(404).json({ error: 'not found' });
    res.json(log);
  });

  app.post('/api/logs/search', (req, res) => {
    const term: string = (req.body as { search_term?: string }).search_term ?? '';
    res.json(logStore.search(term));
  });

  app.post('/api/replay/:id', (req, res) => {
    const log = logStore.get(req.params.id!);
    if (!log) return res.status(404).json({ error: 'not found' });

    const startedAt = Date.now();
    const resChunks: Buffer[] = [];
    const reqBuf = Buffer.from(log.request.raw, 'utf8');

    const sock = net.createConnection({ host: tunnel.localHost, port: tunnel.localPort });
    sock.setTimeout(10_000);
    sock.on('data', chunk => resChunks.push(chunk));
    sock.end(reqBuf);
    sock.on('close', () => {
      if (!res.headersSent) {
        const replayed = logStore.add(reqBuf, Buffer.concat(resChunks), startedAt, log.subdomain, tunnel.localPort);
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

  const pushListEntry = (log: ExposeLog) => {
    const msg = JSON.stringify(logStore.toListEntry(log));
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  };

  logStore.on('log', pushListEntry);
  logStore.on('clear', () => {
    const msg = JSON.stringify({ clear: true });
    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) ws.send(msg);
    }
  });

  dashboardPort = await listenOnFreePort(server, preferredPort);
  return dashboardPort;
}
