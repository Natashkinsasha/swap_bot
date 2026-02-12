import { swapV2 } from '../../src/core/swap-v2';
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
const mockSwapETH = jest.fn().mockResolvedValue({ hash: '0xV2HASH', wait: mockWait });
const mockSwapTokens = jest.fn().mockResolvedValue({ hash: '0xV2HASH_TOKEN', wait: mockWait });
const mockGetAmountsOut = jest.fn().mockResolvedValue([
  BigInt('1000000000000000'),
  BigInt('500000000000000000'),
]);

jest.mock('ethers', () => {
  const actual = jest.requireActual('ethers');
  return {
    ...actual,
    ethers: {
      ...actual.ethers,
      Contract: jest.fn().mockImplementation(() => ({
        swapExactETHForTokensSupportingFeeOnTransferTokens: mockSwapETH,
        swapExactTokensForTokensSupportingFeeOnTransferTokens: mockSwapTokens,
        getAmountsOut: mockGetAmountsOut,
      })),
    },
  };
});

function makePool(): SelectedPool {
  return {
    pair: {
      chainId: 'bsc',
      dexId: 'pancakeswap_v2',
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
    routerAddress: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    version: 'v2',
    sellTokenAddress: WBNB,
    buyTokenAddress: '0xCAKE',
  };
}

const mockWallet = {
  getAddress: jest.fn().mockResolvedValue('0xWALLET'),
};

describe('swapV2', () => {
  afterEach(() => jest.clearAllMocks());

  it('should execute swap and return tx hash', async () => {
    const hash = await swapV2(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      12,
      300000,
      20,
      true,
    );
    expect(hash).toBe('0xV2HASH');
    expect(mockSwapETH).toHaveBeenCalledTimes(1);
    expect(mockWait).toHaveBeenCalledTimes(1);
  });

  it('should call getAmountsOut to estimate output', async () => {
    await swapV2(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      12,
      300000,
      20,
      true,
    );
    expect(mockGetAmountsOut).toHaveBeenCalledWith(
      BigInt('1000000000000000'),
      [WBNB, '0xCAKE'],
    );
  });

  it('should pass correct deadline based on deadlineMinutes', async () => {
    const before = Math.floor(Date.now() / 1000);
    await swapV2(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      12,
      300000,
      20,
      true,
    );

    const callArgs = mockSwapETH.mock.calls[0];
    const deadline = callArgs[3];
    expect(deadline).toBeGreaterThanOrEqual(before + 20 * 60);
    expect(deadline).toBeLessThanOrEqual(before + 20 * 60 + 5);
  });

  it('should use amountOutMin=0 when getAmountsOut fails', async () => {
    mockGetAmountsOut.mockRejectedValueOnce(new Error('fail'));
    await swapV2(
      mockWallet as any,
      makePool(),
      BigInt('1000000000000000'),
      12,
      300000,
      20,
      true,
    );
    const callArgs = mockSwapETH.mock.calls[0];
    expect(callArgs[0]).toBe(BigInt(0));
  });

  it('should call swapExactTokensForTokens when sellToken is not native BNB', async () => {
    const pool = makePool();
    pool.sellTokenAddress = '0xUSDT';
    const hash = await swapV2(
      mockWallet as any,
      pool,
      BigInt('1000000000000000'),
      12,
      300000,
      20,
      false,
    );
    expect(hash).toBe('0xV2HASH_TOKEN');
    expect(mockSwapTokens).toHaveBeenCalledTimes(1);
    expect(mockSwapETH).not.toHaveBeenCalled();
  });
});
