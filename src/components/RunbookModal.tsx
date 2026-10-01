import React from 'react';
import { X, ShieldCheck, AlertTriangle, HelpCircle, Key, Fuel } from 'lucide-react';
import { ENTRY_POINT_0_7, ECDSA_VALIDATOR_V3_3 } from '../constants/networks';

interface RunbookModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RunbookModal: React.FC<RunbookModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-runbook" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title-row">
            <ShieldCheck className="text-emerald" size={24} />
            <h2>Offline Disaster Recovery Runbook</h2>
          </div>
          <button type="button" onClick={onClose} className="btn-close">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body runbook-body">
          <div className="runbook-section">
            <h3><Key size={18} className="text-cyan" /> 1. How This Standalone Tool Works</h3>
            <p>
              Your Orki merchant wallet is an ERC-7579 smart account built on <strong>Kernel v3.3</strong>.
              During setup, your external wallet (MetaMask, Safe, etc.) was registered on-chain as a secondary 
              <strong>ECDSA Validator Plugin</strong>.
            </p>
            <p>
              Because the validator contract is permanently deployed on the blockchain, you can sweep your funds 
              <strong> even if Orki's website, servers, API, and company completely disappear.</strong>
            </p>
          </div>

          <div className="runbook-section">
            <h3><Fuel size={18} className="text-emerald" /> 2. Gas Funding: The ~$0.10 Native Gas Rule</h3>
            <div className="callout callout-info">
              <p>
                In normal conditions, Orki's paymaster sponsors transaction fees. However, in a disaster scenario where 
                third-party paymasters are offline, ERC-4337 bundlers require native gas to execute the withdrawal.
              </p>
              <ul className="runbook-list">
                <li>
                  <strong>What you need:</strong> Send <strong>~$0.10 in native token</strong> (ETH on Base/Sepolia, POL on Polygon) 
                  directly to your Smart Account address.
                </li>
                <li>
                  <strong>Why:</strong> The canonical EntryPoint will deduct gas directly from your Smart Account balance, allowing 
                  100% permissionless execution with zero third-party dependency.
                </li>
              </ul>
            </div>
          </div>

          <div className="runbook-section">
            <h3><AlertTriangle size={18} className="text-amber" /> 3. Why Block Explorers Revert (InvalidCaller)</h3>
            <p>
              If you try to call <code>execute(...)</code> directly on BaseScan/Etherscan from your external wallet, the transaction 
              reverts with <code>0x48f5c3ed (InvalidCaller)</code>. This is because Kernel v3.3 enforces the 
              <code>onlyEntryPointOrSelf</code> security modifier.
            </p>
            <p>
              Transactions must be submitted as an <strong>ERC-4337 UserOperation</strong> to the canonical EntryPoint, 
              which this tool packages and signs automatically.
            </p>
          </div>

          <div className="runbook-section">
            <h3><HelpCircle size={18} className="text-purple" /> 4. Canonical Contract Addresses</h3>
            <table className="runbook-table">
              <tbody>
                <tr>
                  <td><strong>Canonical EntryPoint v0.7:</strong></td>
                  <td><code>{ENTRY_POINT_0_7}</code></td>
                </tr>
                <tr>
                  <td><strong>ZeroDev ECDSA Validator:</strong></td>
                  <td><code>{ECDSA_VALIDATOR_V3_3}</code></td>
                </tr>
                <tr>
                  <td><strong>Account Architecture:</strong></td>
                  <td>ZeroDev Kernel v3.3 (ERC-7579 / ERC-4337)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn btn-primary" style={{ width: '100%' }}>
            Got it, close runbook
          </button>
        </div>
      </div>
    </div>
  );
};
