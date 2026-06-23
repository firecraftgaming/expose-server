import net from 'net';
import { WebSocket } from 'ws';
import { logStore } from './LogStore.js';
import { type Config, controlUrl, CONTROL_HEADERS } from './config.js';

interface ProxyRequest {
  request_id: string;
  client_id: string;
}

export function handleCreateProxy(data: ProxyRequest, config: Config): void {
  const ws = new WebSocket(controlUrl(config), { headers: CONTROL_HEADERS });

  const reqChunks: Buffer[] = [];
  const resChunks: Buffer[] = [];
  let localSock: net.Socket | null = null;
  let startedAt = 0;
  let logged = false;

  const finalize = () => {
    if (logged || !startedAt) return;
    logged = true;
    logStore.add(Buffer.concat(reqChunks), Buffer.concat(resChunks), startedAt);
  };

  const teardown = () => {
    finalize();
    localSock?.destroy();
    if (ws.readyState === WebSocket.OPEN) ws.close();
  };

  ws.once('open', () => {
    ws.send(JSON.stringify({ event: 'registerProxy', data: { request_id: data.request_id, client_id: data.client_id } }));
  });

  ws.on('message', (raw, isBinary) => {
    if (!isBinary) return;
    const chunk = raw instanceof Buffer ? raw : Buffer.from(raw as ArrayBuffer);

    if (!localSock) {
      startedAt = Date.now();
      reqChunks.push(chunk);

      localSock = net.createConnection({ host: config.localHost, port: config.localPort });

      localSock.on('data', responseChunk => {
        resChunks.push(responseChunk);
        if (ws.readyState === WebSocket.OPEN) ws.send(responseChunk);
      });

      localSock.on('end', () => teardown());
      localSock.on('close', () => teardown());
      localSock.on('error', () => teardown());
      localSock.write(chunk);
    } else {
      reqChunks.push(chunk);
      localSock.write(chunk);
    }
  });

  ws.on('close', () => teardown());
  ws.on('error', () => teardown());
}
