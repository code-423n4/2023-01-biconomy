import { ethers, upgrades } from "hardhat";

export async function upgradeLiquidityPool(proxyAddress: string) {
  const feeLibFactory = await ethers.getContractFactory("Fee");
  const Fee = await feeLibFactory.deploy();
  await Fee.deployed();

  const LiquidityPoolFactory = await ethers.getContractFactory("LiquidityPool", {
    libraries: {
      Fee: Fee.address,
    },
  });
  const contract = await upgrades.upgradeProxy(proxyAddress, LiquidityPoolFactory, {
    unsafeAllow: ["external-library-linking"],
  });
  await contract.deployed();
  console.log("LiquidityPool Upgraded");
}

export async function upgradeLiquidityProviders(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory("LiquidityProviders"));
  await contract.deployed();
  console.log("LiquidityProviders Upgraded");
}

export async function upgradeLPToken(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory("LPToken"));
  await contract.deployed();
  console.log("LpToken Upgraded");
}

export async function upgradeWhiteListPeriodManager(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory("WhitelistPeriodManager"));
  await contract.deployed();
  console.log("WhitelistPeriodManager Upgraded");
}

export async function upgradeLiquidityFarming(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory("HyphenLiquidityFarming"));
  await contract.deployed();
  console.log("LiquidityFarming Upgraded");
}

export async function upgradeLiquidityFarmingV2(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(
    proxyAddress,
    await ethers.getContractFactory("HyphenLiquidityFarmingV2")
  );
  await contract.deployed();
  console.log("LiquidityFarmingV2 Upgraded");
}

export async function upgradeTokenManager(proxyAddress: string) {
  const contract = await upgrades.upgradeProxy(proxyAddress, await ethers.getContractFactory("TokenManager"));
  await contract.deployed();
  console.log("TokenManager Upgraded");
}
