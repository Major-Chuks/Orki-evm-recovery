import React from 'react';
import { ShieldCheck } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="shield-icon-badge">
          <ShieldCheck size={24} />
        </div>
        <div className="header-text">
          <div className="title-row">
            <h1 className="brand-title">EVM Emergency Recovery</h1>
            <span className="security-tag">Kernel v3.3</span>
          </div>
          <p className="brand-subtitle">
            Sovereign treasury recovery. Sweep your Smart Account funds directly on-chain to your corporate wallet without backend dependencies.
          </p>
        </div>
      </div>
    </header>
  );
};
