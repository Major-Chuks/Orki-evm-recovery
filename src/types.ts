export interface NetworkConfig {
  id: number;
  name: string;
  shortName: string;
  nativeCurrency: { name: string; symbol: string; decimals: number };
  rpcUrl: string;
  defaultBundlerUrl: string;
  usdcAddress: `0x${string}`;
  explorerUrl: string;
  isTestnet: boolean;
}

export type AssetType = 'USDC' | 'NATIVE' | 'CUSTOM';

export type GasMode = 'native' | 'paymaster';

export type SweepStep = 
  | 'idle'
  | 'validating'
  | 'instantiating'
  | 'requesting_signature'
  | 'submitting_userop'
  | 'confirming_onchain'
  | 'success'
  | 'error';

export interface SweepResult {
  txHash: string;
  userOpHash: string;
  explorerUrl: string;
  amount: string;
  asset: string;
  recipient: string;
}

export interface AccountBalances {
  native: string;
  nativeRaw: bigint;
  usdc: string;
  usdcRaw: bigint;
  custom?: string;
  customRaw?: bigint;
  customSymbol?: string;
}
