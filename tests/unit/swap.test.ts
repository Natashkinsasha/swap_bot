import { ethers } from 'ethers';
import { executeSwap } from '../../src/core/swap';
import { SelectedPool, SwapOptions } from '../../src/types';
import { WBNB } from '../../src/config/constants';

jest.mock('../../src/utils/logger', () => ({
  log: {
    info: jest.fn(),
    success: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    tx: jest.fn(),
  },
}));

jest.mock('../../src/core/swap-v2', () => ({
  swapV2: jest.fn().mockResolvedValue('0xV2_TX_HASH'),
}));

jest.mock('../../src/core/swap-v3', () => ({
  swapV3: jest.fn().mockResolvedValue('0xV3_TX_HASH'),
}));

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      JsonRpcProvider: jest.fn().mockImplementation(() => ({
        getBalance: jest.fn().mockResolvedValue(BigInt('1000000000000000000')),
      })),
    },
  };
});

jest.mock('../../src/utils/wallet', () => ({
  createWallet: jest.fn().mockReturnValue({
    address: '0x1234567890abcdef1234567890abcdef12345678',
    getAddress: jest.fn().mockResolvedValue('0x1234567890abcdef1234567890abcdef12345678'),
  }),
}));

const TEST_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

function makePool(version: 'v2' | 'v3' | 'v4'): SelectedPool {
  return {
    pair: {
      chainId: 'bsc',
      dexId: `pancakeswap_${version}`,
      url: '',
      pairAddress: '0xpair',
      baseToken: { address: '0xCAKE', name: 'CAKE', symbol: 'CAKE' },
      quoteToken: { address: WBNB, name: 'WBNB', symbol: 'WBNB' },
      priceNative: '0.01',
      priceUsd: '3.5',
      liquidity: { usd: 1000000, base: 100000, quote: 500 },
      fdv: 5000000,
      volume: { h24: 200000 },
    },
    routerAddress: '0xrouter',
    version,
    sellTokenAddress: WBNB,
    buyTokenAddress: '0xCAKE',
    fee: version === 'v3' || version === 'v4' ? 2500 : undefined,
  };
}

function makeOpts(overrides: Partial<SwapOptions> = {}): SwapOptions {
  return {
    sellTokenAddress: undefined,
    amountIn: '0.001',
    slippagePercent: 12,
    rpcUrl: 'https://bsc-dataseed1.binance.org',
    privateKey: TEST_KEY,
    gasLimit: 300000,
    deadlineMinutes: 20,
    ...overrides,
  };
}

describe('executeSwap', () => {
  afterEach(() => jest.clearAllMocks());

  it('should call swapV2 for V2 pool', async () => {
    const { swapV2 } = require('../../src/core/swap-v2');
    const hash = await executeSwap(makePool('v2'), makeOpts());
    expect(hash).toBe('0xV2_TX_HASH');
    expect(swapV2).toHaveBeenCalledTimes(1);
  });

  it('should call swapV3 for V3 pool', async () => {
    const { swapV3 } = require('../../src/core/swap-v3');
    const hash = await executeSwap(makePool('v3'), makeOpts());
    expect(hash).toBe('0xV3_TX_HASH');
    expect(swapV3).toHaveBeenCalledTimes(1);
  });

  it('should call swapV3 for V4 pool', async () => {
    const { swapV3 } = require('../../src/core/swap-v3');
    const hash = await executeSwap(makePool('v4'), makeOpts());
    expect(hash).toBe('0xV3_TX_HASH');
    expect(swapV3).toHaveBeenCalledTimes(1);
  });

  it('should throw for unsupported version', async () => {
    const pool = makePool('v2');
    (pool as any).version = 'v1';
    await expect(executeSwap(pool, makeOpts())).rejects.toThrow('Unsupported pool version');
  });
});
