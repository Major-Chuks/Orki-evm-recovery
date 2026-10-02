import {
  createPublicClient,
  createWalletClient,
  custom,
  http,
  formatUnits,
  formatEther,
  parseUnits,
  parseEther,
  encodeFunctionData,
  isAddress,
  type Address,
} from 'viem';
import { createKernelAccount, createKernelAccountClient, createZeroDevPaymasterClient } from '@zerodev/sdk';
import { signerToEcdsaValidator } from '@zerodev/ecdsa-validator';
import { getEntryPoint, KERNEL_V3_3 } from '@zerodev/sdk/constants';
import { VIEM_CHAINS, ERC20_ABI, SUPPORTED_NETWORKS } from '../constants/networks';
import type { AccountBalances, GasMode, NetworkConfig, SweepResult, SweepStep } from '../types';

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] | Record<string, unknown> }) => Promise<unknown>;
      on?: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener?: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}

export function getNetwork(chainId: number): NetworkConfig {
  const found = SUPPORTED_NETWORKS.find((n) => n.id === chainId);
  if (!found) throw new Error(`Network with chain ID ${chainId} not supported`);
  return found;
}

export async function connectWallet(): Promise<Address> {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Web3 wallet extension found (MetaMask, Rabby, Coinbase Wallet, etc.). Please install one.');
  }
  const accounts = (await window.ethereum.request({
    method: 'eth_requestAccounts',
  })) as string[];

  if (!accounts || accounts.length === 0) {
    throw new Error('No accounts authorized in your wallet.');
  }
  return accounts[0] as Address;
}

export async function switchWalletNetwork(chainId: number): Promise<void> {
  if (!window.ethereum) return;
  const hexChainId = `0x${chainId.toString(16)}`;
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error: unknown) {
    const err = error as { code?: number };
    if (err.code === 4902) {
      const net = getNetwork(chainId);
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: hexChainId,
            chainName: net.name,
            nativeCurrency: net.nativeCurrency,
            rpcUrls: [net.rpcUrl],
            blockExplorerUrls: [net.explorerUrl],
          },
        ],
      });
    } else {
      throw error;
    }
  }
}

// Helper to safely call readContract without Viem's EIP-7702 authorizationList typing quirk
async function readErc20<T>(
  publicClient: ReturnType<typeof createPublicClient>,
  params: {
    address: Address;
    functionName: 'balanceOf' | 'decimals' | 'symbol';
    args?: readonly unknown[];
  }
): Promise<T> {
  return (publicClient as unknown as { readContract: (args: unknown) => Promise<T> }).readContract({
    abi: ERC20_ABI,
    ...params,
  });
}

export async function fetchBalances(
  chainId: number,
  rpcUrl: string,
  accountAddress: Address,
  usdcAddress: Address,
  customTokenAddress?: Address
): Promise<AccountBalances> {
  const chain = VIEM_CHAINS[chainId];
  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const nativeRaw = await publicClient.getBalance({ address: accountAddress });
  const native = formatEther(nativeRaw);

  let usdcRaw = 0n;
  let usdc = '0.00';
  try {
    usdcRaw = await readErc20<bigint>(publicClient, {
      address: usdcAddress,
      functionName: 'balanceOf',
      args: [accountAddress],
    });
    usdc = formatUnits(usdcRaw, 6);
  } catch (e) {
    console.warn('Failed to fetch USDC balance:', e);
  }

  let customRaw: bigint | undefined;
  let custom: string | undefined;
  let customSymbol: string | undefined;

  if (customTokenAddress && isAddress(customTokenAddress)) {
    try {
      const [bal, dec, sym] = await Promise.all([
        readErc20<bigint>(publicClient, {
          address: customTokenAddress,
          functionName: 'balanceOf',
          args: [accountAddress],
        }),
        readErc20<number>(publicClient, {
          address: customTokenAddress,
          functionName: 'decimals',
        }),
        readErc20<string>(publicClient, {
          address: customTokenAddress,
          functionName: 'symbol',
        }),
      ]);
      customRaw = bal;
      custom = formatUnits(bal, dec);
      customSymbol = sym;
    } catch (e) {
      console.warn('Failed to fetch custom token:', e);
    }
  }

  return {
    native,
    nativeRaw,
    usdc,
    usdcRaw,
    custom,
    customRaw,
    customSymbol,
  };
}

export interface SweepParams {
  chainId: number;
  rpcUrl: string;
  bundlerUrl: string;
  kernelAddress: Address;
  signerAddress: Address;
  recipientAddress: Address;
  assetType: 'USDC' | 'NATIVE' | 'CUSTOM';
  amount: string;
  customTokenAddress?: Address;
  gasMode: GasMode;
  onStepChange: (step: SweepStep, message: string) => void;
}

