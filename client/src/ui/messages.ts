import chalk from 'chalk';

export const err = (msg: string) => console.error(chalk.red(`  ✖ ${msg}`));
export const warn = (msg: string) => console.warn(chalk.yellow(`  ⚠ ${msg}`));
export const info = (msg: string) => console.log(chalk.cyan(`  ℹ ${msg}`));

export function retryMessage(attempt: number, max: number, delayMs: number): string {
  return chalk.yellow(`Connection lost — retry ${attempt}/${max} in ${delayMs / 1000}s…`);
}
