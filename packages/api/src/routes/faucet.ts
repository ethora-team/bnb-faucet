import type { FastifyPluginAsync } from 'fastify';
import { Redis } from 'ioredis';
import { z } from 'zod';
import { FaucetService } from '../services/faucet.js';
import { CaptchaService } from '../services/captcha.js';

const RequestBodySchema = z.object({
  wallet_address: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid EVM address'),
  tokens: z.array(z.string().min(1).max(10)).min(1).max(10),
  captcha_token: z.string().min(1),
  chain_id: z.literal(97).default(97),
});

export const faucetRoutes: FastifyPluginAsync<{ redis: Redis }> = async (app, opts) => {
  const faucetService = new FaucetService(opts.redis);
  const captchaService = new CaptchaService();

  /**
   * POST /v1/faucet/request
   * Request testnet tokens for a wallet.
   */
  app.post('/request', {
    schema: {
      tags: ['Faucet'],
      summary: 'Request testnet tokens',
      body: {
        type: 'object',
        required: ['wallet_address', 'tokens', 'captcha_token'],
        properties: {
          wallet_address: { type: 'string', description: 'EVM wallet address (0x...)' },
          tokens: { type: 'array', items: { type: 'string' }, description: 'Token symbols' },
          captcha_token: { type: 'string', description: 'Cloudflare Turnstile token' },
          chain_id: { type: 'number', default: 97 },
        },
      },
    },
  }, async (req, reply) => {
    const body = RequestBodySchema.parse(req.body);

    // Verify captcha
    const captchaValid = await captchaService.verify(body.captcha_token, req.ip);
    if (!captchaValid) {
      return reply.status(400).send({ error: 'Invalid captcha token' });
    }

    // Check cooldown
    const cooldown = await faucetService.getCooldown(body.wallet_address);
    if (cooldown.active) {
      return reply.status(409).send({
        error: 'Wallet is currently on cooldown',
        code: 'COOLDOWN_ACTIVE',
        expiresAt: cooldown.expiresAt,
        remainingSeconds: cooldown.remainingSeconds,
      });
    }

    // Execute drip
    const result = await faucetService.drip(body.wallet_address, body.tokens);
    return reply.status(200).send(result);
  });

  /**
   * GET /v1/faucet/cooldown/:address
   * Check cooldown status for a wallet.
   */
  app.get('/cooldown/:address', {
    schema: {
      tags: ['Faucet'],
      summary: 'Check cooldown status',
      params: {
        type: 'object',
        properties: { address: { type: 'string' } },
      },
    },
  }, async (req, reply) => {
    const { address } = req.params as { address: string };
    const status = await faucetService.getCooldown(address);
    return reply.send({
      wallet: address,
      onCooldown: status.active,
      expiresAt: status.expiresAt,
      remainingSeconds: status.remainingSeconds,
    });
  });
};
