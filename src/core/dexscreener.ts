import axios from 'axios';
import { DexscreenerPair, DexscreenerResponse, SelectedPool } from '../types';
import { ROUTERS, SUPPORTED_DEX_IDS, WBNB } from '../config';
import { log } from '../utils/logger';

const DEXSCREENER_API = 'https://api.dexscreener.com/latest/dex/tokens';

export async function findBestPool(buyTokenAddress: string, sellTokenAddress?: string): Promise<SelectedPool> {
  const resolvedSell = sellTokenAddress ?? WBNB;

  log.info(`Fetching pools from Dexscreener for both tokens...`);
  const [buyPairs, sellPairs] = await Promise.all([
    fetchBscPairs(buyTokenAddress),
    fetchBscPairs(resolvedSell),
  ]);

  const seen = new Set(buyPairs.map((p) => p.pairAddress));
  const allPairs = [...buyPairs, ...sellPairs.filter((p) => !seen.has(p.pairAddress))];
  log.info(`Found ${allPairs.length} unique BSC pool(s)`);

  const buyLower = buyTokenAddress.toLowerCase();
  const v2v3v4Pairs = findSupported(allPairs, resolvedSell)
    .filter((p) => {
      const base = p.pair.baseToken.address.toLowerCase();
      const quote = p.pair.quoteToken.address.toLowerCase();
      return base === buyLower || quote === buyLower;
    })
    .sort((a, b) => (b.pair.liquidity?.usd ?? 0) - (a.pair.liquidity?.usd ?? 0));

  if (v2v3v4Pairs.length === 0) {
    throw new Error('No supported V2/V3/V4 pools found on BSC');
  }

  logPools(v2v3v4Pairs);

  const best = v2v3v4Pairs[0];

  log.success(
    `Selected pool: ${best.pair.baseToken.symbol}/${best.pair.quoteToken.symbol} ` +
    `on ${best.pair.dexId} (${best.version}) — liquidity: $${best.pair.liquidity?.usd?.toLocaleString() ?? '?'}`,
  );

  return best;
}

async function fetchBscPairs(tokenAddress: string): Promise<DexscreenerPair[]> {
  const { data } = await axios.get<DexscreenerResponse>(
    `${DEXSCREENER_API}/${tokenAddress}`,
  );
  if (!data.pairs) return [];
  return data.pairs.filter((p) => p.chainId === 'bsc');
}

function findSupported(bscPairs: DexscreenerPair[], sellTokenAddress: string): SelectedPool[] {
  const supportedPairs = bscPairs.filter((p) => {
    const dexLower = p.dexId.toLowerCase();
    return SUPPORTED_DEX_IDS.some((id) => dexLower.includes(id.replace('pancakeswap ', '')));
  });
  return filterByVersion(supportedPairs.length > 0 ? supportedPairs : bscPairs, sellTokenAddress);
}

function filterByVersion(pairs: DexscreenerPair[], sellTokenAddress?: string): SelectedPool[] {
  const result: SelectedPool[] = [];
  const resolvedSellToken = sellTokenAddress ?? WBNB;
  const sellLower = resolvedSellToken.toLowerCase();

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

    const baseLower = pair.baseToken.address.toLowerCase();
    const quoteLower = pair.quoteToken.address.toLowerCase();

    let buyTokenAddress: string;
    if (baseLower === sellLower) {
      buyTokenAddress = pair.quoteToken.address;
    } else if (quoteLower === sellLower) {
      buyTokenAddress = pair.baseToken.address;
    } else {
      continue;
    }

    result.push({
      pair,
      routerAddress: router.address,
      version,
      sellTokenAddress: resolvedSellToken,
      buyTokenAddress,
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
