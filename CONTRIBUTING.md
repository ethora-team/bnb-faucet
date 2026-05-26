# Contributing to Ethora BNB Faucet

Thank you for your interest in contributing. This document explains how to set up a development environment, follow our conventions, and submit a pull request.

---

## Development Setup

### Requirements

| Tool | Version |
|------|---------|
| Node.js | ≥ 18 |
| pnpm | ≥ 8 |
| Docker | any recent |
| Git | any recent |

### First-time setup

```bash
git clone https://github.com/ethora-labs/bnb-faucet.git
cd bnb-faucet
pnpm install
cp .env.example .env
docker compose up -d
pnpm build
```

---

## Project Structure

```
bnb-faucet/
├── packages/
│   ├── contracts/   # Solidity + Hardhat
│   ├── sdk/         # TypeScript client SDK
│   ├── api/         # Fastify REST API
│   ├── cli/         # Node.js CLI
│   └── indexer/     # On-chain event indexer
├── apps/
│   ├── web/         # Frontend (Vanilla JS/HTML/CSS)
│   └── docs/        # Documentation site
├── .github/
│   ├── workflows/
│   └── ISSUE_TEMPLATE/
└── scripts/         # Repo-level utility scripts
```

---

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <short description>

[optional body]

[optional footer]
```

Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `perf`, `ci`

Examples:
```
feat(sdk): add batch token request support
fix(api): correct cooldown TTL calculation for 24h window
docs(contracts): add NatSpec to FaucetController
```

---

## Pull Request Guidelines

- PRs must target `develop` (not `main` directly)
- All CI checks must pass
- New features require tests; coverage must not drop
- Keep PRs focused — one logical change per PR
- Add a changeset if the PR affects a published package:

```bash
pnpm changeset
```

---

## Adding a New Token

1. Add the token entry to [`packages/contracts/src/tokens.ts`](./packages/contracts/src/tokens.ts)
2. Deploy a `MockToken` and record the address in [`deployments/bsc-testnet.json`](./deployments/bsc-testnet.json)
3. Register the token via `FaucetRegistry.registerToken()`
4. Update the token list in [`apps/web/src/tokens.js`](./apps/web/src/tokens.js)
5. Open a PR with the `token-listing` label

---

## Running Tests

```bash
# All packages
pnpm test

# Specific package
pnpm --filter @ethora/faucet-sdk test
pnpm --filter @ethora/api test
pnpm --filter @ethora/contracts test

# With coverage
pnpm --filter @ethora/api test --coverage
```

---

## Code Style

We use ESLint + Prettier. Run before committing:

```bash
pnpm lint
pnpm format
```

Pre-commit hooks (via Husky + lint-staged) run these automatically.

---

## Security

Do not open public issues for security vulnerabilities.
Email `security@ethora.io` with a detailed report.
