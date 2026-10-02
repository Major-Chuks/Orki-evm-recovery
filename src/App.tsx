import { useState, useEffect, useCallback } from 'react';
import { isAddress, type Address } from 'viem';
import {
  Globe,
  Wallet,
  Copy,
  Check,
  ExternalLink,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ArrowUpRight,
  Settings2,
} from 'lucide-react';
import { Header } from './components/Header';
import {
  connectWallet,
  fetchBalances,
  switchWalletNetwork,
  executeSweep,
  getNetwork,
} from './services/recoveryService';
import { SUPPORTED_NETWORKS, getZeroDevBundlerUrl, ENTRY_POINT_0_7, ZERODEV_PROJECT_ID } from './constants/networks';
import { parseMetaMaskError, type FormattedError } from './utils/parseMetamaskError';
import type { AccountBalances, AssetType, GasMode, SweepResult, SweepStep } from './types';

// Dynamic initial state helpers supporting Query Params, Hash Fragments, and Pre-baked Offline configs
function getInitialChainId(): number {
  if (typeof window === 'undefined') return SUPPORTED_NETWORKS[0]?.id || 8453;

  // 1. Pre-injected config (for offline single-file bundles)
  const preConfig = (window as unknown as { __ORKI_RECOVERY_CONFIG__?: { chainId?: number; chain?: number } }).__ORKI_RECOVERY_CONFIG__;
  if (preConfig?.chainId && SUPPORTED_NETWORKS.some((n) => n.id === preConfig.chainId)) return preConfig.chainId;
  if (preConfig?.chain && SUPPORTED_NETWORKS.some((n) => n.id === preConfig.chain)) return preConfig.chain;

  // 2. Query parameter (?chain=... or ?chainId=...)
  const urlParams = new URLSearchParams(window.location.search);
  const chainParam = urlParams.get('chain') || urlParams.get('chainId');
  if (chainParam) {
    const parsed = parseInt(chainParam, 10);
    if (SUPPORTED_NETWORKS.some((n) => n.id === parsed)) return parsed;
  }

  // 3. Hash parameter (#chain=... or #chainId=...)
  if (window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    const hashParams = new URLSearchParams(rawHash.includes('?') ? rawHash.split('?')[1] : rawHash);
    const hashChain = hashParams.get('chain') || hashParams.get('chainId');
    if (hashChain) {
      const parsed = parseInt(hashChain, 10);
      if (SUPPORTED_NETWORKS.some((n) => n.id === parsed)) return parsed;
    }
  }

  return SUPPORTED_NETWORKS[0]?.id || 8453;
}

