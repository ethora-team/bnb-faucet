import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Redis } from 'ioredis';
import { faucetRoutes } from './routes/faucet.js';
import { tokenRoutes } from './routes/tokens.js';
import { walletRoutes } from './routes/wallet.js';
import { webhookRoutes } from './routes/webhooks.js';
import { healthRoutes } from './routes/health.js';
import { metricsPlugin } from './middleware/metrics.js';
import { authPlugin } from './middleware/auth.js';

const PORT = Number(process.env.PORT ?? 3001);
const HOST = process.env.HOST ?? '0.0.0.0';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: process.env.NODE_ENV === 'development'
        ? { target: 'pino-pretty' }
        : undefined,
    },
  });

  const redis = new Redis(process.env.REDIS_URL ?? 'redis://localhost:6379');

  // ── Plugins ───────────────────────────────────────────────────────────────
  await app.register(helmet);
  await app.register(cors, {
    origin: process.env.CORS_ORIGIN ?? '*',
    methods: ['GET', 'POST', 'DELETE'],
  });
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '15 minutes',
    redis,
    keyGenerator: (req) => req.headers['x-api-key'] as string ?? req.ip,
  });
  await app.register(swagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'Ethora BNB Faucet API',
        version: '1.2.0',
        description: 'REST API for requesting BNB testnet tokens',
      },
      servers: [
        { url: 'https://api.ethora.io/v1', description: 'Production' },
        { url: 'https://sandbox.api.ethora.io/v1', description: 'Sandbox' },
      ],
    },
  });
  await app.register(swaggerUi, { routePrefix: '/docs' });
  await app.register(metricsPlugin);
  await app.register(authPlugin, { redis });

  // ── Routes ────────────────────────────────────────────────────────────────
  await app.register(healthRoutes, { prefix: '/health' });
  await app.register(faucetRoutes, { prefix: '/v1/faucet', redis });
  await app.register(tokenRoutes, { prefix: '/v1/tokens' });
  await app.register(walletRoutes, { prefix: '/v1/wallet' });
  await app.register(webhookRoutes, { prefix: '/v1/webhooks' });

  return app;
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });
  app.log.info(`Ethora Faucet API listening on port ${PORT}`);
}
