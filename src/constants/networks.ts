import type { NetworkConfig } from '../types';
import { 
  base, 
  polygon, 
  mainnet, 
  baseSepolia, 
  polygonAmoy, 
  sepolia,
  type Chain
} from 'viem/chains';

export const ENTRY_POINT_0_7 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032' as const;
export const ECDSA_VALIDATOR_V3_3 = '0x845ADb2C711129d4f3966735eD98a9F09fC4cE57' as const;

export function getZeroDevBundlerUrl(chainId: number, projectId: string): string {
  return `https://rpc.zerodev.app/api/v3/${projectId.trim()}/chain/${chainId}`;
}

export const SUPPORTED_NETWORKS: NetworkConfig[] = [
  // Production mainnets
  {
    id: base.id, // 8453
    name: 'Base Mainnet',
    shortName: 'Base',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://mainnet.base.org',
    defaultBundlerUrl: 'https://mainnet.base.org',
    usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    explorerUrl: 'https://basescan.org',
    isTestnet: false,
  },
  {
    id: polygon.id, // 137
    name: 'Polygon Mainnet',
    shortName: 'Polygon',
    nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
    rpcUrl: 'https://polygon-rpc.com',
    defaultBundlerUrl: 'https://polygon-rpc.com',
    usdcAddress: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    explorerUrl: 'https://polygonscan.com',
    isTestnet: false,
  },
  {
    id: mainnet.id, // 1
    name: 'Ethereum Mainnet',
    shortName: 'Ethereum',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://eth.llamarpc.com',
    defaultBundlerUrl: 'https://eth.llamarpc.com',
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    explorerUrl: 'https://etherscan.io',
    isTestnet: false,
  },
  // Testnets
  {
    id: baseSepolia.id, // 84532
    name: 'Base Sepolia',
    shortName: 'Base Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://sepolia.base.org',
    defaultBundlerUrl: 'https://sepolia.base.org',
    usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
    explorerUrl: 'https://sepolia.basescan.org',
    isTestnet: true,
  },
  {
    id: polygonAmoy.id, // 80002
    name: 'Polygon Amoy',
    shortName: 'Polygon Amoy',
    nativeCurrency: { name: 'Amoy POL', symbol: 'POL', decimals: 18 },
    rpcUrl: 'https://rpc-amoy.polygon.technology',
    defaultBundlerUrl: 'https://rpc-amoy.polygon.technology',
    usdcAddress: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
    explorerUrl: 'https://amoy.polygonscan.com',
    isTestnet: true,
  },
  {
    id: sepolia.id, // 11155111
    name: 'Ethereum Sepolia',
    shortName: 'Ethereum Sepolia',
    nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
    rpcUrl: 'https://rpc.sepolia.org',
    defaultBundlerUrl: 'https://rpc.sepolia.org',
    usdcAddress: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
    explorerUrl: 'https://sepolia.etherscan.io',
    isTestnet: true,
  },
];

export const VIEM_CHAINS: Record<number, Chain> = {
  [base.id]: base,
  [polygon.id]: polygon,
  [mainnet.id]: mainnet,
  [baseSepolia.id]: baseSepolia,
  [polygonAmoy.id]: polygonAmoy,
  [sepolia.id]: sepolia,
};

export const ERC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'recipient', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
] as const;
