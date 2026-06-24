import { WebSocket } from 'ws';
import ora from 'ora';
import { noTry } from 'no-try';
import { type Config, controlUrl, CONTROL_HEADERS } from './config.js';
import { handleCreateProxy } from './ProxyManager.js';
import { printBanner } from './ui/banner.js';
import { err, retryMessage } from './ui/messages.js';
import { startDashboard } from './dashboard/server.js';

type ControlEvent = { event: string; data: Record<string, unknown> };

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

function send(ws: WebSocket, event: string, data: Record<string, unknown>): void {
  ws.send(JSON.stringify({ event, data }));
}

export function connect(config: Config): void {
  let attempt = 0;
  let noReconnect = false;
  let bannered = false;
  let activeSub = '';
  const spinner = ora(`Connecting to ${config.server}…`).start();

  function tryConnect() {
    const ws = new WebSocket(controlUrl(config), { headers: CONTROL_HEADERS });

    ws.on('open', () => {
      attempt = 0;
      send(ws, 'authenticate', {
        type: 'http',
        host: `${config.localHost}:${config.localPort}`,
        ...(config.subdomain ? { subdomain: config.subdomain } : {}),
        server_host: config.domain ?? config.server,
      });
    });

    ws.on('message', raw => {
      const [, msg] = noTry(() => JSON.parse(raw.toString()) as ControlEvent);
      if (!msg) return;

      const { event, data } = msg;

      if (event === 'authenticated') {
        spinner.stop();
        const subdomain = data.subdomain as string;
        const serverHost = data.server_host as string;
        const clientId = data.client_id as string;
        activeSub = subdomain;
        const motd = data.message as string | undefined;
        const scheme = config.tls ? 'https' : 'http';
        const publicDomain = config.domain ?? serverHost;
        const portSuffix = (config.tls && config.port === 443) || (!config.tls && config.port === 80) ? '' : `:${config.port}`;
        const publicUrl = `${scheme}://${subdomain}.${publicDomain}${portSuffix}`;

        startDashboard(config.dashboardPort, {
          localHost: config.localHost,
          localPort: config.localPort,
          subdomain,
          serverHost,
          publicUrl,
          clientId,
        }).then(dashPort => {
          if (bannered) return;
          bannered = true;
          printBanner({
            localHost: config.localHost,
            localPort: config.localPort,
            publicUrl,
            dashboardUrl: `http://127.0.0.1:${dashPort}`,
            motd,
          });
        }).catch(e => err(`Failed to start dashboard: ${(e as Error).message}`));

      } else if (event === 'authenticationFailed') {
        spinner.stop();
        noReconnect = true;
        err(data.message as string ?? 'Authentication failed.');
        ws.close();
        process.exit(1);

      } else if (event === 'subdomainTaken') {
        spinner.stop();
        noReconnect = true;
        err(data.message as string ?? 'Subdomain already taken.');
        ws.close();
        process.exit(1);

      } else if (event === 'createProxy') {
        handleCreateProxy(data as { request_id: string; client_id: string }, config, activeSub);

      } else if (event === 'closeWithoutReconnect') {
        noReconnect = true;
        err(data.message as string ?? 'Server closed connection.');
        ws.close();
        process.exit(0);

      } else if (event === 'setMaximumConnectionLength') {
        // informational — ignore
      }
    });

    ws.on('close', (code, reason) => {
      if (noReconnect) return;
      const detail = reason?.length ? ` (${reason.toString()})` : '';
      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] ?? 4000;
        spinner.stop();
        err(`Connection closed: code ${code}${detail}`);
        spinner.text = retryMessage(attempt + 1, MAX_RETRIES, delay);
        spinner.start();
        setTimeout(() => { attempt++; tryConnect(); }, delay);
      } else {
        spinner.stop();
        err(`Connection closed: code ${code}${detail}`);
        err(`Failed to connect after ${MAX_RETRIES} retries. Giving up.`);
        process.exit(1);
      }
    });

    ws.on('error', wsErr => {
      // 'close' fires right after and drives the retry/spinner — just report here.
      spinner.stop();
      err(`WebSocket error: ${(wsErr as Error).message}`);
    });
  }

  tryConnect();
}
