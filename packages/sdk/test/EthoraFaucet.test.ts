import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EthoraFaucet, RateLimitError, CooldownError } from '../src/index.js';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

function mockResponse(body: unknown, status = 200) {
  mockFetch.mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
}

describe('EthoraFaucet', () => {
  let faucet: EthoraFaucet;

  beforeEach(() => {
    mockFetch.mockReset();
    faucet = new EthoraFaucet({ apiKey: 'test-key' });
  });

  describe('request()', () => {
    it('calls the correct endpoint and returns result', async () => {
      mockResponse({
        success: true,
        txHash: '0xabc123',
        wallet: '0xUser',
        tokens: [{ symbol: 'USDT', amount: '100000000000000000000', contractAddress: '0x1' }],
        cooldownExpiresAt: new Date(Date.now() + 86400000).toISOString(),
        explorerUrl: 'https://testnet.bscscan.com/tx/0xabc123',
      });

      const result = await faucet.request({
        walletAddress: '0xUser',
        tokens: ['USDT'],
        captchaToken: 'captcha-token',
      });

      expect(result.txHash).toBe('0xabc123');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/faucet/request'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('throws CooldownError on 409', async () => {
      mockResponse(
        { message: 'Wallet is on cooldown', code: 'COOLDOWN_ACTIVE', expiresAt: '2024-12-31' },
        409
      );
      await expect(
        faucet.request({ walletAddress: '0xUser', tokens: ['USDT'], captchaToken: 'x' })
      ).rejects.toBeInstanceOf(CooldownError);
    });

    it('throws RateLimitError on 429', async () => {
      mockResponse({ message: 'Too many requests', retryAfter: 60 }, 429);
      await expect(
        faucet.request({ walletAddress: '0xUser', tokens: ['USDT'], captchaToken: 'x' })
      ).rejects.toBeInstanceOf(RateLimitError);
    });
  });

  describe('tokens()', () => {
    it('returns token list', async () => {
      mockResponse({
        tokens: [
          { symbol: 'USDT', name: 'Tether USD', decimals: 18, dripAmountFormatted: '100 USDT' },
        ],
      });
      const tokens = await faucet.tokens();
      expect(tokens).toHaveLength(1);
      expect(tokens[0].symbol).toBe('USDT');
    });
  });

  describe('cooldownStatus()', () => {
    it('returns cooldown data', async () => {
      mockResponse({ wallet: '0xUser', onCooldown: false, expiresAt: null, remainingSeconds: 0 });
      const status = await faucet.cooldownStatus('0xUser');
      expect(status.onCooldown).toBe(false);
    });
  });
});
