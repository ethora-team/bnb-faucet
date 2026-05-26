# Ethora RPC

<div align="center">
  <img src="./assets/ethora.png" alt="Ethora Faucet" width="480" />
  <br/><br/>

[![Coverage](https://img.shields.io/badge/coverage-94%25-00d4aa)](./packages)
[![npm version](https://img.shields.io/badge/npm-v1.2.0-f0b90b)](https://www.npmjs.com/package/@ethora/faucet-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Contracts Audited](https://img.shields.io/badge/contracts-audited-00d4aa)](./audits)

**The most reliable BEP-20 faucet on BNB Smart Chain.**

Claim USDT, USDC, ETH, WBNB, CAKE and 21 more testnet tokens instantly.
Free for developers, auditors and blockchain learners.

[**→ Live Faucet**](https://ethora.org) · [**→ API Docs**](https://ethora.org/api-docs) · [**→ SDK Reference**](./packages/sdk) · [**→ Bug Report**](https://github.com/ethora-team/bnb-faucet/issues/new?template=bug_report.md)

</div>

---

## Overview

Ethora BNB Faucet is an open-source, production-grade token dispenser for BNB Smart Chain. It is designed for developers building DeFi protocols, auditors verifying contract logic, and learners exploring blockchain development — without touching real assets.

The project ships as a **monorepo** containing:

| Package | Description |
|---------|-------------|
| [`@ethora/contracts`](./packages/contracts) | Solidity faucet & mock-token contracts (Hardhat) |
| [`@ethora/faucet-sdk`](./packages/sdk) | TypeScript SDK for programmatic token requests |
| [`@ethora/api`](./packages/api) | Node.js REST API (Fastify + Redis) |
| [`@ethora/cli`](./packages/cli) | CLI tool — claim tokens from your terminal |
| [`@ethora/indexer`](./packages/indexer) | On-chain event indexer (ethers.js + PostgreSQL) |
| [`apps/web`](./apps/web) | Frontend — the faucet UI |
| [`apps/docs`](./apps/docs) | Developer documentation site |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        BNB Smart Chain (BSC Mainnet)            │
│                                                                 │
│   ┌──────────────────┐        ┌─────────────────────────────┐  │
│   │  FaucetController│        │  MockToken (ERC-20 × 24)    │  │
│   │  (upgradeable)   │──mint─▶│  USDT / USDC / WBNB / ...   │  │
│   └──────────┬───────┘        └─────────────────────────────┘  │
│              │ events                                           │
└──────────────┼──────────────────────────────────────────────────┘
               │
    ┌──────────▼──────────┐
    │   @ethora/indexer   │  ethers.js · PostgreSQL · BullMQ
    │   (event pipeline)  │
    └──────────┬──────────┘
               │ REST
    ┌──────────▼──────────┐         ┌────────────────────┐
    │   @ethora/api        │◀───────▶│  Redis (cooldown,  │
    │   (Fastify + Zod)   │         │  rate-limit, cache) │
    └──────────┬──────────┘         └────────────────────┘
               │
    ┌──────────┴────────────────────┐
    │                               │
    ▼                               ▼
┌──────────────────┐    ┌─────────────────────┐
│   apps/web        │    │   @ethora/faucet-sdk │
│   (Vanilla JS)   │    │   (npm package)      │
└──────────────────┘    └─────────────────────┘
                                    │
                         ┌──────────▼──────────┐
                         │   @ethora/cli        │
                         │   (Node.js CLI)      │
                         └─────────────────────┘
```

---

## Quick Start

### Prerequisites

- Node.js ≥ 18
- pnpm ≥ 8
- Docker (for local API + Redis + Postgres stack)
- Foundry or Hardhat (for contract development)

### Installation

```bash
git clone https://github.com/ethora-labs/bnb-faucet.git
cd bnb-faucet

# Install all workspace dependencies
pnpm install

# Copy environment variables
cp .env.example .env
```

### Run locally

```bash
# Start infrastructure (Redis, Postgres)
docker compose up -d

# Build all packages
pnpm build

# Run API in dev mode
pnpm --filter @ethora/api dev

# Run frontend
pnpm --filter web dev
```

### Use the SDK

```bash
npm install @ethora/faucet-sdk
```

```ts
import { EthoraFaucet } from '@ethora/faucet-sdk';

const faucet = new EthoraFaucet({ apiKey: process.env.ETHORA_API_KEY });

const result = await faucet.request({
  walletAddress: '0xYourWalletAddress',
  tokens: ['USDT', 'USDC', 'WBNB'],
  captchaToken: turnstileToken,
});

console.log(result.txHash);
// → 0x3f9d2a...
```

### Use the CLI

```bash
npm install -g @ethora/cli

ethora-faucet claim \
  --address 0xYourWalletAddress \
  --tokens USDT,USDC,LINK \
  --api-key $ETHORA_API_KEY
```

---

## Packages

### `@ethora/contracts`

Solidity smart contracts compiled with Hardhat. Includes:

- `FaucetController.sol` — upgradeable (UUPS) drip controller with cooldown enforcement and per-token rate limits
- `MockToken.sol` — minimal ERC-20 with `mint()` restricted to `MINTER_ROLE`
- `FaucetRegistry.sol` — on-chain token registry with metadata
- Hardhat deployment scripts for BSC Testnet
- Full test suite (Mocha + Chai + Waffle)
- Slither & Mythril CI integration

[→ contracts README](./packages/contracts/README.md)

### `@ethora/faucet-sdk`

TypeScript-first SDK. Zero runtime dependencies beyond `ethers`. Supports ESM and CJS.

[→ SDK README](./packages/sdk/README.md)

### `@ethora/api`

Fastify-based REST API. Features:

- Zod request validation
- Cloudflare Turnstile captcha verification
- Redis-backed cooldown & rate limiting
- Webhook dispatch (HMAC-SHA256 signed)
- OpenAPI 3.1 spec auto-generated
- Prometheus metrics at `/metrics`

[→ API README](./packages/api/README.md)

### `@ethora/cli`

Terminal tool for CI pipelines and power users.

```
ethora-faucet <command>

Commands:
  claim     Request testnet tokens
  status    Check cooldown for an address
  tokens    List available tokens
  balance   Query faucet reserve balance
```

[→ CLI README](./packages/cli/README.md)

### `@ethora/indexer`

Background worker that listens to `Drip` events on-chain and writes enriched records to PostgreSQL. Powers the `/wallet/history` endpoint.

[→ Indexer README](./packages/indexer/README.md)

---

## Deployments

| Contract | Network | Address |
|----------|---------|---------|
| `FaucetController` | BSC Testnet | [`0x41228B7b...`](https://testnet.bscscan.com/address/0x41228B7b96150BB7760087786bC93E6f6f2B8f0f) |
| `FaucetRegistry` | BSC Testnet | [`0xAb5801a7...`](https://testnet.bscscan.com/address/0xAb5801a7D398351b8bE11C439e05C5B3259aeC9B) |
| `MockUSDT` | BSC Testnet | [`0x337610d2...`](https://testnet.bscscan.com/address/0x337610d27c682E347C9cD60BD4b3b107C9d34dDd) |
| `MockUSDC` | BSC Testnet | [`0x64544969...`](https://testnet.bscscan.com/address/0x64544969ed7EBf5f083679233325356EbE738930) |

Full deployment manifest: [`deployments/bsc-testnet.json`](./deployments/bsc-testnet.json)

---

## Security

Ethora BNB Faucet contracts have been reviewed by [Halborn Security](https://halborn.com). The audit report is available in [`./audits`](./audits).

**Responsible disclosure:** Please do not open public GitHub issues for security vulnerabilities. Email `security@ethora.io` instead.

---

## Contributing

We welcome contributions of all kinds — bug fixes, new token listings, documentation improvements, and SDK extensions.

1. Fork the repo and create a branch: `git checkout -b feat/your-feature`
2. Make your changes and add tests
3. Run the full test suite: `pnpm test`
4. Open a pull request against `main`

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

---

## License

MIT © [Ethora Team](https://github.com/ethora-team)
