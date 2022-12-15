import { expect, use } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  ERC20Token,
  LiquidityPool,
  LiquidityProvidersTest,
  ExecutorManager,
  LPToken,
  WhitelistPeriodManager,
  TokenManager,
  HyphenLiquidityFarming,
  LiquidityPool__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { parseEther } from "ethers/lib/utils";

let { getLocaleString } = require("./utils");

describe("Upgradibility", function () {
  let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
  let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
  let executorManager: ExecutorManager;
  let token: ERC20Token, liquidityPool: LiquidityPool;
  let lpToken: LPToken;
  let wlpm: WhitelistPeriodManager;
  let liquidityProviders: LiquidityProvidersTest;
  let tokenManager: TokenManager;
  let farmingContract: HyphenLiquidityFarming;

  let trustedForwarder = "0xFD4973FeB2031D4409fB57afEE5dF2051b171104";
  let equilibriumFee = 10000000;
  let excessStateFee = 4500000;
  let maxFee = 200000000;
  let tokenAddress: string;
  let tag: string = "HyphenUI";

  const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const minTokenCap = getLocaleString(0.1 * 1e18);
  const maxTokenCap = getLocaleString(200000 * 1e18);
  const minNativeTokenCap = getLocaleString(1e17);
  const maxNativeTokenCap = getLocaleString(25 * 1e18);

  const commuintyPerTokenMaxCap = getLocaleString(500000 * 1e18);
  const tokenMaxCap = getLocaleString(1000000 * 1e18);
  const baseDivisor = ethers.BigNumber.from(10).pow(10);

  const communityPerWalletNativeMaxCap = getLocaleString(1 * 1e18);
  const commuintyPerTokenNativeMaxCap = getLocaleString(100 * 1e18);
  const tokenNativeMaxCap = getLocaleString(200 * 1e18);

  const DEPOSIT_EVENT = "Deposit";
  const ASSET_SENT = "AssetSent";
  const DEPOSIT_TOPIC_ID = "0x5fe47ed6d4225326d3303476197d782ded5a4e9c14f479dc9ec4992af4e85d59";

  let depositHash1: string, depositHash2: string;

  before(async function () {
    [owner, pauser, charlie, bob, tf, executor] = await ethers.getSigners();

    const tokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = (await upgrades.deployProxy(tokenManagerFactory, [
      trustedForwarder,
      pauser.address,
    ])) as TokenManager;

    const executorManagerFactory = await ethers.getContractFactory("ExecutorManager");
    executorManager = await executorManagerFactory.deploy();
    await executorManager.deployed();

    const lpTokenFactory = await ethers.getContractFactory("LPToken");
    lpToken = (await upgrades.deployProxy(lpTokenFactory, [
      "Hyphen LP Token",
      "HPT",
      trustedForwarder,
      pauser.address,
    ])) as LPToken;

    const liquidtyProvidersFactory = await ethers.getContractFactory("LiquidityProvidersOld");
    liquidityProviders = (await upgrades.deployProxy(liquidtyProvidersFactory, [
      trustedForwarder,
      lpToken.address,
      tokenManager.address,
      pauser.address,
    ])) as LiquidityProvidersTest;

    const liquidtyPoolFactory = await ethers.getContractFactory("LiquidityPoolOld");
    liquidityPool = (await upgrades.deployProxy(liquidtyPoolFactory, [
      executorManager.address,
      await pauser.getAddress(),
      trustedForwarder,
      tokenManager.address,
      liquidityProviders.address,
    ])) as LiquidityPool;

    await liquidityPool.deployed();

    await liquidityProviders.setLiquidityPool(liquidityPool.address);

    const erc20factory = await ethers.getContractFactory("ERC20Token");
    token = (await upgrades.deployProxy(erc20factory, ["USDT", "USDT", 18])) as ERC20Token;
    tokenAddress = token.address;

    // Add supported ERC20 token
    await tokenManager
      .connect(owner)
      .addSupportedToken(tokenAddress, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0);

    let tokenDepositConfig = {
      min: minTokenCap,
      max: maxTokenCap,
    };
    await tokenManager.connect(owner).setDepositConfig([1], [tokenAddress], [tokenDepositConfig]);

    // Add supported Native token
    await tokenManager
      .connect(owner)
      .addSupportedToken(NATIVE, minNativeTokenCap, maxNativeTokenCap, equilibriumFee, maxFee, 0);

    let nativeDepositConfig = {
      min: minTokenCap,
      max: maxTokenCap,
    };
    await tokenManager.connect(owner).setDepositConfig([1], [NATIVE], [nativeDepositConfig]);

    await lpToken.setLiquidityProviders(liquidityProviders.address);

    await executorManager.addExecutor(executor.address);

    const wlpmFactory = await ethers.getContractFactory("WhitelistPeriodManager");
    wlpm = (await upgrades.deployProxy(wlpmFactory, [
      trustedForwarder,
      liquidityProviders.address,
      tokenManager.address,
      lpToken.address,
      pauser.address,
    ])) as WhitelistPeriodManager;

    await wlpm.setCaps(
      [token.address, NATIVE],
      [tokenMaxCap, tokenNativeMaxCap],
      [commuintyPerTokenMaxCap, commuintyPerTokenNativeMaxCap]
    );

    await liquidityProviders.setWhiteListPeriodManager(wlpm.address);
    await lpToken.setWhiteListPeriodManager(wlpm.address);

    const farmingFactory = await ethers.getContractFactory("HyphenLiquidityFarmingOld");
    farmingContract = (await upgrades.deployProxy(farmingFactory, [
      tf.address,
      pauser.address,
      liquidityProviders.address,
      lpToken.address,
    ])) as HyphenLiquidityFarming;
    await wlpm.setIsExcludedAddressStatus([farmingContract.address], [true]);

    for (const signer of [owner, bob, charlie]) {
      await token.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
      await token
        .connect(signer)
        .approve(liquidityPool.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
      await token
        .connect(signer)
        .approve(liquidityProviders.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
    }
    await farmingContract.initalizeRewardPool(NATIVE, token.address, 10);
    await farmingContract.initalizeRewardPool(token.address, NATIVE, 10);

    await populateContractsState();
  });

  async function populateContractsState() {
    // Add Liquidity
    await liquidityProviders.connect(owner).addTokenLiquidity(token.address, parseEther("10"));
    await liquidityProviders.connect(owner).addNativeLiquidity({ value: parseEther("10") });

    // Stake
    await lpToken.approve(farmingContract.address, 1);
    await lpToken.approve(farmingContract.address, 2);
    await farmingContract.deposit(1, owner.address);
    await farmingContract.deposit(2, owner.address);

    // Deposit Transaction
    const dr = await liquidityPool.connect(bob).depositErc20(1, token.address, bob.address, parseEther("1"), "test");
    depositHash1 = dr.hash;
    const dr2 = await liquidityPool.connect(bob).depositNative(bob.address, 1, "test", { value: parseEther("1") });
    depositHash2 = dr2.hash;
  }

  it("Should be able to upgrade contracts", async function () {
    const feeLibFactory = await ethers.getContractFactory("Fee");
    const Fee = await feeLibFactory.deploy();
    await Fee.deployed();

    const liquidtyPoolFactory = await ethers.getContractFactory("LiquidityPool", {
      libraries: {
        Fee: Fee.address,
      },
    });

    (
      await upgrades.upgradeProxy(liquidityPool.address, liquidtyPoolFactory, {
        unsafeAllow: ["external-library-linking"],
      })
    ).deployed();
    liquidityPool = LiquidityPool__factory.connect(liquidityPool.address, owner);

    (
      await upgrades.upgradeProxy(liquidityProviders.address, await ethers.getContractFactory("LiquidityProviders"))
    ).deployed();
    (
      await upgrades.upgradeProxy(farmingContract.address, await ethers.getContractFactory("HyphenLiquidityFarming"))
    ).deployed();

    await liquidityProviders.setTokenManager(tokenManager.address);
    await wlpm.setTokenManager(tokenManager.address);

    expect(await liquidityPool.tokenManager()).to.equal(tokenManager.address);

    // Add supported ERC20 token
    await tokenManager
      .connect(owner)
      .addSupportedToken(tokenAddress, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0);

    let tokenDepositConfig = {
      min: minTokenCap,
      max: maxTokenCap,
    };
    await tokenManager.connect(owner).setDepositConfig([1], [tokenAddress], [tokenDepositConfig]);

    // Add supported Native token
    await tokenManager
      .connect(owner)
      .addSupportedToken(NATIVE, minNativeTokenCap, maxNativeTokenCap, equilibriumFee, maxFee, 0);

    let nativeDepositConfig = {
      min: minTokenCap,
      max: maxTokenCap,
    };
    await tokenManager.connect(owner).setDepositConfig([1], [NATIVE], [nativeDepositConfig]);

    await tokenManager.changeExcessStateFee(NATIVE, excessStateFee);
    await tokenManager.changeExcessStateFee(token.address, excessStateFee);
  });

  it("Should be able to unstake tokens", async function () {
    await expect(farmingContract.withdraw(1, owner.address)).to.not.be.reverted;
    await expect(farmingContract.withdraw(2, owner.address)).to.not.be.reverted;
    expect(await lpToken.ownerOf(1)).to.equal(owner.address);
    expect(await lpToken.ownerOf(2)).to.equal(owner.address);
  });

  it("Should be able to process exit transaction", async function () {
    const tokenBalance = await token.balanceOf(owner.address);
    const nativeBalance = await ethers.provider.getBalance(owner.address);

    await expect(
      liquidityPool
        .connect(executor)
        .sendFundsToUserV2(token.address, parseEther("1"), owner.address, depositHash1, 0, 1, 0)
    ).to.not.be.reverted;

    await expect(
      liquidityPool.connect(executor).sendFundsToUserV2(NATIVE, parseEther("1"), owner.address, depositHash2, 0, 1, 0)
    ).to.not.be.reverted;

    expect((await token.balanceOf(owner.address)).gte(tokenBalance)).to.be.true;
    expect((await ethers.provider.getBalance(owner.address)).gte(nativeBalance)).to.be.true;
  });

  it("Should be able to withdraw liquidity", async function () {
    const rewards1 = await liquidityProviders.getFeeAccumulatedOnNft(1);
    const rewards2 = await liquidityProviders.getFeeAccumulatedOnNft(2);
    await expect(() => liquidityProviders.removeLiquidity(1, parseEther("0.05"))).to.changeTokenBalances(
      token,
      [liquidityPool, owner],
      [parseEther("-0.05").sub(rewards1), parseEther("0.05").add(rewards1)]
    );
    await expect(() => liquidityProviders.removeLiquidity(2, parseEther("0.05"))).to.changeEtherBalances(
      [liquidityPool, owner],
      [parseEther("-0.05").sub(rewards2), parseEther("0.05").add(rewards2)]
    );
  });
});
