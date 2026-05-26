import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import '@nomicfoundation/hardhat-verify';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import * as dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });

const config: HardhatUserConfig = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
    },
  },
  networks: {
    hardhat: {},
    bscTestnet: {
      url: process.env.BSC_TESTNET_RPC_URL || 'https://data-seed-prebsc-1-s1.binance.org:8545',
      chainId: 97,
      accounts: process.env.FAUCET_PRIVATE_KEY ? [process.env.FAUCET_PRIVATE_KEY] : [],
    },
    bscMainnet: {
      url: process.env.BSC_MAINNET_RPC_URL || 'https://bsc-dataseed1.binance.org',
      chainId: 56,
      accounts: process.env.FAUCET_PRIVATE_KEY ? [process.env.FAUCET_PRIVATE_KEY] : [],
    },
  },
  etherscan: {
    apiKey: { bscTestnet: process.env.BSCSCAN_API_KEY || '' },
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS === 'true',
    currency: 'USD',
    coinmarketcap: process.env.CMC_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
  },
};

export default config;
