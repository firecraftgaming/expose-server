import { readFileSync } from 'fs';
import { homedir } from 'os';
import { join } from 'path';
import { noTry } from 'no-try';

export const PROTOCOL_VERSION = '1.0.0';
export const CONTROL_HEADERS = { 'X-Expose-Control': 'enabled' } as const;

export interface Config {
  server: string;
  port: number;
  authToken: string;
  tls: boolean;
  /** Public domain for tunnel URLs — defaults to server_host from authenticated payload */
  domain?: string;
  subdomain?: string;
  localHost: string;
  localPort: number;
  dashboardPort: number;
}

interface FileConfig {
  server?: string;
  port?: number;
  authToken?: string;
  tls?: boolean;
  domain?: string;
  subdomain?: string;
  dashboardPort?: number;
}

export function controlUrl(config: Config): string {
  const scheme = config.tls ? 'wss' : 'ws';
  const params = new URLSearchParams({ authToken: config.authToken, version: PROTOCOL_VERSION });
  return `${scheme}://${config.server}:${config.port}/expose/control?${params}`;
}

export function loadConfig(cliOverrides: Partial<Config> & { localHost: string; localPort: number }): Config {
  const configPath = join(homedir(), '.expose', 'config.json');
  const [, raw] = noTry(() => JSON.parse(readFileSync(configPath, 'utf8')) as FileConfig);
  const file = raw ?? {};

  const tls = cliOverrides.tls ?? file.tls ?? true;
  const port = cliOverrides.port ?? file.port ?? (tls ? 443 : 80);

  return {
    server: cliOverrides.server ?? file.server ?? 'localhost',
    port,
    authToken: cliOverrides.authToken ?? file.authToken ?? '',
    tls,
    domain: cliOverrides.domain ?? file.domain,
    subdomain: cliOverrides.subdomain ?? file.subdomain,
    localHost: cliOverrides.localHost,
    localPort: cliOverrides.localPort,
    dashboardPort: cliOverrides.dashboardPort ?? file.dashboardPort ?? 4040,
  };
}
