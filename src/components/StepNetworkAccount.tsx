import React, { useState } from 'react';
import { isAddress } from 'viem';
import { Globe, Settings2, CheckCircle2, AlertCircle } from 'lucide-react';
import { SUPPORTED_NETWORKS } from '../constants/networks';
import type { NetworkConfig } from '../types';

interface StepNetworkAccountProps {
  selectedChainId: number;
  onSelectChainId: (chainId: number) => void;
  smartAccountAddress: string;
  onChangeSmartAccount: (address: string) => void;
  rpcUrl: string;
  onChangeRpcUrl: (url: string) => void;
  bundlerUrl: string;
  onChangeBundlerUrl: (url: string) => void;
  currentNetwork: NetworkConfig;
}

export const StepNetworkAccount: React.FC<StepNetworkAccountProps> = ({
  selectedChainId,
  onSelectChainId,
  smartAccountAddress,
  onChangeSmartAccount,
  rpcUrl,
  onChangeRpcUrl,
  bundlerUrl,
  onChangeBundlerUrl,
  currentNetwork,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isValidAddr = isAddress(smartAccountAddress);

  const mainnets = SUPPORTED_NETWORKS.filter((n) => !n.isTestnet);
  const testnets = SUPPORTED_NETWORKS.filter((n) => n.isTestnet);

  return (
    <div className="card">
      <div className="card-header">
        <div className="step-badge">1</div>
        <div>
          <h2 className="card-title">Network & Smart Account Configuration</h2>
          <p className="card-desc">Select the target blockchain and enter your Orki Smart Account address</p>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">
          <Globe size={16} /> Select Network
        </label>
        
        <div className="network-section-label">PRODUCTION NETWORKS</div>
        <div className="network-grid">
          {mainnets.map((net) => (
            <button
              key={net.id}
              type="button"
              onClick={() => onSelectChainId(net.id)}
              className={`network-btn ${selectedChainId === net.id ? 'active' : ''}`}
            >
              <span className="network-name">{net.name}</span>
              <span className="network-chain-id">Chain ID: {net.id}</span>
            </button>
          ))}
        </div>

        <div className="network-section-label" style={{ marginTop: 12 }}>SANDBOX TESTNETS</div>
        <div className="network-grid">
          {testnets.map((net) => (
            <button
              key={net.id}
              type="button"
              onClick={() => onSelectChainId(net.id)}
              className={`network-btn ${selectedChainId === net.id ? 'active' : ''}`}
            >
              <span className="network-name">{net.name}</span>
              <span className="network-chain-id">Chain ID: {net.id}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="form-group" style={{ marginTop: 20 }}>
        <div className="label-with-action">
          <label className="form-label" htmlFor="smart-account-input">
            Orki Smart Account Address (Kernel v3.3)
          </label>
          {typeof navigator !== 'undefined' && navigator.clipboard && (
            <button
              type="button"
              onClick={async () => {
                const text = await navigator.clipboard.readText();
                if (text) onChangeSmartAccount(text.trim());
              }}
              className="btn-text-action"
            >
              Paste from clipboard
            </button>
          )}
        </div>
        <div className="input-wrapper">
          <input
            id="smart-account-input"
            type="text"
            value={smartAccountAddress}
            onChange={(e) => onChangeSmartAccount(e.target.value.trim())}
            placeholder="0x..."
            className={`input-field ${smartAccountAddress && !isValidAddr ? 'input-error' : ''}`}
          />
          {smartAccountAddress && (
            <span className="input-status-icon">
              {isValidAddr ? (
                <CheckCircle2 size={18} className="text-emerald" />
              ) : (
                <AlertCircle size={18} className="text-red" />
              )}
            </span>
          )}
        </div>
        {smartAccountAddress && !isValidAddr && (
          <span className="field-hint text-red">Please enter a valid 42-character EVM hex address</span>
        )}
      </div>

      <div className="advanced-toggle-row">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="btn-toggle-advanced"
        >
          <Settings2 size={15} />
          <span>{showAdvanced ? 'Hide Custom RPC & Bundler' : 'Customize RPC & ERC-4337 Bundler'}</span>
        </button>
      </div>

      {showAdvanced && (
        <div className="advanced-panel">
          <div className="form-group">
            <label className="form-label">Blockchain RPC URL</label>
            <input
              type="text"
              value={rpcUrl}
              onChange={(e) => onChangeRpcUrl(e.target.value.trim())}
              className="input-field"
            />
            <span className="field-hint">Public JSON-RPC endpoint used to query on-chain state and balances.</span>
          </div>

          <div className="form-group" style={{ marginTop: 12 }}>
            <label className="form-label">ERC-4337 Bundler URL</label>
            <input
              type="text"
              value={bundlerUrl}
              onChange={(e) => onChangeBundlerUrl(e.target.value.trim())}
              className="input-field"
            />
            <span className="field-hint">
              Endpoint for submitting UserOperations (Pimlico, ZeroDev, Biconomy, or local Alto/Reth bundler).
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              onChangeRpcUrl(currentNetwork.rpcUrl);
              onChangeBundlerUrl(currentNetwork.defaultBundlerUrl);
            }}
            className="btn-reset-endpoints"
          >
            Reset to network defaults
          </button>
        </div>
      )}
    </div>
  );
};
