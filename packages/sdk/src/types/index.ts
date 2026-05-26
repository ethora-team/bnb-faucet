export interface EthoraFaucetOptions {
  /** API key for authenticated endpoints. */
  apiKey?: string;
  /** Custom base URL (overrides sandbox flag). */
  baseUrl?: string;
  /** Use sandbox environment. Default: false. */
  sandbox?: boolean;
  /** Request timeout in milliseconds. Default: 30000. */
  timeoutMs?: number;
}

export interface RequestOptions {
  walletAddress: string;
  tokens: string[];
  captchaToken: string;
  /** BNB chain ID. Default: 97 (BSC Testnet). */
  chainId?: 97 | 56;
}

export interface RequestResult {
  success: boolean;
  txHash: string;
  wallet: string;
  tokens: Array<{
    symbol: string;
    amount: string;
    contractAddress: string;
  }>;
  cooldownExpiresAt: string;
  explorerUrl: string;
}

export interface CooldownStatus {
  wallet: string;
  onCooldown: boolean;
  expiresAt: string | null;
  remainingSeconds: number;
}

export interface TokenInfo {
  symbol: string;
  name: string;
  contractAddress: string;
  decimals: number;
  dripAmount: string;
  dripAmountFormatted: string;
  logoUrl: string;
  active: boolean;
}

export interface WalletHistory {
  wallet: string;
  total: number;
  page: number;
  limit: number;
  transactions: Array<{
    txHash: string;
    tokens: string[];
    timestamp: string;
    explorerUrl: string;
  }>;
}

export interface WebhookConfig {
  url: string;
  events: Array<'drip.success' | 'drip.failed' | 'cooldown.reset'>;
  secret?: string;
}
