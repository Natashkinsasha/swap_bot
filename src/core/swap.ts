import { ethers } from 'ethers';
import { SelectedPool, SwapOptions } from '../types';
import { log } from '../utils/logger';
import { createWallet } from '../utils/wallet';
import { swapV2 } from './swap-v2';
import { swapV3 } from './swap-v3';

export async function executeSwap(pool: SelectedPool, opts: SwapOptions): Promise<string> {
  const { amountBnb, slippagePercent, rpcUrl, privateKey, gasLimit, deadlineMinutes } = opts;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = createWallet(privateKey, provider);
  const amountIn = ethers.parseEther(amountBnb);

  log.info(`Wallet: ${wallet.address}`);
  log.info(`Swapping ${amountBnb} BNB → ${pool.pair.baseToken.symbol} (${pool.version.toUpperCase()})`);

  const balance = await provider.getBalance(wallet.address);
  if (balance < amountIn) {
    throw new Error(
      `Insufficient BNB balance. Have: ${ethers.formatEther(balance)}, need: ${amountBnb}`,
    );
  }

  switch (pool.version) {
    case 'v2':
      return swapV2(wallet, pool, amountIn, slippagePercent, gasLimit, deadlineMinutes);
    case 'v3':
    case 'v4':
      return swapV3(wallet, pool, amountIn, gasLimit, deadlineMinutes);
    default:
      throw new Error(`Unsupported pool version: ${pool.version}`);
  }
}
