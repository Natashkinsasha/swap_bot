import { ethers } from 'ethers';
import { SelectedPool } from '../types';
import { ROUTER_V3_ABI } from '../abi/routerV3';
import { log } from '../utils/logger';

export async function swapV3(
  wallet: ethers.Signer,
  pool: SelectedPool,
  amountIn: bigint,
  gasLimit: number,
  deadlineMinutes: number,
  isNative: boolean,
): Promise<string> {
  const walletAddress = await wallet.getAddress();
  const router = new ethers.Contract(pool.routerAddress, ROUTER_V3_ABI, wallet);
  const deadline = Math.floor(Date.now() / 1000) + deadlineMinutes * 60;
  const fee = pool.fee ?? 2500;

  const amountOutMin = 0n;

  log.info(`Sending V3 swap transaction (fee tier: ${fee})...`);

  const exactInputSingleParams = {
    tokenIn: pool.sellTokenAddress,
    tokenOut: pool.buyTokenAddress,
    fee,
    recipient: walletAddress,
    amountIn,
    amountOutMinimum: amountOutMin,
    sqrtPriceLimitX96: 0n,
  };

  const swapCalldata = router.interface.encodeFunctionData('exactInputSingle', [
    exactInputSingleParams,
  ]);

  const calldatas = [swapCalldata];
  if (isNative) {
    const refundCalldata = router.interface.encodeFunctionData('refundETH', []);
    calldatas.push(refundCalldata);
  }

  const tx = await router.multicall(
    deadline,
    calldatas,
    {
      ...(isNative ? { value: amountIn } : {}),
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
