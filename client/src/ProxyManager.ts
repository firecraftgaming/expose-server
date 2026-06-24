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

  let reqChunks: Buffer[] = [];
  let resChunks: Buffer[] = [];
  let localSock: net.Socket | null = null;
  let startedAt = 0;
  let logged = false;

  const finalize = () => {
    if (logged || !startedAt) return;
    logged = true;
    logStore.add(Buffer.concat(reqChunks), Buffer.concat(resChunks), startedAt, subdomain, config.localPort);
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

  const openLocalSock = (firstChunk: Buffer) => {
    reqChunks = [firstChunk];
    resChunks = [];
    logged = false;
    startedAt = Date.now();

    const sock = net.createConnection({ host: config.localHost, port: config.localPort });
    localSock = sock;

    sock.on('data', responseChunk => {
      resChunks.push(responseChunk);
      if (ws.readyState === WebSocket.OPEN) ws.send(responseChunk);
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
      reqChunks = [chunk];
      resChunks = [];
      logged = false;
      startedAt = Date.now();
      localSock.write(forceConnectionClose(chunk));
      return;
    }

    if (!localSock) {
      openLocalSock(chunk);
    } else {
      reqChunks.push(chunk);
      localSock.write(chunk);
    }
  });

  ws.on('close', () => teardown());
  ws.on('error', () => {
    teardown();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  });
}
