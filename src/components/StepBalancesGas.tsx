import React from 'react';
import { Coins, Flame, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import type { AccountBalances, GasMode, NetworkConfig } from '../types';

interface StepBalancesGasProps {
  balances: AccountBalances | null;
  isLoadingBalances: boolean;
  onRefreshBalances: () => void;
  gasMode: GasMode;
  onChangeGasMode: (mode: GasMode) => void;
  network: NetworkConfig;
  smartAccountAddress: string;
}

export const StepBalancesGas: React.FC<StepBalancesGasProps> = ({
  balances,
  isLoadingBalances,
  onRefreshBalances,
  gasMode,
  onChangeGasMode,
  network,
  smartAccountAddress,
}) => {
  const nativeBal = balances ? parseFloat(balances.native) : 0;
  const isZeroNativeGas = nativeBal === 0;

  return (
    <div className="card">
      <div className="card-header">
        <div className="step-badge">3</div>
        <div style={{ flex: 1 }}>
          <div className="title-with-refresh">
            <h2 className="card-title">Balances & Gas Strategy</h2>
            <button
              type="button"
              onClick={onRefreshBalances}
              disabled={isLoadingBalances}
              className="btn-refresh"
              title="Refresh balances"
            >
              <RefreshCw size={14} className={isLoadingBalances ? 'spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>
          <p className="card-desc">Review available funds on {network.name} and configure bundler gas execution</p>
        </div>
      </div>

      <div className="balance-grid">
        <div className="balance-card">
          <div className="balance-card-header">
            <span className="balance-asset-label">USDC Balance</span>
            <Coins size={18} className="text-cyan" />
          </div>
          <div className="balance-amount-display">
            <span className="balance-number">{balances ? balances.usdc : '—'}</span>
            <span className="balance-unit">USDC</span>
          </div>
          <span className="balance-note">Available for emergency withdrawal</span>
        </div>

        <div className="balance-card">
          <div className="balance-card-header">
            <span className="balance-asset-label">Native Gas Balance</span>
            <Flame size={18} className="text-amber" />
          </div>
          <div className="balance-amount-display">
            <span className="balance-number">
              {balances ? parseFloat(balances.native).toFixed(5) : '—'}
            </span>
            <span className="balance-unit">{network.nativeCurrency.symbol}</span>
          </div>
          <span className="balance-note">Used for native ERC-4337 bundler gas</span>
        </div>
      </div>

      <div className="gas-strategy-section">
        <label className="form-label" style={{ marginBottom: 10 }}>
          ERC-4337 Gas Payment Method
        </label>

        <div className="gas-options-grid">
          <div
            className={`gas-option-card ${gasMode === 'native' ? 'selected' : ''}`}
            onClick={() => onChangeGasMode('native')}
          >
            <div className="gas-option-radio">
              <span className="radio-circle">{gasMode === 'native' && <span className="radio-dot" />}</span>
              <div>
                <strong>Self-Funded Native Gas (Disaster Mode)</strong>
                <span className="gas-option-pill">100% Permissionless</span>
              </div>
            </div>
            <p className="gas-option-desc">
              The Smart Account pays the bundler directly from its own native {network.nativeCurrency.symbol} balance.
              Zero reliance on Orki or any third-party paymaster service.
            </p>
          </div>

          <div
            className={`gas-option-card ${gasMode === 'paymaster' ? 'selected' : ''}`}
            onClick={() => onChangeGasMode('paymaster')}
          >
            <div className="gas-option-radio">
              <span className="radio-circle">{gasMode === 'paymaster' && <span className="radio-dot" />}</span>
              <div>
                <strong>ZeroDev / Sponsored Paymaster</strong>
                <span className="gas-option-pill pill-secondary">Convenience Mode</span>
              </div>
            </div>
            <p className="gas-option-desc">
              Requests gas fee sponsorship from the configured Paymaster RPC endpoint (e.g. ZeroDev).
            </p>
          </div>
        </div>

        {gasMode === 'native' && isZeroNativeGas && smartAccountAddress && (
          <div className="callout callout-warning" style={{ marginTop: 14 }}>
            <div className="callout-header">
              <AlertCircle size={18} className="text-amber" />
              <strong>Gas Deposit Recommended for Native Mode</strong>
            </div>
            <p>
              Your Smart Account holds <strong>0 {network.nativeCurrency.symbol}</strong>. In Native Gas mode, 
              the canonical EntryPoint deducts gas fees from the smart account.
            </p>
            <div className="deposit-instruction-box">
              <span>To execute without a paymaster, send <strong>~$0.10 in {network.nativeCurrency.symbol}</strong> to:</span>
              <code className="deposit-address">{smartAccountAddress}</code>
            </div>
          </div>
        )}

        {gasMode === 'native' && !isZeroNativeGas && (
          <div className="callout callout-success" style={{ marginTop: 14 }}>
            <div className="callout-header">
              <CheckCircle2 size={18} className="text-emerald" />
              <strong>Sufficient Native Gas Available</strong>
            </div>
            <p>
              Your smart account has {balances?.native} {network.nativeCurrency.symbol}. It can execute the withdrawal 
              without any external paymaster dependency!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
