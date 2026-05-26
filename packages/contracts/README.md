# @ethora/contracts

Solidity smart contracts for the Ethora BNB Faucet.

## Contracts

| Contract | Description |
|----------|-------------|
| `FaucetController` | UUPS-upgradeable drip controller |
| `FaucetRegistry` | On-chain token registry |
| `MockToken` | Mintable ERC-20 for testnet tokens |

## Development

```bash
pnpm install
pnpm build       # compile
pnpm test        # run tests
pnpm coverage    # coverage report
```

## Deploy

```bash
pnpm deploy:testnet
```

Requires `FAUCET_PRIVATE_KEY` and `BSC_TESTNET_RPC_URL` in `.env`.
