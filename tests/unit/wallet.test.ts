import { ethers } from 'ethers';
import { createWallet } from '../../src/utils/wallet';

const TEST_HEX_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';
const TEST_MNEMONIC = 'test test test test test test test test test test test junk';

describe('createWallet', () => {
  let provider: ethers.JsonRpcProvider;

  beforeEach(() => {
    provider = new ethers.JsonRpcProvider('https://bsc-dataseed1.binance.org');
  });

  it('should create a Wallet from hex private key', () => {
    const wallet = createWallet(TEST_HEX_KEY, provider);
    expect(wallet).toBeDefined();
    expect(wallet.address).toBeDefined();
    expect(ethers.isAddress(wallet.address)).toBe(true);
  });

  it('should create an HDNodeWallet from mnemonic', () => {
    const wallet = createWallet(TEST_MNEMONIC, provider);
    expect(wallet).toBeDefined();
    expect(wallet.address).toBeDefined();
    expect(ethers.isAddress(wallet.address)).toBe(true);
  });

  it('should trim whitespace from mnemonic', () => {
    const wallet1 = createWallet(TEST_MNEMONIC, provider);
    const wallet2 = createWallet(`  ${TEST_MNEMONIC}  `, provider);
    expect(wallet1.address).toBe(wallet2.address);
  });

  it('should produce different addresses for different keys', () => {
    const wallet1 = createWallet(TEST_HEX_KEY, provider);
    const wallet2 = createWallet(TEST_MNEMONIC, provider);
    expect(wallet1.address).not.toBe(wallet2.address);
  });

  it('should throw for invalid hex key', () => {
    expect(() => createWallet('invalid-key', provider)).toThrow();
  });

  it('should throw for invalid mnemonic', () => {
    expect(() => createWallet('invalid mnemonic phrase that is not valid at all ever', provider)).toThrow();
  });
});