function getInitialSmartAccount(): string {
  if (typeof window === 'undefined') return '';

  // 1. Pre-injected configuration (for downloaded offline HTML bundles)
  const preConfig = (window as unknown as { __ORKI_RECOVERY_CONFIG__?: { account?: string } }).__ORKI_RECOVERY_CONFIG__;
  if (preConfig?.account && isAddress(preConfig.account.trim())) return preConfig.account.trim();

  // 2. Single query parameter (?account=0x...)
  const urlParams = new URLSearchParams(window.location.search);
  const fromQuery = urlParams.get('account');
  if (fromQuery && isAddress(fromQuery.trim())) {
    return fromQuery.trim();
  }

  // 3. Hash parameter or raw hash fragment (#account=0x... or #0x...)
  if (window.location.hash) {
    const rawHash = window.location.hash.replace(/^#\/?/, '').trim();
    if (isAddress(rawHash)) {
      return rawHash;
    }
    const hashParams = new URLSearchParams(rawHash.includes('?') ? rawHash.split('?')[1] : rawHash);
    const fromHash = hashParams.get('account');
    if (fromHash && isAddress(fromHash.trim())) {
      return fromHash.trim();
    }
  }

  return '';
}

export function App() {
  // Network state: dynamically initialized from URL or first configured network
  const [selectedChainId, setSelectedChainId] = useState<number>(getInitialChainId);
  const currentNetwork = getNetwork(selectedChainId);

  // ZeroDev Project ID: hardcoded default in constants/networks.ts
  const zerodevProjectId = ZERODEV_PROJECT_ID;

  // Gas mode: defaults to 'paymaster'
  const [gasMode, setGasMode] = useState<GasMode>('paymaster');

  // Smart Account Address state: dynamically initialized from URL or starts empty
  const [smartAccountAddress, setSmartAccountAddress] = useState<string>(getInitialSmartAccount);

  // Wallet / Signer state
  const [signerAddress, setSignerAddress] = useState<Address | null>(null);
  const [walletChainId, setWalletChainId] = useState<number | null>(null);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);

  // Compute default bundler URL dynamically (ZeroDev Bundler RPC handles both paymaster and self-funded userOps)
  const computeDefaultBundlerUrl = useCallback((chainId: number) => {
    return getZeroDevBundlerUrl(chainId, ZERODEV_PROJECT_ID);
  }, []);

  // Endpoints
  const [rpcUrl, setRpcUrl] = useState<string>(currentNetwork.rpcUrl);
  const [bundlerUrl, setBundlerUrl] = useState<string>(() => {
    return computeDefaultBundlerUrl(selectedChainId);
  });


  // Balances
  const [balances, setBalances] = useState<AccountBalances | null>(null);
  const [isLoadingBalances, setIsLoadingBalances] = useState<boolean>(false);

  // Sweep configuration: amount starts empty (no hardcoded amount)
  const [assetType, setAssetType] = useState<AssetType>('USDC');
  const [amount, setAmount] = useState<string>('');
  const [recipientAddress, setRecipientAddress] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Execution states
  const [sweepStep, setSweepStep] = useState<SweepStep>('idle');
  const [stepMessage, setStepMessage] = useState<string>('');
  const [sweepResult, setSweepResult] = useState<SweepResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<FormattedError | null>(null);

  const setError = useCallback((err: unknown, customTitle?: string) => {
    if (!err) {
      setErrorMessage(null);
      return;
    }
    if (typeof err === 'string') {
      setErrorMessage({
        title: customTitle || 'Configuration Error',
        message: err,
      });
    } else {
      setErrorMessage(parseMetaMaskError(err));
    }
  }, []);

  // Copy helper
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Sync RPC and Bundler when chain changes
  const handleSelectChainId = useCallback((chainId: number) => {
    setSelectedChainId(chainId);
    const net = getNetwork(chainId);
    setRpcUrl(net.rpcUrl);
    setBundlerUrl(computeDefaultBundlerUrl(chainId));
    setBalances(null);
  }, [computeDefaultBundlerUrl]);

  const handleGasModeChange = (mode: GasMode) => {
    setGasMode(mode);
    if (!bundlerUrl) {
      setBundlerUrl(computeDefaultBundlerUrl(selectedChainId));
    }
  };

  // Sync URL changes dynamically without page reload
  useEffect(() => {
    const handleUrlChange = () => {
      const addr = getInitialSmartAccount();
      if (addr && addr !== smartAccountAddress) {
        setSmartAccountAddress(addr);
      }
      const chain = getInitialChainId();
      if (chain && chain !== selectedChainId) {
        handleSelectChainId(chain);
      }
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, [smartAccountAddress, selectedChainId, handleSelectChainId]);

  // Fetch balances
  const loadBalances = useCallback(async () => {
    if (!isAddress(smartAccountAddress)) return;
    setIsLoadingBalances(true);
    try {
      const bals = await fetchBalances(
        selectedChainId,
        rpcUrl,
        smartAccountAddress as Address,
        currentNetwork.usdcAddress
      );
      setBalances(bals);
    } catch (e) {
      console.warn('Error fetching balances:', e);
    } finally {
      setIsLoadingBalances(false);
    }
  }, [selectedChainId, rpcUrl, smartAccountAddress, currentNetwork.usdcAddress]);

  useEffect(() => {
    let ignore = false;
    if (!isAddress(smartAccountAddress)) return;

    void (async () => {
      setIsLoadingBalances(true);
      try {
        const bals = await fetchBalances(
          selectedChainId,
          rpcUrl,
          smartAccountAddress as Address,
          currentNetwork.usdcAddress
        );
        if (!ignore) setBalances(bals);
      } catch (e) {
        console.warn('Error fetching balances:', e);
      } finally {
        if (!ignore) setIsLoadingBalances(false);
      }
    })();

    return () => {
      ignore = true;
    };
  }, [selectedChainId, rpcUrl, smartAccountAddress, currentNetwork.usdcAddress]);

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
      setErrorMessage(parseMetaMaskError(err));
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
      setErrorMessage(parseMetaMaskError(e));
    }
  };

  // Listen for account/chain changes
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

  // Max amount helper
  const handleMaxAmount = () => {
    if (!balances) return;
    if (assetType === 'USDC') {
      setAmount(balances.usdc || '');
    } else if (assetType === 'NATIVE') {
      const num = parseFloat(balances.native || '0');
      const maxVal = Math.max(0, num - 0.0002);
      setAmount(maxVal > 0 ? maxVal.toFixed(5) : '0');
    }
  };

  // Execute Sweep
  const handleExecuteSweep = async () => {
    if (!signerAddress) {
      setError('Please connect your recovery signer wallet first.', 'Signer Required');
      return;
    }
    if (!isAddress(smartAccountAddress)) {
      setError('Invalid Orki smart account address.', 'Invalid Address');
      return;
    }
    const targetRecipient = signerAddress || recipientAddress;
    if (!targetRecipient || !isAddress(targetRecipient)) {
      setError('Please connect your recovery signer wallet first.', 'Signer Required');
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
        recipientAddress: targetRecipient as Address,
        assetType,
        amount,
        gasMode,
        onStepChange: (step, msg) => {
          setSweepStep(step);
          setStepMessage(msg);
        },
      });

      setSweepResult(result);
      loadBalances();
    } catch (err: unknown) {
      console.error('Sweep execution failed:', err);
      setSweepStep('error');
      setErrorMessage(parseMetaMaskError(err));
    }
  };

  const handleReset = () => {
    setSweepResult(null);
    setSweepStep('idle');
    setStepMessage('');
    setErrorMessage(null);
    loadBalances();
  };

  const isChainMismatch = signerAddress && walletChainId !== null && walletChainId !== selectedChainId;
  const isExecuting = sweepStep !== 'idle' && sweepStep !== 'success' && sweepStep !== 'error';
  const isValidSmartAccount = isAddress(smartAccountAddress);
  const targetRecipient = signerAddress || recipientAddress;
  const isValidRecipient = Boolean(targetRecipient && isAddress(targetRecipient));
  const isValidAmount = parseFloat(amount) > 0;

  return (
    <div className="app-container">
      <Header />

      <main className="recovery-card">
        {/* Network Selector Bar */}
        <div className="network-bar">
          <div className="network-bar-header">
            <span className="network-bar-label">
              <Globe size={14} /> Recovery Network
            </span>
          </div>
          <div className="network-pills-row">
            {SUPPORTED_NETWORKS.map((net) => {
              const isSelected = selectedChainId === net.id;
              return (
                <button
                  key={net.id}
                  type="button"
                  onClick={() => handleSelectChainId(net.id)}
                  className={`network-pill ${isSelected ? 'active' : ''}`}
                >
                  {net.isTestnet && <span className="testnet-dot" />}
                  <span>{net.shortName}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Two-Column Setup & Action Grid */}
        <div className="recovery-grid">
          {/* Column 1: Account Architecture & Recovery Signer */}
          <div className="section-panel">
            <div className="section-panel-header">
              <h2 className="section-panel-title">
                <Wallet size={16} color="#783fe4" />
                Account & Signer
              </h2>
            </div>

            {/* Smart Account Address (Injected from URL / Recovery Link) */}
            <div className="field-group">
              <label className="field-label" htmlFor="smart-account-input">
                <span>Smart Account (Kernel v3.3)</span>
              </label>
              <div className="input-row">
                <input
                  id="smart-account-input"
                  type="text"
                  value={smartAccountAddress}
                  disabled
                  placeholder="0x... (Injected via recovery link)"
                  className="text-input mono"
                />
                {smartAccountAddress && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopy(smartAccountAddress, 'smartAccount')}
                      className="input-action-btn"
                      title="Copy Address"
                    >
                      {copiedId === 'smartAccount' ? <Check size={14} color="#047857" /> : <Copy size={14} />}
                    </button>
                    <a
                      href={`${currentNetwork.explorerUrl}/address/${smartAccountAddress}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="input-action-btn"
                      title="View on Explorer"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </>
                )}
              </div>
              {!isValidSmartAccount && smartAccountAddress && (
                <span style={{ fontSize: 11, color: '#b91c1c' }}>Invalid EVM hex address in link</span>
              )}
              {!smartAccountAddress && (
                <span style={{ fontSize: 11, color: '#667085' }}>
                  Smart account address is injected automatically via recovery link or <code>?account=0x...</code>
                </span>
              )}
            </div>

            {/* Available Balances */}
            <div className="balances-box">
              <div className="balance-item">
                <span className="balance-label">USDC Balance</span>
                <span className="balance-val">
                  {balances ? `${balances.usdc} USDC` : '—'}
                </span>
              </div>
              <div className="balance-item">
                <span className="balance-label">Native Gas</span>
                <span className="balance-val">
                  {balances ? `${parseFloat(balances.native).toFixed(4)} ${currentNetwork.nativeCurrency.symbol}` : '—'}
                </span>
              </div>
              <button
                type="button"
                onClick={loadBalances}
                disabled={isLoadingBalances}
                className="balance-refresh-btn"
                title="Refresh balances"
              >
                <RefreshCw size={14} className={isLoadingBalances ? 'spin' : ''} />
              </button>
            </div>

            {/* Recovery Signer Connection */}
            <div className="field-group">
              <label className="field-label">
                <span>Emergency Signer (External Wallet)</span>
              </label>

              {!signerAddress ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    type="button"
                    onClick={handleConnectWallet}
                    disabled={isConnectingWallet}
                    className="btn-primary"
                    style={{ width: '100%' }}
                  >
                    <Wallet size={15} />
                    <span>{isConnectingWallet ? 'Connecting...' : 'Connect Recovery Wallet (Safe / MetaMask)'}</span>
                  </button>
                  <p style={{ fontSize: 11, color: '#667085', margin: 0 }}>
                    Connect the authorized backup signer address registered on your smart account.
                  </p>
                </div>
              ) : (
                <div className="signer-box">
                  <div className="signer-status-row">
                    <span className="status-badge-connected">
                      <CheckCircle2 size={12} /> Connected
                    </span>
                    <button
                      type="button"
                      onClick={handleDisconnectWallet}
                      className="btn-link"
                      style={{ color: '#b91c1c', fontSize: 11 }}
                    >
                      Disconnect
                    </button>
                  </div>
                  <div className="signer-address-text">{signerAddress}</div>

                  {isChainMismatch && (
                    <div className="alert-box alert-warning">
                      <span>
                        Wallet is on Chain ID <code>{walletChainId}</code>, but {currentNetwork.name} is selected.
                      </span>
                      <button
                        type="button"
                        onClick={handleSwitchChain}
                        className="btn-outline"
                        style={{ marginTop: 4, alignSelf: 'flex-start', padding: '4px 8px', fontSize: 11 }}
                      >
                        <RefreshCw size={12} />
                        <span>Switch Wallet to {currentNetwork.name}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Execute Recovery Sweep */}
          <div className="section-panel">
            <div className="section-panel-header">
              <h2 className="section-panel-title">
                <ArrowUpRight size={16} color="#047857" />
                Sweep Treasury Funds
              </h2>
            </div>

            {/* Asset Selection */}
            <div className="field-group">
              <label className="field-label">Asset to Sweep</label>
              <div className="asset-toggle-group">
                <button
                  type="button"
                  onClick={() => setAssetType('USDC')}
                  className={`asset-toggle-btn ${assetType === 'USDC' ? 'active' : ''}`}
                >
                  USDC
                </button>
                <button
                  type="button"
                  onClick={() => setAssetType('NATIVE')}
                  className={`asset-toggle-btn ${assetType === 'NATIVE' ? 'active' : ''}`}
                >
                  Native ({currentNetwork.nativeCurrency.symbol})
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="field-group">
              <div className="field-label">
                <span>Amount</span>
                <button type="button" onClick={handleMaxAmount} className="btn-link">
                  Sweep Max
                </button>
              </div>
              <div className="input-row">
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="text-input"
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#667085', paddingRight: 4 }}>
                  {assetType === 'USDC' ? 'USDC' : currentNetwork.nativeCurrency.symbol}
                </span>
              </div>
            </div>

            {/* Destination Recipient */}
            <div className="field-group">
              <label className="field-label">Destination Recipient</label>
              <div className="input-row">
                <input
                  type="text"
                  value={signerAddress || recipientAddress}
                  disabled
                  placeholder="0x... (Defaults to connected wallet)"
                  className="text-input mono"
                />
              </div>
            </div>

            {gasMode === 'native' && balances && balances.nativeRaw === 0n && (
              <div className="alert-box alert-warning">
                <span>
                  Smart account has <strong>0.00 {currentNetwork.nativeCurrency.symbol}</strong> for gas.
                  Switch to <strong>ZeroDev Paymaster</strong> in Advanced Configuration below for sponsored gasless recovery.
                </span>
              </div>
            )}

            {/* Execution / Result Feedback */}
            {isExecuting && (
              <div className="status-executing-box">
                <Loader2 size={18} className="spin" />
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontWeight: 600, fontSize: 12 }}>
                    {sweepStep === 'validating' && '1/5. Validating parameters...'}
                    {sweepStep === 'instantiating' && '2/5. Preparing Kernel account...'}
                    {sweepStep === 'requesting_signature' && '3/5. Requesting signature in wallet...'}
                    {sweepStep === 'submitting_userop' && '4/5. Submitting UserOp to bundler...'}
                    {sweepStep === 'confirming_onchain' && '5/5. Waiting for block confirmation...'}
                  </span>
                  <span style={{ fontSize: 11, opacity: 0.9 }}>{stepMessage}</span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="alert-box alert-error">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <AlertTriangle size={15} /> {errorMessage.title}
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.45, marginTop: 4 }}>{errorMessage.message}</div>
                {errorMessage.details && (
                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      fontFamily: 'monospace',
                      background: 'rgba(185, 28, 28, 0.08)',
                      padding: '6px 8px',
                      borderRadius: 4,
                      border: '1px solid rgba(185, 28, 28, 0.15)',
                      wordBreak: 'break-word',
                    }}
                  >
                    <span style={{ fontWeight: 600, opacity: 0.85 }}>Provider detail: </span>
                    {errorMessage.details}
                  </div>
                )}
              </div>
            )}

            {sweepResult && (
              <div className="alert-box alert-success">
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> Recovery Sweep Succeeded!
                </div>
                <span>
                  Transferred {sweepResult.amount} {sweepResult.asset} to {sweepResult.recipient.slice(0, 8)}...{sweepResult.recipient.slice(-6)}.
                </span>
                <a
                  href={sweepResult.explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    color: '#047857',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    marginTop: 4,
                  }}
                >
                  <span>View on Explorer</span>
                  <ExternalLink size={12} />
                </a>
                <button
                  type="button"
                  onClick={handleReset}
                  className="btn-outline"
                  style={{ marginTop: 8, alignSelf: 'flex-start', padding: '4px 10px', fontSize: 11 }}
                >
                  Sweep Another
                </button>
              </div>
            )}

            {/* Sweep Button */}
            {!sweepResult && (
              <button
                type="button"
                onClick={handleExecuteSweep}
                disabled={!signerAddress || !isValidSmartAccount || !isValidRecipient || !isValidAmount || isExecuting}
                className="btn-sweep"
              >
                {isExecuting ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    <span>Processing Recovery...</span>
                  </>
                ) : !isValidSmartAccount ? (
                  <span>Provide Smart Account in Recovery Link</span>
                ) : !signerAddress ? (
                  <span>Connect Recovery Wallet to Sweep</span>
                ) : !isValidAmount ? (
                  <span>Enter Amount to Sweep</span>
                ) : (
                  <>
                    <ArrowUpRight size={16} />
                    <span>Sign & Sweep {amount} {assetType === 'USDC' ? 'USDC' : currentNetwork.nativeCurrency.symbol}</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Subtle Advanced Settings Accordion */}
      <details className="advanced-details">
        <summary className="advanced-summary">
          <Settings2 size={15} />
          <span>Advanced Configuration (Custom RPC & Bundler)</span>
        </summary>
        <div className="advanced-content">
          <div className="advanced-grid">
            <div className="field-group">
              <label className="field-label">Custom RPC URL</label>
              <div className="input-row">
                <input
                  type="text"
                  value={rpcUrl}
                  onChange={(e) => setRpcUrl(e.target.value.trim())}
                  placeholder={currentNetwork.rpcUrl}
                  className="text-input mono"
                />
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">ERC-4337 Bundler URL</label>
              <div className="input-row">
                <input
                  type="text"
                  value={bundlerUrl}
                  disabled
                  placeholder="https://rpc.zerodev.app/api/v3/.../chain/..."
                  className="text-input mono"
                />
              </div>
            </div>
          </div>

          <div className="field-group" style={{ marginTop: 12 }}>
            <label className="field-label">ZeroDev Project ID (Bundler & Paymaster)</label>
            <div className="input-row">
              <input
                type="text"
                placeholder="Enter ZeroDev Project ID..."
                value={zerodevProjectId}
                disabled
                className="text-input mono"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap', marginTop: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: '#344054' }}>Gas Strategy:</span>
            <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="gasMode"
                checked={gasMode === 'paymaster'}
                onChange={() => handleGasModeChange('paymaster')}
              />
              ZeroDev Paymaster (Gasless)
            </label>
            <label style={{ fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              <input
                type="radio"
                name="gasMode"
                checked={gasMode === 'native'}
                onChange={() => handleGasModeChange('native')}
              />
              Self-Funded Native Gas
            </label>
          </div>
        </div>
      </details>

      {/* Clean Footer */}
      <footer className="footer">
        <p>Orki Smart Account Disaster Recovery Vault • Built for Kernel v3.3 & ERC-4337</p>
        <p style={{ opacity: 0.7 }}>Canonical EntryPoint: <code>{ENTRY_POINT_0_7}</code></p>
      </footer>
    </div>
  );
}

export default App;
