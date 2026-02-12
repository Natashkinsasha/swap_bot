import { ethers } from 'ethers';
import { SelectedPool, SwapOptions } from '../types';
import { ERC20_ABI } from '../abi/erc20';
import { log } from '../utils/logger';
import { createWallet } from '../utils/wallet';
import { ensureApproval } from '../utils/approve';
import { swapV2 } from './swap-v2';
import { swapV3 } from './swap-v3';



export async function executeSwap(pool: SelectedPool, opts: SwapOptions): Promise<string> {
  const { sellTokenAddress, amountIn: amountRaw, slippagePercent, rpcUrl, privateKey, gasLimit, deadlineMinutes } = opts;

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const wallet = createWallet(privateKey, provider);
  const isNative = !sellTokenAddress;
  let amountIn: bigint;

  log.info(`Wallet: ${wallet.address}`);

  if (isNative) {
    amountIn = ethers.parseEther(amountRaw);
    const balance = await provider.getBalance(wallet.address);
    log.info(`BNB balance: ${ethers.formatEther(balance)}`);
    if (balance < amountIn) {
      throw new Error(
        `Insufficient BNB balance. Have: ${ethers.formatEther(balance)}, need: ${amountRaw}`,
      );
    }
  } else {
    const token = new ethers.Contract(sellTokenAddress, ERC20_ABI, provider);
    const decimals: number = await token.decimals();
    amountIn = ethers.parseUnits(amountRaw, decimals);
    const balance: bigint = await token.balanceOf(wallet.address);
    log.info(`Token balance: ${ethers.formatUnits(balance, decimals)}`);
    if (balance < amountIn) {
      throw new Error(
        `Insufficient token balance. Have: ${ethers.formatUnits(balance, decimals)}, need: ${amountRaw}`,
      );
    }
    await ensureApproval(wallet, sellTokenAddress, pool.routerAddress, amountIn);
  }

  log.info(`Swapping ${amountRaw} ${isNative ? 'BNB' : sellTokenAddress} → ${pool.pair.baseToken.symbol} (${pool.version.toUpperCase()})`);

  switch (pool.version) {
    case 'v2':
      return swapV2(wallet, pool, amountIn, slippagePercent, gasLimit, deadlineMinutes, isNative);
    case 'v3':
    case 'v4':
      return swapV3(wallet, pool, amountIn, gasLimit, deadlineMinutes, isNative);
    default:
      throw new Error(`Unsupported pool version: ${pool.version}`);
  }
}
