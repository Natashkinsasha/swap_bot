import { findBestPool } from '../../src/core/dexscreener';

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

const CAKE_ADDRESS = '0x0E09FaBB73Bd3Ade0a17ECC321fD13a19e81cE82';
const USDT_ADDRESS = '0x55d398326f99059fF775485246999027B3197955';
const FAKE_TOKEN = '0x0000000000000000000000000000000000000001';

describe('Dexscreener Integration', () => {
  jest.setTimeout(15000);

  it('should find CAKE pools on BSC', async () => {
    const pool = await findBestPool(CAKE_ADDRESS);

    expect(pool).toBeDefined();
    expect(pool.pair.chainId).toBe('bsc');
    expect(pool.version).toMatch(/^v[234]$/);
    expect(pool.routerAddress).toBeDefined();
    expect(pool.tokenOut).toBeDefined();
    expect(pool.pair.liquidity.usd).toBeGreaterThan(0);
  });

  it('should find USDT pools on BSC', async () => {
    const pool = await findBestPool(USDT_ADDRESS);

    expect(pool).toBeDefined();
    expect(pool.pair.chainId).toBe('bsc');
    expect(pool.pair.liquidity.usd).toBeGreaterThan(0);
  });

  it('should select the pool with highest liquidity', async () => {
    const pool = await findBestPool(CAKE_ADDRESS);
    expect(pool.pair.liquidity.usd).toBeGreaterThan(1000);
  });

  it('should throw for non-existent token', async () => {
    await expect(findBestPool(FAKE_TOKEN)).rejects.toThrow();
  });
});
