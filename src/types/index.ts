export interface DexscreenerPair {
  chainId: string;
  dexId: string;
  url: string;
  pairAddress: string;
  baseToken: {
    address: string;
    name: string;
    symbol: string;
  };
  quoteToken: {
    address: string;
    name: string;
    symbol: string;
  };
  priceNative: string;
  priceUsd: string;
  liquidity: {
    usd: number;
    base: number;
    quote: number;
  };
  fdv: number;
  volume: {
    h24: number;
  };
  labels?: string[];
}

export interface DexscreenerResponse {
  pairs: DexscreenerPair[] | null;
}

export interface SelectedPool {
  pair: DexscreenerPair;
  routerAddress: string;
  version: 'v2' | 'v3' | 'v4';
  tokenIn: string;
  tokenOut: string;
  fee?: number;
}

export interface SwapOptions {
  amountBnb: string;
  slippagePercent: number;
  rpcUrl: string;
  privateKey: string;
  gasLimit: number;
  deadlineMinutes: number;
}
