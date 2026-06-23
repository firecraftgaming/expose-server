#!/usr/bin/env node
import { Command } from 'commander';
import { loadConfig } from './config.js';
import { connect } from './ControlConnection.js';
import { err } from './ui/messages.js';

function parseHost(host: string): { localHost: string; localPort: number } | null {
  let localHost = 'localhost';
  let localPort: number;

  if (host.includes(':')) {
    const [h, p] = host.split(':');
    localHost = h ?? 'localhost';
    localPort = parseInt(p ?? '80', 10);
  } else {
    localPort = parseInt(host, 10);
  }

  if (isNaN(localPort) || localPort < 1 || localPort > 65535) return null;
  return { localHost, localPort };
}

function parsePort(v: string, flag: string): number {
  const n = parseInt(v, 10);
  if (isNaN(n) || n < 1 || n > 65535) {
    console.error(`  ✖ Invalid value for ${flag}: "${v}" is not a valid port.`);
    process.exit(1);
  }
  return n;
}

function shareOptions(cmd: Command) {
  return cmd
    .option('-s, --server <server>', 'Expose server hostname')
    .option('-p, --port <port>', 'Expose server port', (v: string) => parsePort(v, '--port'))
    .option('--no-tls', 'Use ws:// instead of wss://')
    .option('--auth-token <token>', 'Auth token for the server')
    .option('--subdomain <subdomain>', 'Requested subdomain')
    .option('--dashboard-port <port>', 'Local dashboard port (default 4040)', (v: string) => parsePort(v, '--dashboard-port'));
}

function runShare(host: string, opts: Record<string, unknown>) {
  const parsed = parseHost(host);
  if (!parsed) {
    err(`Invalid host/port: "${host}". Use "localhost:3000" or just "3000".`);
    process.exit(1);
  }

  const config = loadConfig({
    ...parsed,
    server: opts.server as string | undefined,
    port: opts.port as number | undefined,
    // commander has no positive --tls flag, so only treat an explicit --no-tls
    // as an override; otherwise fall through to the config file / default.
    tls: opts.tls === false ? false : undefined,
    authToken: opts.authToken as string | undefined,
    subdomain: opts.subdomain as string | undefined,
    dashboardPort: opts.dashboardPort as number | undefined,
  });

  connect(config);
}

const program = new Command();

program
  .name('expose')
  .description('Share a local server over the internet via the Expose tunneling server')
  .version('0.1.0');

// expose 3000  /  expose localhost:3000
shareOptions(program.argument('[host]', 'Port or host:port to share'))
  .action((host: string | undefined, opts) => {
    if (!host) { program.help(); return; }
    runShare(host, opts as Record<string, unknown>);
  });

// expose share 3000  /  expose share localhost:3000
shareOptions(
  program.command('share <host>').description('Share a local server (alias: expose <host>)')
).action((host: string, opts) => runShare(host, opts as Record<string, unknown>));

program.parse();
