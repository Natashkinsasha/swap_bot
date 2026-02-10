import { swapV3 } from '../../src/core/swap-v3';
import { SelectedPool } from '../../src/types';
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

const mockWait = jest.fn().mockResolvedValue({ status: 1 });
const mockMulticall = jest.fn().mockResolvedValue({ hash: '0xV3HASH', wait: mockWait });

const mockEncodeFunctionData = jest.fn().mockReturnValue('0xencoded');

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: jest.fn().mockImplementation(() => ({
        multicall: mockMulticall,
        interface: {
          encodeFunctionData: mockEncodeFunctionData,
        },
      })),
    },
  };
});

function makePool(): SelectedPool {
  return {
    pair: {
      chainId: 'bsc',
      dexId: 'pancakeswap_v3',
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
    routerAddress: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
    version: 'v3',
    tokenIn: WBNB,
    tokenOut: '0xCAKE',
    fee: 2500,
  };
}

const mockWallet = {
  getAddress: jest.fn().mockResolvedValue('0xWALLET'),
};

describe('swapV3', () => {
  afterEach(() => jest.clearAllMocks());

  it('should execute swap via multicall and return tx hash', async () => {
    const hash = await swapV3(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      300000,
      20,
    );
    expect(hash).toBe('0xV3HASH');
    expect(mockMulticall).toHaveBeenCalledTimes(1);
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('should encode exactInputSingle and refundETH calldata', async () => {
    await swapV3(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      300000,
      20,
    );
    expect(mockEncodeFunctionData).toHaveBeenCalledTimes(2);
    expect(mockEncodeFunctionData).toHaveBeenCalledWith(
      'exactInputSingle',
      expect.anything(),
    );
    expect(mockEncodeFunctionData).toHaveBeenCalledWith('refundETH', []);
  });

  it('should pass correct deadline', async () => {
    const before = Math.floor(Date.now() / 1000);
    await swapV3(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      300000,
      20,
    );

    const callArgs = mockMulticall.mock.calls[0];
    const deadline = callArgs[0];
    expect(deadline).toBeGreaterThanOrEqual(before + 20 * 60);
    expect(deadline).toBeLessThanOrEqual(before + 20 * 60 + 5);
  });

  it('should use default fee 2500 when pool.fee is undefined', async () => {
    const pool = makePool();
    pool.fee = undefined;
    await swapV3(
      mockWallet as any,
      pool,
      BigInt('1000000000000000'),
      300000,
      20,
    );
    const exactInputCall = mockEncodeFunctionData.mock.calls.find(
      (c: any[]) => c[0] === 'exactInputSingle',
    );
    expect(exactInputCall).toBeDefined();
    expect(exactInputCall![1][0].fee).toBe(2500);
  });
});
