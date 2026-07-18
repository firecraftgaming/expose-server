import net from 'net';
import { WebSocket } from 'ws';
import { logStore } from './LogStore.js';
import { type Config, controlUrl, CONTROL_HEADERS } from './config.js';

interface ProxyRequest {
  request_id: string;
  client_id: string;
}

const HTTP_METHOD_PREFIXES = ['GET ', 'POST ', 'PUT ', 'PATCH ', 'DELETE ', 'HEAD ', 'OPTIONS ', 'CONNECT '];

function isNewHttpRequest(chunk: Buffer): boolean {
  const preview = chunk.slice(0, 9).toString('ascii');
  return HTTP_METHOD_PREFIXES.some(m => preview.startsWith(m));
}

// Force the local server to close after one response so we get clean timing.
function forceConnectionClose(requestBytes: Buffer): Buffer {
  const raw = requestBytes.toString('utf8');
  const sep = raw.indexOf('\r\n\r\n');
  if (sep === -1) return requestBytes;
  const headerBlock = raw.slice(0, sep);
  const body = raw.slice(sep);
  const lines = headerBlock.split('\r\n').filter(l => !/^connection\s*:/i.test(l));
  lines.push('Connection: close');
  return Buffer.from(lines.join('\r\n') + body, 'utf8');
}

export function handleCreateProxy(data: ProxyRequest, config: Config, subdomain: string): void {
  const ws = new WebSocket(controlUrl(config), { headers: CONTROL_HEADERS });

  let localSock: net.Socket | null = null;
  let liveId: string | null = null;

  const finalize = () => {
    if (!liveId) return;
    logStore.finish(liveId);
    liveId = null;
  };

  const teardownSock = (sock: net.Socket) => {
    if (sock !== localSock) return;
    finalize();
    localSock = null;
    sock.destroy();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };

  const teardown = () => {
    finalize();
    localSock?.destroy();
    localSock = null;
  };

  // Register the request as in-flight so the dashboard shows it before the response completes.
  const startRequest = (firstChunk: Buffer) => {
    liveId = logStore.start(firstChunk, Date.now(), subdomain, config.localPort);
  };

  const openLocalSock = (firstChunk: Buffer) => {
    startRequest(firstChunk);

    const sock = net.createConnection({ host: config.localHost, port: config.localPort });
    localSock = sock;

    sock.on('data', responseChunk => {
      if (ws.readyState === WebSocket.OPEN) ws.send(responseChunk);
      if (liveId) logStore.appendResponse(liveId, responseChunk);
    });
    sock.on('end', () => teardownSock(sock));
    sock.on('close', () => teardownSock(sock));
    sock.on('error', () => teardownSock(sock));
    sock.write(forceConnectionClose(firstChunk));
  };

  ws.once('open', () => {
    ws.send(JSON.stringify({ event: 'registerProxy', data: { request_id: data.request_id, client_id: data.client_id } }));
  });

  ws.on('message', (raw, isBinary) => {
    if (!isBinary) return;
    const chunk = Buffer.isBuffer(raw) ? raw : Buffer.from(raw as ArrayBuffer);

    // Pipelined request on same proxy WS: finalize current entry, start fresh.
    if (localSock && isNewHttpRequest(chunk)) {
      finalize();
      startRequest(chunk);
      localSock.write(forceConnectionClose(chunk));
      return;
    }

    if (!localSock) {
      openLocalSock(chunk);
    } else {
      if (liveId) logStore.appendRequest(liveId, chunk);
      localSock.write(chunk);
    }
  });

  ws.on('close', () => teardown());
  ws.on('error', () => {
    teardown();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });
}
