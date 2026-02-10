import dotenv from 'dotenv';
dotenv.config();

export const config = {
  rpcUrl: process.env.BSC_RPC_URL || 'https://bsc-dataseed1.binance.org',
  privateKey: process.env.PRIVATE_KEY || '',
  slippagePercent: Number(process.env.SLIPPAGE_PERCENT) || 12,
  gasLimit: Number(process.env.GAS_LIMIT) || 300000,
  deadlineMinutes: Number(process.env.DEADLINE_MINUTES) || 20,
};
