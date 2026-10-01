import { useState, useEffect, useCallback } from 'react';
import { isAddress, type Address } from 'viem';
import { Header } from './components/Header';
import { RunbookModal } from './components/RunbookModal';
import { StepNetworkAccount } from './components/StepNetworkAccount';
import { StepSignerConnection } from './components/StepSignerConnection';
import { StepBalancesGas } from './components/StepBalancesGas';
import { StepExecutionSweep } from './components/StepExecutionSweep';

import {
  connectWallet,
  fetchBalances,
  switchWalletNetwork,
  executeSweep,
  getNetwork,
} from './services/recoveryService';
import type { AccountBalances, AssetType, GasMode, SweepResult, SweepStep } from './types';

export function App() {
  const [isRunbookOpen, setIsRunbookOpen] = useState(false);

  // Default to Base Sepolia for easy verification, or first mainnet
  const [selectedChainId, setSelectedChainId] = useState<number>(84532);
  const currentNetwork = getNetwork(selectedChainId);

  // Address states
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>(() => {
    return localStorage.getItem('orki_recovery_smart_account') || '0xf9eC51c14db80452BeD2691D9B99c76b38FD2ED6';
  });
  const [signerAddress, setSignerAddress] = useState<Address | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Network endpoints
  const [rpcUrl, setRpcUrl] = useState<string>(currentNetwork.rpcUrl);
  const [bundlerUrl, setBundlerUrl] = useState<string>(currentNetwork.defaultBundlerUrl);

  // Balances
  const [balances, setBalances] = useState<AccountBalances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  // Gas mode
  const [gasMode, setGasMode] = useState<GasMode>('paymaster');

  // Sweep configuration
  const [assetType, setAssetType] = useState<AssetType>('USDC');
  const [amount, setAmount] = useState<string>('1');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [customTokenAddress, setCustomTokenAddress] = useState<string>('');

  // Execution states
  const [sweepStep, setSweepStep] = useState<SweepStep>('idle');
  const [stepMessage, setStepMessage] = useState<string>('');
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync RPC and Bundler when chain changes
  const handleSelectChainId = (chainId: number) => {
    setSelectedChainId(chainId);
    const net = getNetwork(chainId);
    setRpcUrl(net.rpcUrl);
    setBundlerUrl(net.defaultBundlerUrl);
    setBalances(null);
  };

  const handleSmartAccountChange = (addr: string) => {
    setSmartAccountAddress(addr);
    localStorage.setItem('orki_recovery_smart_account', addr);
  };

  // Fetch balances
  const loadBalances = useCallback(async () => {
    if (!isAddress(smartAccountAddress)) return;
    setIsLoadingBalances(true);
    try {
      const bals = await fetchBalances(
        selectedChainId,
        rpcUrl,
        smartAccountAddress as Address,
        currentNetwork.usdcAddress,
        isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined
      );
      setBalances(bals);
    } catch (e) {
      console.warn('Error fetching balances:', e);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [selectedChainId, rpcUrl, smartAccountAddress, currentNetwork.usdcAddress, customTokenAddress]);

  useEffect(() => {
    let isSubscribed = true;
    if (isAddress(smartAccountAddress)) {
      void (async () => {
        setIsLoadingBalances(true);
        try {
          const bals = await fetchBalances(
            selectedChainId,
            rpcUrl,
            smartAccountAddress as Address,
            currentNetwork.usdcAddress,
            isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined
          );
          if (isSubscribed) setBalances(bals);
        } catch (e) {
          console.warn('Error fetching balances:', e);
        } finally {
          if (isSubscribed) setIsLoadingBalances(false);
        }
      })();
    }
    return () => {
      isSubscribed = false;
    };
  }, [selectedChainId, rpcUrl, smartAccountAddress, currentNetwork.usdcAddress, customTokenAddress]);

  // Connect Wallet
  const handleConnectWallet = async () => {
    setIsConnectingWallet(true);
    setErrorMessage(null);
    try {
      const address = await connectWallet();
      setSignerAddress(address);
      if (!recipientAddress) {
        setRecipientAddress(address);
      }
      if (window.ethereum) {
        const hexId = (await window.ethereum.request({ method: 'eth_chainId' })) as string;
        setWalletChainId(parseInt(hexId, 16));
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || 'Failed to connect wallet');
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const handleDisconnectWallet = () => {
    setSignerAddress(null);
  };

  const handleSwitchChain = async () => {
    try {
      await switchWalletNetwork(selectedChainId);
      setWalletChainId(selectedChainId);
    } catch (e: unknown) {
      const err = e as Error;
      setErrorMessage(err.message || 'Failed to switch network');
    }
  };

  // Listen for account/chain changes in wallet
  useEffect(() => {
    if (typeof window !== 'undefined' && window.ethereum?.on) {
      const handleAccountsChanged = (accounts: unknown) => {
        const accs = accounts as string[];
        if (accs.length > 0) {
          setSignerAddress(accs[0] as Address);
        } else {
          setSignerAddress(null);
        }
      };

      const handleChainChanged = (chainIdHex: unknown) => {
        setWalletChainId(parseInt(chainIdHex as string, 16));
      };

      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);

      return () => {
        if (window.ethereum?.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
          window.ethereum.removeListener('chainChanged', handleChainChanged);
        }
      };
    }
  }, []);

  // Execute Sweep
  const handleExecuteSweep = async () => {
    if (!signerAddress) {
      setErrorMessage('Please connect your recovery signer wallet first.');
      return;
    }
    if (!isAddress(smartAccountAddress)) {
      setErrorMessage('Invalid Orki smart account address.');
      return;
    }
    if (!isAddress(recipientAddress)) {
      setErrorMessage('Invalid recipient address.');
      return;
    }

    setErrorMessage(null);
    setSweepStep('validating');

    try {
      const result = await executeSweep({
        chainId: selectedChainId,
        rpcUrl,
        bundlerUrl,
        kernelAddress: smartAccountAddress as Address,
        signerAddress,
        recipientAddress: recipientAddress as Address,
        assetType,
        amount,
        customTokenAddress: isAddress(customTokenAddress) ? (customTokenAddress as Address) : undefined,
        gasMode,
        onStepChange: (step, msg) => {
          setSweepStep(step);
          setStepMessage(msg);
        },
      });

      setSweepResult(result);
      loadBalances();
    } catch (err: unknown) {
      const e = err as Error;
      console.error('Sweep execution failed:', e);
      setSweepStep('error');
      setErrorMessage(e.message || 'Emergency recovery execution failed');
    }
  };

  const handleReset = () => {
    setSweepResult(null);
    setSweepStep('idle');
    setStepMessage('');
    setErrorMessage(null);
    loadBalances();
  };

  return (
    <div className="app-container">
      <Header onOpenRunbook={() => setIsRunbookOpen(true)} />

      <main className="main-content">
        <div className="security-banner">
          <span className="security-icon">🛡️</span>
          <div>
            <strong>Zero-Dependency Guarantee:</strong> This application communicates directly with the decentralized
            blockchain. It requires no Orki backend servers, API keys, or operational infrastructure.
          </div>
        </div>

        <div className="wizard-layout">
          <StepNetworkAccount
            selectedChainId={selectedChainId}
            onSelectChainId={handleSelectChainId}
            smartAccountAddress={smartAccountAddress}
            onChangeSmartAccount={handleSmartAccountChange}
            rpcUrl={rpcUrl}
            onChangeRpcUrl={setRpcUrl}
            bundlerUrl={bundlerUrl}
            onChangeBundlerUrl={setBundlerUrl}
            currentNetwork={currentNetwork}
          />

          <StepSignerConnection
            signerAddress={signerAddress}
            onConnectWallet={handleConnectWallet}
            onDisconnectWallet={handleDisconnectWallet}
            selectedChainId={selectedChainId}
            walletChainId={walletChainId}
            onSwitchChain={handleSwitchChain}
            isConnecting={isConnectingWallet}
            networkName={currentNetwork.name}
          />

          <StepBalancesGas
            balances={balances}
            isLoadingBalances={isLoadingBalances}
            onRefreshBalances={loadBalances}
            gasMode={gasMode}
            onChangeGasMode={setGasMode}
            network={currentNetwork}
            smartAccountAddress={smartAccountAddress}
          />

          <StepExecutionSweep
            assetType={assetType}
            onChangeAssetType={setAssetType}
            amount={amount}
            onChangeAmount={setAmount}
            recipientAddress={recipientAddress}
            onChangeRecipient={setRecipientAddress}
            customTokenAddress={customTokenAddress}
            onChangeCustomToken={setCustomTokenAddress}
            balances={balances}
            signerAddress={signerAddress}
            network={currentNetwork}
            sweepStep={sweepStep}
            stepMessage={stepMessage}
            sweepResult={sweepResult}
            errorMessage={errorMessage}
            onExecuteSweep={handleExecuteSweep}
            onReset={handleReset}
          />
        </div>
      </main>

      <footer className="footer">
        <p>Orki Smart Account Disaster Recovery Vault • Built for Kernel v3.3 & ERC-4337</p>
        <p className="footer-sub">
          Canonical EntryPoint: <code>0x0000000071727De22E5E9d8BAf0edAc6f37da032</code>
        </p>
      </footer>

      <RunbookModal isOpen={isRunbookOpen} onClose={() => setIsRunbookOpen(false)} />
    </div>
  );
}

export default App;
