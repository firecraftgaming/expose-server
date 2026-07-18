import http from 'http';
import { err } from './ui/messages.js';

export function startCatchAllServer(): Promise<{ host: string; port: number }> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });

    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      server.on('error', e => err(`Catch-all server error: ${(e as Error).message}`));

      const addr = server.address();
      if (!addr || typeof addr === 'string') {
        reject(new Error('Failed to start catch-all server'));
        return;
      }
      resolve({ host: '127.0.0.1', port: addr.port });
    });
  });
}
