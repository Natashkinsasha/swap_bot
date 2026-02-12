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
  .requiredOption('-b, --buy <address>', 'Token address to buy')
  .requiredOption('-a, --amount <value>', 'Amount to spend')
  .option('-s, --sell <address>', 'ERC-20 token to sell with (default: native BNB)')
  .option('-l, --slippage <percent>', 'Slippage tolerance (%)', String(config.slippagePercent))
  .action(async (opts) => {
    const buyTokenAddress: string = opts.buy;
    const sellTokenAddress: string = opts.sell;
    const amountIn: string = opts.amount;
    const slippage: number = Number(opts.slippage);

    if (sellTokenAddress && !ethers.isAddress(sellTokenAddress)) {
      log.error(`Invalid --sell address: ${sellTokenAddress}`);
      process.exit(1);
    }

    if (!ethers.isAddress(buyTokenAddress)) {
      log.error(`Invalid token address: ${buyTokenAddress}`);
      process.exit(1);
    }
    if (!config.privateKey) {
      log.error('PRIVATE_KEY is not set. Copy .env.example → .env and fill in your key.');
      process.exit(1);
    }

    log.info(`Buy token: ${buyTokenAddress}`);
    log.info(`Sell token: ${sellTokenAddress ?? 'BNB (native)'}`);
    log.info(`Amount: ${amountIn} ${!sellTokenAddress ? 'BNB' : sellTokenAddress} | Slippage: ${slippage}%`);
    log.info(`RPC: ${config.rpcUrl}`);
    console.log('---');

    try {
      const pool = await findBestPool(buyTokenAddress, sellTokenAddress);

      console.log('---');
      log.info(`Pool address: ${pool.pair.pairAddress}`);
      log.info(`Router: ${pool.routerAddress} (${pool.version.toUpperCase()})`);
      log.info(`Sell token: ${pool.sellTokenAddress}`);
      log.info(`Buy token: ${pool.buyTokenAddress}`);
      console.log('---');

      const txHash = await executeSwap(pool, {
        sellTokenAddress,
        amountIn,
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
