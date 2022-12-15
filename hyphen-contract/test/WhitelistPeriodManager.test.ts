import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  ERC20Token,
  LiquidityProvidersTest,
  WhitelistPeriodManager,
  LPToken,
  TokenManager,
  ExecutorManager,
  LiquidityPool,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("WhiteListPeriodManager", function () {
  let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
  let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
  let dan: SignerWithAddress, elon: SignerWithAddress;
  let token: ERC20Token;
  let lpToken: LPToken;
  let tokenManager: TokenManager;
  let executorManager: ExecutorManager;
  let wlpm: WhitelistPeriodManager;
  let liquidityProviders: LiquidityProvidersTest;
  let liquidityPool: LiquidityPool;
  let trustedForwarder = "0xFD4973FeB2031D4409fB57afEE5dF2051b171104";

  beforeEach(async function () {
    [owner, pauser, charlie, bob, dan, elon, tf, , executor] = await ethers.getSigners();

    tokenManager = (await upgrades.deployProxy(await ethers.getContractFactory("TokenManager"), [
      tf.address,
      pauser.address,
    ])) as TokenManager;
    await tokenManager.deployed();

    const erc20factory = await ethers.getContractFactory("ERC20Token");
    token = (await upgrades.deployProxy(erc20factory, ["USDT", "USDT", 18])) as ERC20Token;
    for (const signer of [owner, bob, charlie, dan, elon]) {
      await token.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
    }
    await tokenManager.addSupportedToken(token.address, BigNumber.from(1), BigNumber.from(10).pow(30), 0, 0, 0);

    const executorManagerFactory = await ethers.getContractFactory("ExecutorManager");
    executorManager = await executorManagerFactory.deploy();

    const lpTokenFactory = await ethers.getContractFactory("LPToken");
    lpToken = (await upgrades.deployProxy(lpTokenFactory, [
      "LPToken",
      "LPToken",
      tf.address,
      pauser.address,
    ])) as LPToken;

    const liquidtyProvidersFactory = await ethers.getContractFactory("LiquidityProvidersTest");
    liquidityProviders = (await upgrades.deployProxy(liquidtyProvidersFactory, [
      trustedForwarder,
      lpToken.address,
      tokenManager.address,
      pauser.address,
    ])) as LiquidityProvidersTest;
    await liquidityProviders.deployed();
    await lpToken.setLiquidityProviders(liquidityProviders.address);
    await liquidityProviders.setLpToken(lpToken.address);

    const wlpmFactory = await ethers.getContractFactory("WhitelistPeriodManager");
    wlpm = (await upgrades.deployProxy(wlpmFactory, [
      tf.address,
      liquidityProviders.address,
      tokenManager.address,
      lpToken.address,
      pauser.address,
    ])) as WhitelistPeriodManager;
    await wlpm.setLiquidityProviders(liquidityProviders.address);
    await liquidityProviders.setWhiteListPeriodManager(wlpm.address);
    await lpToken.setWhiteListPeriodManager(wlpm.address);
    await wlpm.setAreWhiteListRestrictionsEnabled(true);

    const feeLibFactory = await ethers.getContractFactory("Fee");
    const Fee = await feeLibFactory.deploy();
    await Fee.deployed();

    const liquidtyPoolFactory = await ethers.getContractFactory("LiquidityPool", {
      libraries: {
        Fee: Fee.address,
      },
    });
    liquidityPool = (await upgrades.deployProxy(
      liquidtyPoolFactory,
      [
        executorManager.address,
        await pauser.getAddress(),
        trustedForwarder,
        tokenManager.address,
        liquidityProviders.address,
      ],
      {
        unsafeAllow: ["external-library-linking"],
      }
    )) as LiquidityPool;

    await liquidityProviders.setLiquidityPool(liquidityPool.address);

    for (const signer of [owner, bob, charlie, dan, elon]) {
      await token.connect(signer).approve(liquidityProviders.address, await token.balanceOf(signer.address));
    }
  });

  describe("Setup", async function () {
    it("Should set Token Caps properly", async function () {
      await wlpm.setCaps([token.address], [1000], [500]);
      expect(await wlpm.perTokenTotalCap(token.address)).to.equal(1000);
      expect(await wlpm.perTokenWalletCap(token.address)).to.equal(500);
    });

    it("Should revert if invalid caps are provided", async function () {
      await expect(wlpm.setCaps([token.address], [1000], [1001])).to.be.revertedWith("ERR__PWC_GT_PTTC");
    });

    it("Should revert if invalid total cap is provided", async function () {
      await wlpm.setCaps([token.address], [1000], [500]);
      await expect(wlpm.setTotalCap(token.address, 499)).to.be.revertedWith("ERR__TOTAL_CAP_LT_PTWC");
    });

    it("Should revert if invalid per wallet cap is provided", async function () {
      await wlpm.setCaps([token.address], [1000], [500]);
      await expect(wlpm.setPerTokenWalletCap(token.address, 1001)).to.be.revertedWith("ERR__PWC_GT_PTTC");
    });
  });

  describe("With Sample Caps", async function () {
    this.beforeEach(async function () {
      await wlpm.setCaps([token.address], [25], [10]);
    });

    it("Should allow LPs to add liquidity within per wallet capacity", async function () {
      await expect(liquidityProviders.addTokenLiquidity(token.address, 10)).to.not.be.reverted;
      await expect(liquidityProviders.connect(bob).addTokenLiquidity(token.address, 5)).to.not.be.reverted;
    });

    it("Should allow LP to increase liquidity to same NFT within cap", async function () {
      await expect(liquidityProviders.addTokenLiquidity(token.address, 5)).to.not.be.reverted;
      await expect(liquidityProviders.increaseTokenLiquidity(1, 5)).to.not.be.reverted;
    });

    it("Should prevent multiple LPs to exceed global cap", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 9);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 9);
      await expect(liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 9)).to.be.revertedWith(
        "ERR__LIQUIDITY_EXCEEDS_PTTC"
      );
      await expect(liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 7)).to.not.be.reverted;
    });

    it("Should prevent multiple LPs to exceed global cap - 2", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 9);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 9);
      await liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 7);
      await expect(liquidityProviders.connect(charlie).increaseTokenLiquidity(3, 1)).to.be.revertedWith(
        "ERR__LIQUIDITY_EXCEEDS_PTTC"
      );
    });

    it("Should allow LPs to add more liquidity within cap after removing", async function () {
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 10)).to.not.be.reverted;
      await liquidityProviders.removeLiquidity(1, 5);
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 5)).to.not.be.reverted;
    });

    it("Should allow LPs to add more Liquidity after transferring their NFT", async function () {
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 10)).to.not.be.reverted;
      await lpToken.transferFrom(owner.address, bob.address, 1);
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 10)).to.not.be.reverted;
    });
  });

  describe("Cap Manipulation", async function () {
    this.beforeEach(async function () {
      await wlpm.setCaps([token.address], [25], [10]);
    });

    it("Should prevent setting total cap below current contribution", async function () {
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 5)).to.not.be.reverted;
      await expect(liquidityProviders.connect(bob).addTokenLiquidity(token.address, 6)).to.not.be.reverted;
      await expect(wlpm.setTotalCap(token.address, 11)).to.not.be.reverted;
      await expect(wlpm.setTotalCap(token.address, 10)).to.be.revertedWith("ERR__TOTAL_CAP_LESS_THAN_SL");
    });

    it("Should allow member to add more liquidity after increasing cap", async function () {
      await expect(liquidityProviders.connect(owner).addTokenLiquidity(token.address, 10)).to.not.be.reverted;
      await expect(liquidityProviders.connect(bob).addTokenLiquidity(token.address, 10)).to.not.be.reverted;
      await expect(liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 5)).to.not.be.reverted;
      await expect(liquidityProviders.connect(charlie).increaseTokenLiquidity(3, 5)).to.be.revertedWith(
        "ERR__LIQUIDITY_EXCEEDS_PTTC"
      );
      await wlpm.setTotalCap(token.address, 30);
      await expect(liquidityProviders.connect(charlie).increaseTokenLiquidity(3, 5)).to.not.be.reverted;
    });
  });
});
