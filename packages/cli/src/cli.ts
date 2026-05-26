#!/usr/bin/env node
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { EthoraFaucet, CooldownError, RateLimitError } from '@ethora/faucet-sdk';

const program = new Command();

program
  .name('ethora-faucet')
  .description('CLI for the Ethora BNB Testnet Faucet')
  .version('1.2.0');

// ── claim ──────────────────────────────────────────────────────────────────

program
  .command('claim')
  .description('Request testnet tokens for a wallet')
  .requiredOption('-a, --address <address>', 'Wallet address (0x...)')
  .requiredOption('-t, --tokens <tokens>', 'Comma-separated token symbols (e.g. USDT,USDC,WBNB)')
  .option('-k, --api-key <key>', 'Ethora API key', process.env.ETHORA_API_KEY)
  .option('--sandbox', 'Use sandbox environment', false)
  .option('--json', 'Output raw JSON', false)
  .action(async (opts) => {
    const tokens = opts.tokens.split(',').map((t: string) => t.trim().toUpperCase());
    const faucet = new EthoraFaucet({ apiKey: opts.apiKey, sandbox: opts.sandbox });

    if (!opts.json) {
      console.log(chalk.bold('\n⬡ Ethora BNB Faucet\n'));
      console.log(`  Address : ${chalk.cyan(opts.address)}`);
      console.log(`  Tokens  : ${chalk.yellow(tokens.join(', '))}`);
      console.log(`  Network : ${opts.sandbox ? chalk.magenta('Sandbox') : chalk.green('BSC Testnet')}\n`);
    }

    const spinner = ora('Submitting claim...').start();
    try {
      // CLI claim requires no captcha (API key flow)
      const result = await faucet.request({
        walletAddress: opts.address,
        tokens,
        captchaToken: '__CLI__',
      });

      spinner.succeed(chalk.green('Tokens claimed successfully!'));

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log(`\n  Tx Hash : ${chalk.cyan(result.txHash)}`);
      console.log(`  Explorer: ${chalk.underline(result.explorerUrl)}`);
      console.log(`\n  Claimed:`);
      for (const t of result.tokens) {
        console.log(`    ${chalk.yellow(t.symbol.padEnd(6))}  ${chalk.white(t.amount)}`);
      }
      const expires = new Date(result.cooldownExpiresAt).toLocaleString();
      console.log(`\n  Next claim available at: ${chalk.gray(expires)}\n`);
    } catch (err) {
      spinner.fail(chalk.red('Claim failed'));
      if (err instanceof CooldownError) {
        console.error(chalk.yellow(`  Cooldown active. Try again after ${err.expiresAt ?? 'unknown'}`));
      } else if (err instanceof RateLimitError) {
        console.error(chalk.yellow(`  Rate limited. Retry in ${err.retryAfter ?? 60}s`));
      } else {
        console.error(chalk.red(`  ${(err as Error).message}`));
      }
      process.exit(1);
    }
  });

// ── status ─────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check cooldown status for a wallet')
  .requiredOption('-a, --address <address>', 'Wallet address')
  .option('-k, --api-key <key>', 'API key', process.env.ETHORA_API_KEY)
  .option('--json', 'Output raw JSON', false)
  .action(async (opts) => {
    const faucet = new EthoraFaucet({ apiKey: opts.apiKey });
    const status = await faucet.cooldownStatus(opts.address);
    if (opts.json) { console.log(JSON.stringify(status, null, 2)); return; }

    if (!status.onCooldown) {
      console.log(chalk.green(`\n  ✓ ${opts.address} is ready to claim\n`));
    } else {
      const h = Math.floor(status.remainingSeconds / 3600);
      const m = Math.floor((status.remainingSeconds % 3600) / 60);
      console.log(chalk.yellow(`\n  ⏱  Cooldown active — ${h}h ${m}m remaining`));
      console.log(`  Expires: ${new Date(status.expiresAt!).toLocaleString()}\n`);
    }
  });

// ── tokens ─────────────────────────────────────────────────────────────────

program
  .command('tokens')
  .description('List all supported tokens')
  .option('-k, --api-key <key>', 'API key', process.env.ETHORA_API_KEY)
  .option('--json', 'Output raw JSON', false)
  .action(async (opts) => {
    const faucet = new EthoraFaucet({ apiKey: opts.apiKey });
    const tokens = await faucet.tokens();
    if (opts.json) { console.log(JSON.stringify(tokens, null, 2)); return; }

    console.log(chalk.bold('\n  Token    Drip Amount      Contract\n'));
    for (const t of tokens) {
      console.log(
        `  ${chalk.yellow(t.symbol.padEnd(8))} ${t.dripAmountFormatted.padEnd(16)} ${chalk.gray(t.contractAddress)}`
      );
    }
    console.log();
  });

program.parse();