export async function executeSweep(params: SweepParams): Promise<SweepResult> {
  const {
    chainId,
    rpcUrl,
    bundlerUrl,
    kernelAddress,
    signerAddress,
    recipientAddress,
    assetType,
    amount,
    customTokenAddress,
    gasMode,
    onStepChange,
  } = params;

  if (!window.ethereum) {
    throw new Error('Web3 wallet is required to sign the recovery UserOperation.');
  }

  onStepChange('validating', 'Validating parameters and network connection...');
  const chain = VIEM_CHAINS[chainId];
  const network = getNetwork(chainId);

  const publicClient = createPublicClient({
    chain,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account: signerAddress,
    chain,
    transport: custom(window.ethereum),
  });

  onStepChange('instantiating', 'Instantiating Kernel v3.3 smart account with ECDSA recovery validator...');
  const entryPoint = getEntryPoint('0.7');

  const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
    signer: walletClient as unknown as Parameters<typeof signerToEcdsaValidator>[1]['signer'],
    entryPoint,
    kernelVersion: KERNEL_V3_3,
  });

  let kernelAccount;
  try {
    kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        regular: ecdsaValidator,
        isPreInstalled: true,
      },
      entryPoint,
      kernelVersion: KERNEL_V3_3,
      address: kernelAddress,
    });
  } catch {
    kernelAccount = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint,
      kernelVersion: KERNEL_V3_3,
      address: kernelAddress,
    });
  }

  onStepChange('requesting_signature', 'Constructing withdrawal transaction and requesting wallet signature...');

  let call;
  let formattedAsset = 'USDC';

  if (assetType === 'USDC') {
    formattedAsset = 'USDC';
    const parsedAmount = parseUnits(amount, 6);
    call = {
      to: network.usdcAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipientAddress, parsedAmount],
      }),
    };
  } else if (assetType === 'NATIVE') {
    formattedAsset = network.nativeCurrency.symbol;
    const parsedAmount = parseEther(amount);
    call = {
      to: recipientAddress,
      value: parsedAmount,
      data: '0x' as const,
    };
  } else {
    if (!customTokenAddress || !isAddress(customTokenAddress)) {
      throw new Error('Invalid custom ERC-20 token address');
    }
    const dec = await readErc20<number>(publicClient, {
      address: customTokenAddress,
      functionName: 'decimals',
    });
    const sym = await readErc20<string>(publicClient, {
      address: customTokenAddress,
      functionName: 'symbol',
    });
    formattedAsset = sym;
    const parsedAmount = parseUnits(amount, dec);
    call = {
      to: customTokenAddress,
      value: 0n,
      data: encodeFunctionData({
        abi: ERC20_ABI,
        functionName: 'transfer',
        args: [recipientAddress, parsedAmount],
      }),
    };
  }

  // Configure Client based on Gas Strategy
  const kernelClient = createKernelAccountClient({
    account: kernelAccount,
    chain,
    bundlerTransport: http(bundlerUrl),
    client: publicClient,
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => {
        try {
          const res = (await bundlerClient.request({
            method: 'zd_getUserOperationGasPrice' as unknown as 'eth_estimateUserOperationGas',
            params: [] as unknown as never,
          })) as { standard: { maxFeePerGas: string; maxPriorityFeePerGas: string } };
          if (res?.standard?.maxFeePerGas) {
            return {
              maxFeePerGas: BigInt(res.standard.maxFeePerGas),
              maxPriorityFeePerGas: BigInt(res.standard.maxPriorityFeePerGas),
            };
          }
        } catch {
          // Bundler or node does not support zd_getUserOperationGasPrice, fallback to standard fee data
        }
        const feeData = await publicClient.estimateFeesPerGas();
        return {
          maxFeePerGas: feeData.maxFeePerGas ?? 1000000000n,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 100000000n,
        };
      },
    },
    ...(gasMode === 'paymaster'
      ? {
          paymaster: {
            getPaymasterData: (userOperation) => {
              const paymaster = createZeroDevPaymasterClient({
                chain,
                transport: http(bundlerUrl),
              });
              return paymaster.sponsorUserOperation({ userOperation });
            },
          },
        }
      : {}),
  });

  onStepChange('submitting_userop', 'Submitting signed UserOperation to ERC-4337 Bundler...');
  const userOpHash = await kernelClient.sendUserOperation({
    callData: await kernelAccount.encodeCalls([call]),
  });

  onStepChange('confirming_onchain', `UserOp submitted (${userOpHash.slice(0, 10)}...). Waiting for block confirmation...`);
  const receipt = await kernelClient.waitForUserOperationReceipt({
    hash: userOpHash,
  });

  const txHash = receipt.receipt.transactionHash;

  onStepChange('success', 'Funds successfully swept on-chain!');

  return {
    txHash,
    userOpHash,
    explorerUrl: `${network.explorerUrl}/tx/${txHash}`,
    amount,
    asset: formattedAsset,
    recipient: recipientAddress,
  };
}
