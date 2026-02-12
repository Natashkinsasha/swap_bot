import { ethers } from 'ethers';
import { ERC20_ABI } from '../abi/erc20';
import { log } from './logger';

export async function ensureApproval(
  wallet: ethers.Signer,
  tokenAddress: string,
  spender: string,
  amount: bigint,
): Promise<void> {
  const walletAddress = await wallet.getAddress();
  const token = new ethers.Contract(tokenAddress, ERC20_ABI, wallet);

  const allowance: bigint = await token.allowance(walletAddress, spender);
  if (allowance >= amount) {
    log.info(`Allowance sufficient (${ethers.formatUnits(allowance, 18)})`);
    return;
  }

  log.info(`Approving ${spender} to spend token ${tokenAddress}...`);
  const tx = await token.approve(spender, ethers.MaxUint256);
  log.tx(tx.hash);
  await tx.wait();
  log.success('Approval confirmed');
}
