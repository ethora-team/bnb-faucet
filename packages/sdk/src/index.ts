import type {
  EthoraFaucetOptions,
  RequestOptions,
  RequestResult,
  CooldownStatus,
  TokenInfo,
  WalletHistory,
  WebhookConfig,
} from './types/index.js';
import { EthoraFaucetError, RateLimitError, CooldownError } from './errors/index.js';

const DEFAULT_BASE_URL = 'https://api.ethora.io/v1';
const DEFAULT_TIMEOUT_MS = 30_000;
const SDK_VERSION = '1.2.0';

/**
 * Ethora BNB Faucet SDK
 *
 * @example
 * ```ts
 * const faucet = new EthoraFaucet({ apiKey: process.env.ETHORA_API_KEY });
 *
 * const result = await faucet.request({
 *   walletAddress: '0xYourAddress',
 *   tokens: ['USDT', 'USDC', 'WBNB'],
 *   captchaToken: turnstileToken,
 * });
 *
 * console.log(result.txHash); // 0x3f9d2a...
 * ```
 */
export class EthoraFaucet {
  private readonly baseUrl: string;
  private readonly apiKey: string | undefined;
  private readonly timeoutMs: number;
  private readonly sandbox: boolean;

  constructor(options: EthoraFaucetOptions = {}) {
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.sandbox = options.sandbox ?? false;
    this.baseUrl = options.baseUrl
      ?? (this.sandbox ? 'https://sandbox.api.ethora.io/v1' : DEFAULT_BASE_URL);
  }

  // ─── Core ─────────────────────────────────────────────────────────────────

  /**
   * Request testnet tokens for a wallet address.
   */
  async request(options: RequestOptions): Promise<RequestResult> {
    const res = await this.post<RequestResult>('/faucet/request', {
      wallet_address: options.walletAddress,
      tokens: options.tokens,
      captcha_token: options.captchaToken,
      chain_id: options.chainId ?? 97,
    });
    return res;
  }

  /**
   * Check cooldown status for a wallet.
   */
  async cooldownStatus(walletAddress: string): Promise<CooldownStatus> {
    return this.get<CooldownStatus>(`/faucet/cooldown/${walletAddress}`);
  }

  /**
   * List all supported tokens.
   */
  async tokens(): Promise<TokenInfo[]> {
    const res = await this.get<{ tokens: TokenInfo[] }>('/tokens');
    return res.tokens;
  }

  /**
   * Get transaction history for a wallet.
   */
  async walletHistory(
    walletAddress: string,
    options?: { page?: number; limit?: number }
  ): Promise<WalletHistory> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      limit: String(options?.limit ?? 20),
    });
    return this.get<WalletHistory>(`/wallet/${walletAddress}/history?${params}`);
  }

  /**
   * Register a webhook endpoint.
   */
  async registerWebhook(config: WebhookConfig): Promise<{ id: string; secret: string }> {
    return this.post('/webhooks', config);
  }

  // ─── HTTP helpers ─────────────────────────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    return this.fetch<T>(path, { method: 'GET' });
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.fetch<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  private async fetch<T>(path: string, init: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    const headers: Record<string, string> = {
      'User-Agent': `ethora-faucet-sdk/${SDK_VERSION}`,
      ...(this.apiKey ? { 'X-Api-Key': this.apiKey } : {}),
      ...(init.headers as Record<string, string> ?? {}),
    };

    let res: Response;
    try {
      res = await globalThis.fetch(`${this.baseUrl}${path}`, {
        ...init,
        headers,
        signal: controller.signal,
      });
    } catch (err) {
      throw new EthoraFaucetError(`Network error: ${(err as Error).message}`, 0);
    } finally {
      clearTimeout(timer);
    }

    const json = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 429) {
        throw new RateLimitError(json.message ?? 'Rate limit exceeded', json.retryAfter);
      }
      if (res.status === 409 && json.code === 'COOLDOWN_ACTIVE') {
        throw new CooldownError(json.message ?? 'Cooldown active', json.expiresAt);
      }
      throw new EthoraFaucetError(json.message ?? 'Request failed', res.status);
    }

    return json as T;
  }
}

export { EthoraFaucetError, RateLimitError, CooldownError };
export type {
  EthoraFaucetOptions,
  RequestOptions,
  RequestResult,
  CooldownStatus,
  TokenInfo,
  WalletHistory,
};
