export interface FormattedError {
  title: string;
  message: string;
  details?: string;
}

type ErrorParserItem = [RegExp, { title: string; message: string }];

const parsers: ErrorParserItem[] = [
  // -------------------------
  // ZeroDev & Account Abstraction (ERC-4337)
  // -------------------------
  [
    /userop did not match any gas sponsoring policies|no erc20 gas token data/,
    {
      title: "ZeroDev Gas Policy Missing",
      message:
        "ZeroDev Paymaster rejected gas sponsorship because your ZeroDev project has no active Gas Sponsoring Policy for Base Sepolia. In your ZeroDev dashboard, click 'Edit Policies' on Base Sepolia and add a sponsorship rule (e.g., sponsor 100% or whitelist this contract), or switch to 'Self-Funded Native Gas' in Advanced Configuration below.",
    },
  ],
  [
    /access denied: neither ip nor domain is on the allowlist|origin is not allowed|domain is not on the allowlist/,
    {
      title: "ZeroDev Access Control Blocked",
      message:
        "ZeroDev rejected the request because your current domain (or http://localhost:5173) is not on the Origin allowlist in your ZeroDev Project Access Control settings.",
    },
  ],
  [
    /aa21|didn't pay prefund|pay prefund|prefund too low/,
    {
      title: "Insufficient Native Gas (Prefund)",
      message:
        "The smart account has 0 ETH and cannot pay the bundler prefund. Either send a small amount of native ETH to the smart account or switch to ZeroDev Paymaster mode.",
    },
  ],
  [
    /aa24|signature error|invalid signature|signature validation failed/,
    {
      title: "Recovery Signature Validation Failed",
      message:
        "The on-chain recovery validator rejected the signature. Please verify that the connected wallet is the exact emergency recovery signer registered for this smart account.",
    },
  ],
  [
    /rejected due to request filter settings/,
    {
      title: "Bundler RPC Rejection",
      message:
        "The RPC node rejected the ERC-4337 bundler request. Please verify your ERC-4337 Bundler URL in Advanced Configuration.",
    },
  ],
  [
    /aa22|expired or not due|userop expired/,
    {
      title: "UserOperation Expired",
      message: "The UserOperation timestamp is expired or not yet valid on-chain.",
    },
  ],
  [
    /aa10|sender already constructed/,
    {
      title: "Account Already Constructed",
      message: "The smart account is already initialized on-chain.",
    },
  ],
  [
    /aa23|reverted during userop|userop reverted/,
    {
      title: "UserOperation Reverted",
      message: "The execution call reverted on the smart account during on-chain execution.",
    },
  ],
  [
    /aa33|paymaster reverted/,
    {
      title: "Paymaster Reverted",
      message: "The Paymaster contract reverted during UserOperation validation.",
    },
  ],

  // -------------------------
  // Universal & User Actions
  // -------------------------
  [
    /user rejected|rejected the request|denied transaction|user cancelled|user denied|4001|action_rejected/,
    {
      title: "Transaction Cancelled",
      message: "You cancelled or rejected the transaction signature in your wallet.",
    },
  ],
  [
    /insufficient funds|insufficient balance|insufficient lamports/,
    {
      title: "Insufficient Balance",
      message: "The account does not have sufficient balance to complete this transaction.",
    },
  ],
  [
    /network error|failed to fetch|rpc error|connection refused|connection reset|econnrefused/,
    {
      title: "Network Connection Error",
      message: "Could not reach the blockchain RPC endpoint. Check your internet connection or RPC URL.",
    },
  ],
  [
    /timeout|timed out/,
    {
      title: "Request Timed Out",
      message: "The transaction request timed out waiting for network response. Please retry.",
    },
  ],
  [
    /rate limit|too many requests|429/,
    {
      title: "Rate Limit Exceeded",
      message: "RPC request limit reached. Please wait a moment before trying again.",
    },
  ],
  [
    /wallet not connected|no provider|provider not found|no wallet/,
    {
      title: "Wallet Not Connected",
      message: "No Web3 wallet extension found or authorized. Please connect your recovery wallet.",
    },
  ],
  [
    /invalid address|bad address|malformed address/,
    {
      title: "Invalid Address",
      message: "The provided wallet address is not a valid EVM address.",
    },
  ],

  // -------------------------
  // EVM Execution
  // -------------------------
  [
    /execution reverted|call_exception/,
    {
      title: "Execution Reverted",
      message: "Smart contract rejected the transaction call.",
    },
  ],
  [
    /nonce too low/,
    {
      title: "Nonce Outdated",
      message: "Transaction nonce is outdated. Please refresh balances and retry.",
    },
  ],
  [
    /replacement transaction underpriced|transaction underpriced/,
    {
      title: "Gas Price Too Low",
      message: "Gas fee is below current network requirements. Increase gas price.",
    },
  ],
  [
    /transfer amount exceeds balance|erc20: transfer amount/,
    {
      title: "Insufficient Token Balance",
      message: "The transfer amount exceeds the available token balance in the smart account.",
    },
  ],
  [
    /chain id mismatch|wrong network/,
    {
      title: "Network Mismatch",
      message: "Connected wallet is on a different network than selected.",
    },
  ],
];

export function parseMetaMaskError(error: unknown): FormattedError {
  const raw = extractMessage(error).toLowerCase();
  const specificDetail = extractDetails(error);

  for (const [pattern, item] of parsers) {
    if (pattern.test(raw)) {
      return {
        title: item.title,
        message: item.message,
        details: specificDetail,
      };
    }
  }

  // Fallback for uncategorized errors
  if (error instanceof Error) {
    const err = error as Error & { details?: string; shortMessage?: string };
    return {
      title: "Execution Error",
      message: err.shortMessage || err.message || "Emergency recovery execution failed.",
      details: err.details || specificDetail,
    };
  }

  return {
    title: "Execution Error",
    message: typeof error === "string" ? error : "Emergency recovery execution failed. Please try again.",
    details: specificDetail,
  };
}

function extractMessage(error: unknown): string {
  if (!error) return "";
  if (typeof error === "string") return error;

  if (error instanceof Error) {
    const err = error as Error & { details?: string; shortMessage?: string; reason?: string };
    if (err.details) {
      return `${err.shortMessage || err.message} ${err.details}`;
    }
    if (err.shortMessage) return err.shortMessage;
    if (err.reason) return err.reason;
    return error.message;
  }

  if (typeof error === "object") {
    const e = error as Record<string, unknown>;
    const details = typeof e.details === "string" ? e.details : "";
    const msg = typeof e.message === "string" ? e.message : "";
    const shortMsg = typeof e.shortMessage === "string" ? e.shortMessage : "";

    return `${shortMsg || msg} ${details}`.trim() || JSON.stringify(e);
  }

  return String(error);
}

function extractDetails(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  const e = error as { details?: unknown; shortMessage?: unknown };

  if (typeof e.details === "string" && e.details.trim()) {
    // Strip giant JSON dumps or long hexadecimal calldata if present
    const cleaned = e.details.replace(/Request body:[\s\S]*/, "").trim();
    return cleaned.length > 0 ? cleaned : e.details;
  }

  return undefined;
}
