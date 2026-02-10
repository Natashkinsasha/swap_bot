import { ethers } from 'ethers';

export function createWallet(
  privateKey: string,
  provider: ethers.JsonRpcProvider,
): ethers.Wallet | ethers.HDNodeWallet {
  const isMnemonic = privateKey.trim().includes(' ');
  return isMnemonic
    ? ethers.Wallet.fromPhrase(privateKey.trim(), provider)
    : new ethers.Wallet(privateKey, provider);
}
