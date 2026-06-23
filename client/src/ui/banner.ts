import boxen from 'boxen';
import chalk from 'chalk';
import Table from 'cli-table3';
import qrcode from 'qrcode-terminal';

export interface BannerInfo {
  localHost: string;
  localPort: number;
  publicUrl: string;
  dashboardUrl: string;
  motd?: string;
}

export function printBanner(info: BannerInfo): void {
  const table = new Table({ style: { head: [], border: [] }, chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' } });

  table.push(
    [chalk.dim('Shared host'), chalk.white(`${info.localHost}:${info.localPort}`)],
    [chalk.dim('Public URL'), chalk.green.bold(info.publicUrl)],
    [chalk.dim('Dashboard'), chalk.cyan(info.dashboardUrl)],
  );

  const box = boxen(table.toString(), {
    title: chalk.bold.magenta('expose'),
    titleAlignment: 'left',
    padding: { top: 0, bottom: 0, left: 1, right: 1 },
    borderStyle: 'round',
    borderColor: 'magenta',
  });

  console.log('\n' + box);

  if (info.motd) {
    console.log(chalk.dim(`\n  ${info.motd}`));
  }

  console.log(chalk.dim('\n  Scan to open on your device:'));
  qrcode.generate(info.publicUrl, { small: true });
}
