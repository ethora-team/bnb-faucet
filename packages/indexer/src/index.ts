import 'dotenv/config';
import { ethers } from 'ethers';
import { Pool } from 'pg';
import { DripListener } from './listeners/drip.js';
import { DripProcessor } from './processors/drip.js';

const CONTROLLER_ABI = [
  'event Drip(address indexed wallet, address indexed token, uint256 amount, uint256 cooldownExpiry)',
];

async function main() {
  console.log('[indexer] Starting Ethora BNB Faucet indexer...');

  const provider = new ethers.WebSocketProvider(
    process.env.BSC_TESTNET_WS_URL ?? 'wss://bsc-testnet-rpc.publicnode.com'
  );

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  await pool.query('SELECT 1'); // verify connection
  console.log('[indexer] Database connected');

  const contract = new ethers.Contract(
    process.env.FAUCET_CONTROLLER_ADDRESS!,
    CONTROLLER_ABI,
    provider
  );

  const processor = new DripProcessor(pool);
  const listener = new DripListener(contract, processor);

  await listener.start();
  console.log('[indexer] Listening for Drip events...');

  process.on('SIGTERM', async () => {
    console.log('[indexer] Shutting down...');
    await listener.stop();
    await pool.end();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('[indexer] Fatal error:', err);
  process.exit(1);
});
