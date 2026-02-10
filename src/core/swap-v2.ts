import { ethers } from 'ethers';
import { SelectedPool } from '../types';
import { WBNB } from '../config/constants';
import { ROUTER_V2_ABI } from '../abi/routerV2';
import { log } from '../utils/logger';

export async function swapV2(
  wallet: ethers.Signer,
  pool: SelectedPool,
  amountIn: bigint,
  slippage: number,
  gasLimit: number,
  deadlineMinutes: number,
): Promise<string> {
  const walletAddress = await wallet.getAddress();
  const router = new ethers.Contract(pool.routerAddress, ROUTER_V2_ABI, wallet);
  const path = [WBNB, pool.tokenOut];
  const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;

  let amountOutMin = 0n;
  try {
    const amounts: bigint[] = await router.getAmountsOut(amountIn, path);
    const expectedOut = amounts[amounts.length - 1];
    amountOutMin = expectedOut * BigInt(100 - slippage) / 100n;
    log.info(
      `Expected output: ${ethers.formatUnits(expectedOut, 18)} — min after slippage (${slippage}%): ${ethers.formatUnits(amountOutMin, 18)}`,
    );
  } catch {
    log.warn('getAmountsOut failed — using amountOutMin = 0 (fee-on-transfer token?)');
  }

  log.info('Sending V2 swap transaction...');

  const tx = await router.swapExactETHForTokensSupportingFeeOnTransferTokens(
    amountOutMin,
    path,
    walletAddress,
    deadline,
    {
      value: amountIn,
      gasLimit,
    },
  );

  log.tx(tx.hash);
  log.info('Waiting for confirmation...');

  const receipt = await tx.wait();
  if (receipt && receipt.status === 1) {
    log.success('Swap confirmed!');
  } else {
    log.error('Transaction reverted');
  }

  return tx.hash;
}
