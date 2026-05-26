import { ethers } from 'ethers';
import { Redis } from 'ioredis';
import type { RequestResult } from '@ethora/faucet-sdk';

const COOLDOWN_KEY = (address: string) => `cooldown:${address.toLowerCase()}`;
const COOLDOWN_TTL = 86_400; // 24 hours

// ABI fragment — only what we need
const CONTROLLER_ABI = [
  'function drip(address wallet, address[] calldata tokens) external',
];

export class FaucetService {
  private readonly redis: Redis;
  private readonly provider: ethers.JsonRpcProvider;
  private readonly wallet: ethers.Wallet;
  private readonly controller: ethers.Contract;

  constructor(redis: Redis) {
    this.redis = redis;
    this.provider = new ethers.JsonRpcProvider(
      process.env.BSC_TESTNET_RPC_URL ?? 'https://data-seed-prebsc-1-s1.binance.org:8545'
    );
    this.wallet = new ethers.Wallet(process.env.FAUCET_PRIVATE_KEY ?? '0x' + '0'.repeat(64), this.provider);
    this.controller = new ethers.Contract(
      process.env.FAUCET_CONTROLLER_ADDRESS!,
      CONTROLLER_ABI,
      this.wallet
    );
  }

  async getCooldown(address: string): Promise<{
    active: boolean;
    expiresAt: string | null;
    remainingSeconds: number;
  }> {
    const ttl = await this.redis.ttl(COOLDOWN_KEY(address));
    if (ttl <= 0) return { active: false, expiresAt: null, remainingSeconds: 0 };
    const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();
    return { active: true, expiresAt, remainingSeconds: ttl };
  }

  async drip(walletAddress: string, tokenSymbols: string[]): Promise<RequestResult> {
    // Resolve token addresses from registry (simplified — production reads from DB)
    const tokenAddresses = tokenSymbols.map((s) => this.resolveTokenAddress(s));

    const tx: ethers.TransactionResponse = await this.controller.drip(walletAddress, tokenAddresses);
    await tx.wait(1);

    // Set cooldown
    await this.redis.setex(COOLDOWN_KEY(walletAddress), COOLDOWN_TTL, '1');

    const expiresAt = new Date(Date.now() + COOLDOWN_TTL * 1000).toISOString();

    return {
      success: true,
      txHash: tx.hash,
      wallet: walletAddress,
      tokens: tokenSymbols.map((symbol, i) => ({
        symbol,
        amount: this.dripAmountRaw(symbol),
        contractAddress: tokenAddresses[i],
      })),
      cooldownExpiresAt: expiresAt,
      explorerUrl: `https://testnet.bscscan.com/tx/${tx.hash}`,
    };
  }

  private resolveTokenAddress(symbol: string): string {
    const map: Record<string, string> = {
      USDT: '0x337610d27c682E347C9cD60BD4b3b107C9d34dDd',
      USDC: '0x64544969ed7EBf5f083679233325356EbE738930',
      WBNB: '0xae13d989daC2f0dEbFf460aC112a837C89BAa7cd',
      ETH:  '0xd66c6B4F0be8CE5b39D52E0Fd1344c389929B378',
      CAKE: '0xFa60D973F7642B748046464e165A65B7323b0C73',
      LINK: '0x84b9B910527Ad5C03A9Ca831909E21e236EA7b06',
    };
    const addr = map[symbol.toUpperCase()];
    if (!addr) throw new Error(`Unknown token: ${symbol}`);
    return addr;
  }

  private dripAmountRaw(symbol: string): string {
    const amounts: Record<string, string> = {
      USDT: '100000000000000000000',
      USDC: '100000000000000000000',
      WBNB: '500000000000000000',
      ETH:  '50000000000000000',
      CAKE: '10000000000000000000',
      LINK: '5000000000000000000',
    };
    return amounts[symbol.toUpperCase()] ?? '0';
  }
}
