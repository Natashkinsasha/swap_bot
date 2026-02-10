import { Command } from 'commander';
import { ethers } from 'ethers';
import { findBestPool } from './core/dexscreener';
import { executeSwap } from './core/swap';
import { config } from './config';
import { log } from './utils/logger';

const program = new Command();

program
  .name('swap-bot')
  .description('BSC swap bot — buy tokens via PancakeSwap V2/V3/V4')
  .version('1.0.0')
  .requiredOption('-t, --token <address>', 'Token contract address to buy')
  .requiredOption('-a, --amount <bnb>', 'Amount of BNB to spend')
  .option('-s, --slippage <percent>', 'Slippage tolerance (%)', String(config.slippagePercent))
  .action(async (opts) => {
    const tokenAddress: string = opts.token;
    const amountBnb: string = opts.amount;
    const slippage: number = Number(opts.slippage);

    if (!ethers.isAddress(tokenAddress)) {
      log.error(`Invalid token address: ${tokenAddress}`);
      process.exit(1);
    }

    if (!config.privateKey) {
      log.error('PRIVATE_KEY is not set. Copy .env.example → .env and fill in your key.');
      process.exit(1);
    }

    log.info(`Token address: ${tokenAddress}`);
    log.info(`Amount: ${amountBnb} BNB | Slippage: ${slippage}%`);
    log.info(`RPC: ${config.rpcUrl}`);
    console.log('---');

    try {
      const pool = await findBestPool(tokenAddress);

      console.log('---');
      log.info(`Pool address: ${pool.pair.pairAddress}`);
      log.info(`Router: ${pool.routerAddress} (${pool.version.toUpperCase()})`);
      log.info(`Token out: ${pool.tokenOut}`);
      console.log('---');

      const txHash = await executeSwap(pool, {
        amountBnb,
        slippagePercent: slippage,
        rpcUrl: config.rpcUrl,
        privateKey: config.privateKey,
        gasLimit: config.gasLimit,
        deadlineMinutes: config.deadlineMinutes,
      });
      console.log('---');
      log.success(`Done! TX hash: ${txHash}`);
    } catch (err: any) {
      log.error(err.message || err);
      process.exit(1);
    }
  });

program.parse();
