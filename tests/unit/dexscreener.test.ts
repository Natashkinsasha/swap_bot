import axios from 'axios';
import { findBestPool } from '../../src/core/dexscreener';
import { DexscreenerPair } from '../../src/types';
import { WBNB } from '../../src/config/constants';

jest.mock('axios');
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

const mockedAxios = axios as jest.Mocked<typeof axios>;

function makePair(overrides: Partial<DexscreenerPair> = {}): DexscreenerPair {
  return {
    chainId: 'bsc',
    dexId: 'pancakeswap_v2',
    url: 'https://dexscreener.com/bsc/0xpair',
    pairAddress: '0x1234567890abcdef1234567890abcdef12345678',
    baseToken: {
      address: '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82',
      name: 'PancakeSwap Token',
      symbol: 'CAKE',
    },
    quoteToken: {
      address: WBNB,
      name: 'Wrapped BNB',
      symbol: 'WBNB',
    },
    priceNative: '0.01',
    priceUsd: '3.5',
    liquidity: { usd: 1000000, base: 100000, quote: 500 },
    fdv: 5000000,
    volume: { h24: 200000 },
    labels: ['v2'],
    ...overrides,
  };
}

describe('findBestPool', () => {
  afterEach(() => jest.clearAllMocks());

  it('should throw if no pairs returned', async () => {
    mockedAxios.get.mockResolvedValue({ data: { pairs: null } });
    await expect(findBestPool('0xtoken')).rejects.toThrow('No pools found on Dexscreener');
  });

  it('should throw if no BSC pairs', async () => {
    mockedAxios.get.mockResolvedValue({
      data: { pairs: [makePair({ chainId: 'ethereum' })] },
    });
    await expect(findBestPool('0xtoken')).rejects.toThrow('No BSC pools found');
  });

  it('should select pool with highest liquidity', async () => {
    const lowLiq = makePair({
      pairAddress: '0xlow',
      liquidity: { usd: 100, base: 10, quote: 1 },
    });
    const highLiq = makePair({
      pairAddress: '0xhigh',
      liquidity: { usd: 5000000, base: 500000, quote: 2500 },
    });

    mockedAxios.get.mockResolvedValue({
      data: { pairs: [lowLiq, highLiq] },
    });

    const result = await findBestPool('0xtoken');
    expect(result.pair.pairAddress).toBe('0xhigh');
  });

  it('should detect V3 pool version from dexId', async () => {
    const v3Pair = makePair({ dexId: 'pancakeswap_v3', labels: ['v3'] });
    mockedAxios.get.mockResolvedValue({ data: { pairs: [v3Pair] } });

    const result = await findBestPool('0xtoken');
    expect(result.version).toBe('v3');
    expect(result.fee).toBe(2500);
  });

  it('should detect V4 pool version from labels', async () => {
    const v4Pair = makePair({ dexId: 'pancakeswap', labels: ['v4'] });
    mockedAxios.get.mockResolvedValue({ data: { pairs: [v4Pair] } });

    const result = await findBestPool('0xtoken');
    expect(result.version).toBe('v4');
    expect(result.fee).toBe(2500);
  });

  it('should default to V2 when version is unclear', async () => {
    const unknownPair = makePair({ dexId: 'pancakeswap', labels: [] });
    mockedAxios.get.mockResolvedValue({ data: { pairs: [unknownPair] } });

    const result = await findBestPool('0xtoken');
    expect(result.version).toBe('v2');
    expect(result.fee).toBeUndefined();
  });

  it('should set tokenOut to baseToken when quoteToken is WBNB', async () => {
    const pair = makePair({
      baseToken: { address: '0xCAKE', name: 'CAKE', symbol: 'CAKE' },
      quoteToken: { address: WBNB, name: 'WBNB', symbol: 'WBNB' },
    });
    mockedAxios.get.mockResolvedValue({ data: { pairs: [pair] } });

    const result = await findBestPool('0xtoken');
    expect(result.tokenOut).toBe('0xCAKE');
    expect(result.tokenIn).toBe(WBNB);
  });

  it('should set tokenOut to quoteToken when baseToken is WBNB', async () => {
    const pair = makePair({
      baseToken: { address: WBNB, name: 'WBNB', symbol: 'WBNB' },
      quoteToken: { address: '0xUSDT', name: 'USDT', symbol: 'USDT' },
    });
    mockedAxios.get.mockResolvedValue({ data: { pairs: [pair] } });

    const result = await findBestPool('0xtoken');
    expect(result.tokenOut).toBe('0xUSDT');
  });
});
