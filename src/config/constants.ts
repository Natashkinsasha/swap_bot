export const WBNB = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';

export const ROUTERS: Record<string, { address: string; version: 'v2' | 'v3' | 'v4' }> = {
  'pancakeswap v2': {
    address: '0x10ED43C718714eb63d5aA57B78B54704E256024E',
    version: 'v2',
  },
  'pancakeswap v3': {
    address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
    version: 'v3',
  },
  'pancakeswap v4': {
    address: '0x13f4EA83D0bd40E75C8222255bc855a974568Dd4',
    version: 'v4',
  },
};

export const SUPPORTED_DEX_IDS = Object.keys(ROUTERS);
