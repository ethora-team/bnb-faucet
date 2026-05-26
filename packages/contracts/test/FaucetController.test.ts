import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { time } from '@nomicfoundation/hardhat-network-helpers';

describe('FaucetController', () => {
  async function deploy() {
    const [admin, operator, user] = await ethers.getSigners();
    const COOLDOWN = 86400;
    const DRIP = ethers.parseUnits('100', 18);
    const MINTER_ROLE = ethers.keccak256(ethers.toUtf8Bytes('MINTER_ROLE'));
    const OPERATOR_ROLE = ethers.keccak256(ethers.toUtf8Bytes('OPERATOR_ROLE'));

    const Registry = await ethers.getContractFactory('FaucetRegistry');
    const registry = await Registry.deploy(admin.address);

    const Controller = await ethers.getContractFactory('FaucetController');
    const controller = await upgrades.deployProxy(
      Controller,
      [await registry.getAddress(), admin.address, COOLDOWN],
      { kind: 'uups' }
    );

    const Token = await ethers.getContractFactory('MockToken');
    const usdt = await Token.deploy('Tether USD', 'USDT', 18, admin.address);

    await usdt.grantRole(MINTER_ROLE, await controller.getAddress());
    await registry.registerToken(await usdt.getAddress(), 'USDT', 'Tether USD', 18, DRIP);
    await controller.grantRole(OPERATOR_ROLE, operator.address);

    return { controller, registry, usdt, admin, operator, user, COOLDOWN, DRIP };
  }

  describe('drip()', () => {
    it('mints correct amount to wallet', async () => {
      const { controller, usdt, operator, user, DRIP } = await deploy();
      await controller.connect(operator).drip(user.address, [await usdt.getAddress()]);
      expect(await usdt.balanceOf(user.address)).to.equal(DRIP);
    });

    it('enforces 24h cooldown on second claim', async () => {
      const { controller, usdt, operator, user } = await deploy();
      await controller.connect(operator).drip(user.address, [await usdt.getAddress()]);
      await expect(
        controller.connect(operator).drip(user.address, [await usdt.getAddress()])
      ).to.be.revertedWithCustomError(controller, 'CooldownActive');
    });

    it('allows drip after cooldown expires', async () => {
      const { controller, usdt, operator, user, COOLDOWN, DRIP } = await deploy();
      await controller.connect(operator).drip(user.address, [await usdt.getAddress()]);
      await time.increase(COOLDOWN + 1);
      await controller.connect(operator).drip(user.address, [await usdt.getAddress()]);
      expect(await usdt.balanceOf(user.address)).to.equal(DRIP * 2n);
    });

    it('reverts for unregistered token', async () => {
      const { controller, operator, user } = await deploy();
      const fake = ethers.Wallet.createRandom().address;
      await expect(
        controller.connect(operator).drip(user.address, [fake])
      ).to.be.revertedWithCustomError(controller, 'TokenNotRegistered');
    });

    it('reverts when paused', async () => {
      const { controller, usdt, admin, operator, user } = await deploy();
      await controller.connect(admin).pause();
      await expect(
        controller.connect(operator).drip(user.address, [await usdt.getAddress()])
      ).to.be.revertedWithCustomError(controller, 'EnforcedPause');
    });

    it('reverts for zero address wallet', async () => {
      const { controller, usdt, operator } = await deploy();
      await expect(
        controller.connect(operator).drip(ethers.ZeroAddress, [await usdt.getAddress()])
      ).to.be.revertedWithCustomError(controller, 'ZeroAddress');
    });
  });

  describe('cooldownRemaining()', () => {
    it('returns 0 before first drip', async () => {
      const { controller, user } = await deploy();
      expect(await controller.cooldownRemaining(user.address)).to.equal(0n);
    });

    it('returns approximate time after drip', async () => {
      const { controller, usdt, operator, user, COOLDOWN } = await deploy();
      await controller.connect(operator).drip(user.address, [await usdt.getAddress()]);
      const remaining = await controller.cooldownRemaining(user.address);
      expect(remaining).to.be.closeTo(BigInt(COOLDOWN), 5n);
    });
  });

  describe('admin functions', () => {
    it('admin can update default cooldown', async () => {
      const { controller, admin } = await deploy();
      await controller.connect(admin).setDefaultCooldown(3600);
      expect(await controller.defaultCooldown()).to.equal(3600n);
    });

    it('non-admin cannot update cooldown', async () => {
      const { controller, user } = await deploy();
      await expect(
        controller.connect(user).setDefaultCooldown(3600)
      ).to.be.revertedWithCustomError(controller, 'AccessControlUnauthorizedAccount');
    });
  });
});
