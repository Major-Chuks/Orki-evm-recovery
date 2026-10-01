import React from 'react';
import { Wallet, CheckCircle, RefreshCw, AlertTriangle } from 'lucide-react';
import type { Address } from 'viem';

interface StepSignerConnectionProps {
  signerAddress: Address | null;
  onConnectWallet: () => void;
  onDisconnectWallet: () => void;
  selectedChainId: number;
  walletChainId: number | null;
  onSwitchChain: () => void;
  isConnecting: boolean;
  networkName: string;
}

export const StepSignerConnection: React.FC<StepSignerConnectionProps> = ({
  signerAddress,
  onConnectWallet,
  onDisconnectWallet,
  selectedChainId,
  walletChainId,
  onSwitchChain,
  isConnecting,
  networkName,
}) => {
  const isChainMismatch = signerAddress && walletChainId !== null && walletChainId !== selectedChainId;

  return (
    <div className="card">
      <div className="card-header">
        <div className="step-badge">2</div>
        <div>
          <h2 className="card-title">Recovery Signer Connection</h2>
          <p className="card-desc">Connect the external wallet (MetaMask, Safe, Rabby) registered as your backup signer</p>
        </div>
      </div>

      {!signerAddress ? (
        <div className="connect-wallet-prompt">
          <p className="prompt-text">
            To authorize an emergency withdrawal, connect the external address registered as an ECDSA validator on your smart account.
          </p>
          <button
            type="button"
            onClick={onConnectWallet}
            disabled={isConnecting}
            className="btn btn-primary btn-large"
          >
            <Wallet size={18} />
            <span>{isConnecting ? 'Connecting Wallet...' : 'Connect Recovery Wallet'}</span>
          </button>
        </div>
      ) : (
        <div className="connected-wallet-box">
          <div className="signer-status-row">
            <div className="signer-info">
              <span className="badge badge-success">
                <CheckCircle size={14} style={{ marginRight: 4 }} />
                RECOVERY SIGNER CONNECTED
              </span>
              <div className="signer-address-display">
                <code>{signerAddress}</code>
              </div>
            </div>
            <button
              type="button"
              onClick={onDisconnectWallet}
              className="btn btn-secondary btn-sm"
            >
              Disconnect
            </button>
          </div>

          {isChainMismatch && (
            <div className="callout callout-warning" style={{ marginTop: 16 }}>
              <div className="callout-header">
                <AlertTriangle size={18} className="text-amber" />
                <span>Wallet Network Mismatch</span>
              </div>
              <p>
                Your connected wallet is on chain ID <code>{walletChainId}</code>, but you have selected 
                <strong> {networkName}</strong> (Chain ID: <code>{selectedChainId}</code>).
              </p>
              <button
                type="button"
                onClick={onSwitchChain}
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 8 }}
              >
                <RefreshCw size={14} />
                <span>Switch Wallet to {networkName}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
