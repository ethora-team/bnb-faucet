# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [1.2.0] — 2024-03-20

### Added
- `@ethora/cli` package — claim tokens from terminal
- Webhook support: `drip.success`, `drip.failed`, `cooldown.reset` events
- `FaucetController.dailyLimit` — per-token global drip caps
- Prometheus metrics endpoint at `/metrics`
- CAKE, LINK, UNI, DAI token support (total: 24 tokens)
- Sandbox environment (`sandbox.api.ethora.io`)

### Changed
- `FaucetController` upgraded to v2 implementation (UUPS)
- Default cooldown reduced from 48h → 24h
- API rate limit raised from 60 → 100 req/15min

### Fixed
- Cooldown bypass via `cooldownOverride = 0` (HAL-002)
- Zero-address check in `drip()` (HAL-001)

## [1.1.0] — 2024-02-10

### Added
- `@ethora/indexer` — on-chain event indexer with PostgreSQL storage
- `/wallet/:address/history` endpoint
- BullMQ job queue for async drip processing
- Cloudflare Turnstile captcha integration

### Changed
- Migrated API from Express to Fastify (2× throughput improvement)
- OpenAPI spec now auto-generated via `@fastify/swagger`

## [1.0.0] — 2024-01-15

### Added
- Initial release
- `FaucetController` + `FaucetRegistry` + `MockToken` contracts
- REST API with Redis-backed cooldown
- `@ethora/faucet-sdk` TypeScript SDK
- Frontend faucet UI
- Support for USDT, USDC, WBNB, ETH (8 tokens)
