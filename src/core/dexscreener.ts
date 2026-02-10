import axios from 'axios';
import { DexscreenerPair, DexscreenerResponse, SelectedPool } from '../types';
import { ROUTERS, SUPPORTED_DEX_IDS, WBNB } from '../config';
import { log } from '../utils/logger';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

export async function findBestPool(tokenAddress: string): Promise<SelectedPool> {
  log.info(`Fetching pools from Dexscreener for token: ${tokenAddress}`);

  const { data } = await axios.get<DexscreenerResponse>(
    `${DEXSCREENER_API}/${tokenAddress}`,
  );

  if (!data.pairs || data.pairs.length === 0) {
    throw new Error('No pools found on Dexscreener for this token');
  }

  const bscPairs = data.pairs.filter((p) => p.chainId === 'bsc');
  if (bscPairs.length === 0) {
    throw new Error('No BSC pools found for this token');
  }

  log.info(`Found ${bscPairs.length} BSC pool(s) total`);

  const supportedPairs = bscPairs.filter((p) => {
    const dexLower = p.dexId.toLowerCase();
    return SUPPORTED_DEX_IDS.some((id) => dexLower.includes(id.replace('pancakeswap ', '')));
  });

  const v2v3v4Pairs = filterByVersion(supportedPairs.length > 0 ? supportedPairs : bscPairs);

  if (v2v3v4Pairs.length === 0) {
    throw new Error('No supported V2/V3/V4 pools found on BSC');
  }

  logPools(v2v3v4Pairs);

  const best = v2v3v4Pairs.sort((a, b) => {
    const liqA = a.pair.liquidity?.usd ?? 0;
    const liqB = b.pair.liquidity?.usd ?? 0;
    return liqB - liqA;
  })[0];

  log.success(
    `Selected pool: ${best.pair.baseToken.symbol}/${best.pair.quoteToken.symbol} ` +
    `on ${best.pair.dexId} (${best.version}) — liquidity: $${best.pair.liquidity?.usd?.toLocaleString() ?? '?'}`,
  );

  return best;
}

function filterByVersion(pairs: DexscreenerPair[]): SelectedPool[] {
  const result: SelectedPool[] = [];

  for (const pair of pairs) {
    const dex = pair.dexId.toLowerCase();
    const labels = (pair.labels || []).map((l) => l.toLowerCase());

    let version: 'v2' | 'v3' | 'v4' | null = null;

    if (labels.includes('v4') || dex.includes('v4')) {
      version = 'v4';
    } else if (labels.includes('v3') || dex.includes('v3')) {
      version = 'v3';
    } else if (labels.includes('v2') || dex.includes('v2')) {
      version = 'v2';
    } else {
      version = 'v2';
    }

    const routerKey = `pancakeswap ${version}`;
    const router = ROUTERS[routerKey];
    if (!router) continue;

    const isBaseToken =
      pair.baseToken.address.toLowerCase() === WBNB.toLowerCase();

    result.push({
      pair,
      routerAddress: router.address,
      version,
      tokenIn: WBNB,
      tokenOut: isBaseToken
        ? pair.quoteToken.address
        : pair.baseToken.address,
      fee: version === 'v3' || version === 'v4' ? 2500 : undefined,
    });
  }

  return result;
}

function logPools(pools: SelectedPool[]) {
  log.info('Supported pools:');
  for (const p of pools) {
    const liq = p.pair.liquidity?.usd?.toLocaleString() ?? '?';
    console.log(
      `  • ${p.pair.baseToken.symbol}/${p.pair.quoteToken.symbol} ` +
      `[${p.version.toUpperCase()}] liq: $${liq} — ${p.pair.pairAddress}`,
    );
  }
}
