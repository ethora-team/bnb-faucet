import type { ethers } from 'ethers';
import type { DripProcessor } from '../processors/drip.js';

export class DripListener {
  private running = false;

  constructor(
    private readonly contract: ethers.Contract,
    private readonly processor: DripProcessor,
  ) {}

  async start(): Promise<void> {
    this.running = true;

    this.contract.on('Drip', async (wallet, token, amount, cooldownExpiry, event) => {
      if (!this.running) return;
      try {
        await this.processor.process({
          wallet,
          token,
          amount: amount.toString(),
          cooldownExpiry: Number(cooldownExpiry),
          txHash: event.log.transactionHash,
          blockNumber: event.log.blockNumber,
          timestamp: new Date(),
        });
      } catch (err) {
        console.error('[drip-listener] Failed to process event:', err);
      }
    });
  }

  async stop(): Promise<void> {
    this.running = false;
    await this.contract.removeAllListeners();
  }
}
