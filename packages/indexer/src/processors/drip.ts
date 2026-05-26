import type { Pool } from 'pg';

export interface DripEvent {
  wallet: string;
  token: string;
  amount: string;
  cooldownExpiry: number;
  txHash: string;
  blockNumber: number;
  timestamp: Date;
}

export class DripProcessor {
  constructor(private readonly pool: Pool) {}

  async process(event: DripEvent): Promise<void> {
    await this.pool.query(
      `INSERT INTO drip_events
         (wallet, token, amount, cooldown_expiry, tx_hash, block_number, created_at)
       VALUES ($1, $2, $3, to_timestamp($4), $5, $6, $7)
       ON CONFLICT (tx_hash, token) DO NOTHING`,
      [
        event.wallet.toLowerCase(),
        event.token.toLowerCase(),
        event.amount,
        event.cooldownExpiry,
        event.txHash,
        event.blockNumber,
        event.timestamp,
      ]
    );
    console.log(`[processor] Drip indexed: ${event.txHash} — ${event.wallet} — token ${event.token}`);
  }
}
