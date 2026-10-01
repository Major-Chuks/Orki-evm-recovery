import React, { useState } from 'react';
import { isAddress } from 'viem';
import { CheckCircle, ExternalLink, Loader2, Send, AlertTriangle } from 'lucide-react';
import type { AccountBalances, AssetType, NetworkConfig, SweepResult, SweepStep } from '../types';

interface StepExecutionSweepProps {
  assetType: AssetType;
  onChangeAssetType: (type: AssetType) => void;
  amount: string;
  onChangeAmount: (amt: string) => void;
  recipientAddress: string;
  onChangeRecipient: (addr: string) => void;
  customTokenAddress: string;
  onChangeCustomToken: (addr: string) => void;
  balances: AccountBalances | null;
  signerAddress: string | null;
  network: NetworkConfig;
  sweepStep: SweepStep;
  stepMessage: string;
  sweepResult: SweepResult | null;
  errorMessage: string | null;
  onExecuteSweep: () => void;
  onReset: () => void;
}

export const StepExecutionSweep: React.FC<StepExecutionSweepProps> = ({
  assetType,
  onChangeAssetType,
  amount,
  onChangeAmount,
  recipientAddress,
  onChangeRecipient,
  customTokenAddress,
  onChangeCustomToken,
  balances,
  signerAddress,
  network,
  sweepStep,
  stepMessage,
  sweepResult,
  errorMessage,
  onExecuteSweep,
  onReset,
}) => {
  const [useSignerAsRecipient, setUseSignerAsRecipient] = useState(true);

  const isValidRecipient = isAddress(recipientAddress);
  const isValidAmount = parseFloat(amount) > 0;
  const isExecuting = sweepStep !== 'idle' && sweepStep !== 'success' && sweepStep !== 'error';

  const handleMaxAmount = () => {
    if (!balances) return;
    if (assetType === 'USDC') {
      onChangeAmount(balances.usdc);
    } else if (assetType === 'NATIVE') {
      const num = parseFloat(balances.native);
      // Leave small buffer for native gas if native sweep
      const maxVal = Math.max(0, num - 0.0002);
      onChangeAmount(maxVal.toFixed(5));
    } else if (assetType === 'CUSTOM' && balances.custom) {
      onChangeAmount(balances.custom);
    }
  };

  const handleRecipientToggle = (useSigner: boolean) => {
    setUseSignerAsRecipient(useSigner);
    if (useSigner && signerAddress) {
      onChangeRecipient(signerAddress);
    } else if (!useSigner) {
      onChangeRecipient('');
    }
  };

  if (sweepResult) {
    return (
      <div className="card card-success-view">
        <div className="success-icon-wrapper">
          <CheckCircle size={48} className="text-emerald" />
        </div>
        <h2 className="success-title">Emergency Recovery Sweep Complete!</h2>
        <p className="success-desc">
          Your funds have been successfully withdrawn from the Orki Smart Account to your safe destination.
        </p>

        <div className="success-details-card">
          <div className="success-row">
            <span className="success-label">Amount Recovered:</span>
            <span className="success-value-highlight">
              {sweepResult.amount} {sweepResult.asset}
            </span>
          </div>
          <div className="success-row">
            <span className="success-label">Recipient Address:</span>
            <code className="success-value-code">{sweepResult.recipient}</code>
          </div>
          <div className="success-row">
            <span className="success-label">Transaction Hash:</span>
            <a
              href={sweepResult.explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="success-link"
            >
              <span>{sweepResult.txHash.slice(0, 16)}...{sweepResult.txHash.slice(-10)}</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>

        <button type="button" onClick={onReset} className="btn btn-primary" style={{ marginTop: 20 }}>
          Sweep Another Asset
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <div className="step-badge">4</div>
        <div>
          <h2 className="card-title">Execute Emergency Withdrawal</h2>
          <p className="card-desc">Sign and submit the ERC-4337 UserOperation to sweep assets into your recovery wallet</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Asset to Withdraw</label>
        <div className="asset-selector-grid">
          <button
            type="button"
            onClick={() => {
              onChangeAssetType('USDC');
              onChangeAmount('');
            }}
            className={`asset-btn ${assetType === 'USDC' ? 'active' : ''}`}
          >
            <strong>USDC</strong>
            <span className="asset-balance-hint">
              Balance: {balances ? balances.usdc : '—'} USDC
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeAssetType('NATIVE');
              onChangeAmount('');
            }}
            className={`asset-btn ${assetType === 'NATIVE' ? 'active' : ''}`}
          >
            <strong>Native {network.nativeCurrency.symbol}</strong>
            <span className="asset-balance-hint">
              Balance: {balances ? parseFloat(balances.native).toFixed(5) : '—'} {network.nativeCurrency.symbol}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onChangeAssetType('CUSTOM');
              onChangeAmount('');
            }}
            className={`asset-btn ${assetType === 'CUSTOM' ? 'active' : ''}`}
          >
            <strong>Custom ERC-20</strong>
            <span className="asset-balance-hint">Any standard token</span>
          </button>
        </div>
      </div>

      {assetType === 'CUSTOM' && (
        <div className="form-group" style={{ marginTop: 14 }}>
          <label className="form-label">Custom ERC-20 Token Address</label>
          <input
            type="text"
            value={customTokenAddress}
            onChange={(e) => onChangeCustomToken(e.target.value.trim())}
            placeholder="0x..."
            className="input-field"
          />
        </div>
      )}

      <div className="form-group" style={{ marginTop: 18 }}>
        <div className="label-with-action">
          <label className="form-label">Amount to Sweep</label>
          <button type="button" onClick={handleMaxAmount} className="btn-text-action">
            Sweep Max
          </button>
        </div>
        <div className="input-wrapper">
          <input
            type="number"
            value={amount}
            onChange={(e) => onChangeAmount(e.target.value)}
            placeholder="0.00"
            className="input-field"
            min="0"
            step="any"
          />
          <span className="input-asset-tag">
            {assetType === 'USDC'
              ? 'USDC'
              : assetType === 'NATIVE'
              ? network.nativeCurrency.symbol
              : 'TOKENS'}
          </span>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 18 }}>
        <label className="form-label">Destination Recipient Address</label>
        <div className="recipient-toggle-row">
          <button
            type="button"
            onClick={() => handleRecipientToggle(true)}
            className={`toggle-pill ${useSignerAsRecipient ? 'active' : ''}`}
          >
            Connected Recovery Wallet
          </button>
          <button
            type="button"
            onClick={() => handleRecipientToggle(false)}
            className={`toggle-pill ${!useSignerAsRecipient ? 'active' : ''}`}
          >
            Custom Address (Safe, Cold Storage, etc.)
          </button>
        </div>

        <input
          type="text"
          value={recipientAddress}
          onChange={(e) => {
            setUseSignerAsRecipient(false);
            onChangeRecipient(e.target.value.trim());
          }}
          placeholder="0x..."
          className={`input-field ${recipientAddress && !isValidRecipient ? 'input-error' : ''}`}
        />
        {recipientAddress && !isValidRecipient && (
          <span className="field-hint text-red">Please enter a valid destination EVM address</span>
        )}
      </div>

      {isExecuting && (
        <div className="execution-status-panel">
          <div className="status-spinner-row">
            <Loader2 className="spin text-cyan" size={22} />
            <div className="status-text-col">
              <span className="status-step-title">
                {sweepStep === 'validating' && '1/5. Validating parameters...'}
                {sweepStep === 'instantiating' && '2/5. Preparing Kernel v3.3 account...'}
                {sweepStep === 'requesting_signature' && '3/5. Requesting signature in wallet...'}
                {sweepStep === 'submitting_userop' && '4/5. Submitting UserOp to bundler...'}
                {sweepStep === 'confirming_onchain' && '5/5. Waiting for block confirmation...'}
              </span>
              <span className="status-step-desc">{stepMessage}</span>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="callout callout-error" style={{ marginTop: 16 }}>
          <div className="callout-header">
            <AlertTriangle size={18} className="text-red" />
            <strong>Recovery Execution Error</strong>
          </div>
          <p className="error-text">{errorMessage}</p>
        </div>
      )}

      <div className="sweep-action-row" style={{ marginTop: 24 }}>
        <button
          type="button"
          onClick={onExecuteSweep}
          disabled={!isValidRecipient || !isValidAmount || isExecuting || !signerAddress}
          className="btn btn-primary btn-large btn-sweep"
        >
          {isExecuting ? (
            <>
              <Loader2 className="spin" size={18} />
              <span>Executing Emergency Sweep...</span>
            </>
          ) : (
            <>
              <Send size={18} />
              <span>Sign & Sweep Funds ({amount || '0'} {assetType === 'USDC' ? 'USDC' : network.nativeCurrency.symbol})</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
