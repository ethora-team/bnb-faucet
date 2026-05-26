import { ethers, upgrades } from 'hardhat';

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log('Deploying with:', deployer.address);

  // 1. Deploy FaucetRegistry
  const Registry = await ethers.getContractFactory('FaucetRegistry');
  const registry = await Registry.deploy(deployer.address);
  await registry.waitForDeployment();
  console.log('FaucetRegistry:', await registry.getAddress());

  // 2. Deploy FaucetController (UUPS proxy)
  const COOLDOWN_24H = 86400;
  const Controller = await ethers.getContractFactory('FaucetController');
  const controller = await upgrades.deployProxy(
    Controller,
    [await registry.getAddress(), deployer.address, COOLDOWN_24H],
    { kind: 'uups' }
  );
  await controller.waitForDeployment();
  console.log('FaucetController proxy:', await controller.getAddress());

  // 3. Deploy mock tokens
  const MockToken = await ethers.getContractFactory('MockToken');
  const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));

  const tokens = [
    { name: 'Tether USD (Testnet)',    symbol: 'USDT', decimals: 18, drip: '100'  },
    { name: 'USD Coin (Testnet)',      symbol: 'USDC', decimals: 18, drip: '100'  },
    { name: 'Wrapped BNB (Testnet)',   symbol: 'WBNB', decimals: 18, drip: '0.5'  },
    { name: 'Wrapped ETH (Testnet)',   symbol: 'ETH',  decimals: 18, drip: '0.05' },
    { name: 'PancakeSwap (Testnet)',   symbol: 'CAKE', decimals: 18, drip: '10'   },
    { name: 'Chainlink (Testnet)',     symbol: 'LINK', decimals: 18, drip: '5'    },
  ];

  for (const t of tokens) {
    const token = await MockToken.deploy(t.name, t.symbol, t.decimals, deployer.address);
    await token.waitForDeployment();
    await token.grantRole(MINTER_ROLE, await controller.getAddress());
    const dripAmount = ethers.parseUnits(t.drip, t.decimals);
    await registry.registerToken(
      await token.getAddress(), t.symbol, t.name, t.decimals, dripAmount
    );
    console.log(`Mock${t.symbol}: ${await token.getAddress()}`);
  }

  console.log('\n✅ Deployment complete.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
