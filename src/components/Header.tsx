import React from 'react';
import { ShieldAlert, BookOpen, Download, HardDrive } from 'lucide-react';

interface HeaderProps {
  onOpenRunbook: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenRunbook }) => {
  const handleSavePage = () => {
    const htmlContent = document.documentElement.outerHTML;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'orki-disaster-recovery.html';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <header className="header">
      <div className="header-brand">
        <div className="shield-icon-wrapper">
          <ShieldAlert className="shield-icon" size={28} />
          <span className="pulse-dot" />
        </div>
        <div>
          <div className="brand-title-row">
            <h1 className="brand-title">ORKI VAULT</h1>
            <span className="badge badge-emergency">DISASTER RECOVERY</span>
            <span className="badge badge-offline">
              <HardDrive size={12} style={{ marginRight: 4 }} />
              STANDALONE HTML
            </span>
          </div>
          <p className="brand-subtitle">
            Non-custodial smart account fund recovery client for Kernel v3.3 (ERC-7579 / ERC-4337)
          </p>
        </div>
      </div>

      <div className="header-actions">
        <button type="button" onClick={onOpenRunbook} className="btn btn-secondary">
          <BookOpen size={16} />
          <span>Disaster Runbook</span>
        </button>
        <button type="button" onClick={handleSavePage} className="btn btn-primary">
          <Download size={16} />
          <span>Save HTML Offline</span>
        </button>
      </div>
    </header>
  );
};
