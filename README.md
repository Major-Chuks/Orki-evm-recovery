# Orki Emergency Wallet Recovery Vault (Standalone Offline Client)

A standalone, non-custodial disaster recovery application for **Orki Smart Accounts** built on **Kernel v3.3 (ERC-7579 / ERC-4337)**.

---

## 🛡️ Non-Custodial Security & Zero-Dependency Guarantee

Your Orki merchant wallet is a smart contract on EVM blockchains (Base, Polygon, Arbitrum, Optimism, Ethereum).
When you register an **Emergency Recovery Signer** (e.g. MetaMask, Rabby, Coinbase Wallet, Safe), an on-chain **ZeroDev ECDSA Validator Plugin** is installed directly on your smart account.

**This means you can recover 100% of your funds even if Orki's website, backend API, and company completely cease to exist.**

---

## 🚀 How to Use

### Option 1: Double-Click and Open Locally (Zero Setup)
Simply open `orki-recovery.html` in any web browser (Chrome, Brave, Firefox, Edge, etc.). 
- The entire bundle (Viem, ZeroDev SDK, ECDSA Validator, icons, styles) is inlined into this single HTML file.
- It requires no local web server and no npm installation.

### Option 2: Run Development / Build from Source
```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Build the standalone single-file HTML
npm run build
# Output is saved to dist/index.html
```

---

## ⚡ Gas Funding in Disaster Scenarios

| Mode | Who Pays Gas? | Requirements |
| :--- | :--- | :--- |
| **Self-Funded Native Gas (Disaster Mode)** | **Smart Account directly** | Deposit **~$0.10 in native token** (ETH on Base/Sepolia, POL on Polygon) to your Smart Account address. Canonical EntryPoint v0.7 pays the bundler directly from account balance. |
| **ZeroDev / Sponsoring Paymaster** | **Paymaster Service** | Requires an active Paymaster RPC endpoint (e.g. ZeroDev). 100% gasless when operational. |

---

## 📋 Canonical Blockchain Addresses

- **EntryPoint v0.7:** `0x0000000071727De22E5E9d8BAf0edAc6f37da032`
- **ZeroDev ECDSA Validator Plugin:** `0x845ADb2C711129d4f3966735eD98a9F09fC4cE57`
- **Account Standard:** ERC-7579 / ERC-4337 (Kernel v3.3)

---

## ❓ FAQ & Troubleshooting

### Why does calling `execute(...)` directly on BaseScan/Etherscan revert?
Kernel v3.3 smart accounts enforce the `onlyEntryPointOrSelf` security modifier. Transactions must be submitted as **ERC-4337 UserOperations** to the EntryPoint contract, which this tool packages and signs automatically.

### What networks are supported?
- **Production:** Base, Polygon, Ethereum Mainnet
- **Testnets:** Base Sepolia, Polygon Amoy, Ethereum Sepolia
