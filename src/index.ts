#!/usr/bin/env node
import { Command } from 'commander';
import dotenv from 'dotenv';
import { slowCommand } from './commands/slow';
import { timedCommand } from './commands/timed';
import { burstCommand } from './commands/burst';
const version = '0.1.0';
import chalk from 'chalk';

dotenv.config();

const program = new Command();

program
  .name('txstress')
  .description('A CLI tool for stress testing blockchain nodes')
  .version(version);

program
  .command('slow')
  .description('Send transactions in slow mode (one at a time, waiting for confirmation)')
  .requiredOption('-n, --node <url>', 'Blockchain node URL')
  .requiredOption('-k, --keys <path>', 'Path to file containing private keys, one per line')
  .option('-c, --count <number>', 'Number of transactions to send', '10')
  .option('-t, --to <address>', 'Recipient address', '0x0000000000000000000000000000000000000000')
  .option('-v, --value <amount>', 'Amount of native token to send per transaction', '0.001')
  .action(slowCommand);

program
  .command('timed')
  .description('Send transactions timed with mining (after each block)')
  .requiredOption('-n, --node <url>', 'Blockchain node URL')
  .requiredOption('-k, --keys <path>', 'Path to file containing private keys, one per line')
  .option('-c, --count <number>', 'Number of transactions to send', '10')
  .option('-t, --to <address>', 'Recipient address', '0x0000000000000000000000000000000000000000')
  .option('-v, --value <amount>', 'Amount of native token to send per transaction', '0.001')
  .action(timedCommand);

program
  .command('burst')
  .description('Send transactions in burst mode (many transactions in a short period)')
  .requiredOption('-n, --node <url>', 'Blockchain node URL')
  .requiredOption('-k, --keys <path>', 'Path to file containing private keys, one per line')
  .option('-c, --count <number>', 'Number of transactions to send', '10')
  .option('-t, --to <address>', 'Recipient address', '0x0000000000000000000000000000000000000000')
  .option('-v, --value <amount>', 'Amount of native token to send per transaction', '0.001')
  .option('-d, --delay <ms>', 'Delay between batches in ms', '0')
  .option('-b, --batch-size <number>', 'Number of transactions in each batch', '5')
  .action(burstCommand);

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  console.log(chalk.cyan('\n🔥 Welcome to txstress - Blockchain Node Stress Testing Tool 🔥\n'));
  program.outputHelp();
}
