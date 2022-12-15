import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  ERC20Token,
  LiquidityPool,
  LiquidityProvidersTest,
  WhitelistPeriodManager,
  LPToken,
  ExecutorManager,
  TokenManager,
  HyphenLiquidityFarming,
  HyphenLiquidityFarmingV2,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, Signer } from "ethers";

import { getLocaleString } from "./utils";

const advanceTime = async (secondsToAdvance: number) => {
  await ethers.provider.send("evm_increaseTime", [secondsToAdvance]);
  await ethers.provider.send("evm_mine", []);
};

const getElapsedTime = async (callable: any): Promise<number> => {
  const { timestamp: start } = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  await callable();
  const { timestamp: end } = await ethers.provider.getBlock(await ethers.provider.getBlockNumber());
  return end - start;
};

describe("LiquidityFarmingV2Tests", function () {
  let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
  let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
  let token: ERC20Token, token2: ERC20Token;
  let lpToken: LPToken;
  let wlpm: WhitelistPeriodManager;
  let liquidityProviders: LiquidityProvidersTest;
  let liquidityPool: LiquidityPool;
  let executorManager: ExecutorManager;
  let tokenManager: TokenManager;
  let farmingContract: HyphenLiquidityFarmingV2;
  let trustedForwarder = "0xFD4973FeB2031D4409fB57afEE5dF2051b171104";
  const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  let BASE: BigNumber = BigNumber.from(10).pow(18);

  const perWalletMaxCap = getLocaleString(1 * 1e18);
  const tokenMaxCap = getLocaleString(1 * 1e18);

  const perWalletNativeMaxCap = getLocaleString(1 * 1e18);
  const tokenNativeMaxCap = getLocaleString(200 * 1e18);

  beforeEach(async function () {
    [owner, pauser, charlie, bob, tf, , executor] = await ethers.getSigners();

    tokenManager = (await upgrades.deployProxy(await ethers.getContractFactory("TokenManager"), [
      tf.address,
      pauser.address,
    ])) as TokenManager;
    await tokenManager.deployed();

    const erc20factory = await ethers.getContractFactory("ERC20Token");
    token = (await upgrades.deployProxy(erc20factory, ["USDT", "USDT", 18])) as ERC20Token;
    token2 = (await upgrades.deployProxy(erc20factory, ["USDC", "USDC", 6])) as ERC20Token;
    for (const signer of [owner, bob, charlie]) {
      await token.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
      await token2.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
    }
    await tokenManager.addSupportedToken(token.address, BigNumber.from(1), BigNumber.from(10).pow(30), 0, 0, 0);
    await tokenManager.addSupportedToken(token2.address, BigNumber.from(1), BigNumber.from(10).pow(30), 0, 0, 0);
    await tokenManager.addSupportedToken(NATIVE, BigNumber.from(1), BigNumber.from(10).pow(30), 0, 0, 0);

    const executorManagerFactory = await ethers.getContractFactory("ExecutorManager");
    executorManager = (await executorManagerFactory.deploy()) as ExecutorManager;

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
    await wlpm.setCaps(
      [token.address, token2.address, NATIVE],
      [tokenMaxCap, tokenMaxCap, tokenNativeMaxCap],
      [perWalletMaxCap, perWalletMaxCap, perWalletNativeMaxCap]
    );
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

    const farmingFactory = await ethers.getContractFactory("HyphenLiquidityFarmingV2");
    farmingContract = (await upgrades.deployProxy(farmingFactory, [
      tf.address,
      pauser.address,
      liquidityProviders.address,
      lpToken.address,
    ])) as HyphenLiquidityFarmingV2;
    await wlpm.setIsExcludedAddressStatus([farmingContract.address], [true]);
  });

  describe("Deposit", async () => {
    beforeEach(async function () {
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);

      for (const signer of [owner, bob, charlie]) {
        await lpToken.connect(signer).setApprovalForAll(farmingContract.address, true);
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }

      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 10);
      await liquidityProviders.connect(charlie).addTokenLiquidity(token2.address, 10);
    });

    it("Should be able to deposit lp tokens", async function () {
      await farmingContract.deposit(1, owner.address);
      expect(await farmingContract.pendingToken(token.address, token2.address)).to.equal(0);
      expect(await farmingContract.getNftIdsStaked(owner.address)).to.deep.equal([1].map(BigNumber.from));
    });

    it("Should be able to deposit lp tokens on behalf of another account", async function () {
      await farmingContract.deposit(1, bob.address);
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(0);
      expect(await farmingContract.getNftIdsStaked(bob.address)).to.deep.equal([1].map(BigNumber.from));
      expect((await farmingContract.getNftIdsStaked(owner.address)).length).to.equal(0);
    });

    it("Should not be able to deposit LP token of un-initialized pools", async function () {
      await expect(farmingContract.deposit(2, owner.address)).to.be.revertedWith("ERR__POOL_NOT_INITIALIZED");
      expect(await farmingContract.getNftIdsStaked(owner.address)).to.deep.equal([]);
    });

    it("Should be able to accrue token rewards", async function () {
      await farmingContract.deposit(1, owner.address);
      const time = await getElapsedTime(async () => {
        await advanceTime(100);
      });
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(time * 10);
    });

    it("Should be able to create deposits in different tokens", async function () {
      await farmingContract.setRewardPerSecond(token2.address, token.address, 10);
      await farmingContract.deposit(1, owner.address);
      const time = await getElapsedTime(async () => {
        await advanceTime(100);
        await farmingContract.deposit(2, owner.address);
        await advanceTime(100);
      });
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(time * 10);
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(1000);
      expect(await farmingContract.getNftIdsStaked(owner.address)).to.deep.equal([1, 2].map(BigNumber.from));
    });

    it("Should be able to fetch correct nft index", async function () {
      await farmingContract.setRewardPerSecond(token2.address, token.address, 10);
      await farmingContract.deposit(1, owner.address);
      await farmingContract.deposit(2, owner.address);
      await farmingContract.connect(bob).deposit(3, bob.address);
      await farmingContract.connect(bob).deposit(4, bob.address);
      await farmingContract.connect(charlie).deposit(5, charlie.address);
      await farmingContract.connect(charlie).deposit(6, charlie.address);

      expect(await farmingContract.getStakedNftIndex(owner.address, 1)).to.equal(0);
      expect(await farmingContract.getStakedNftIndex(owner.address, 2)).to.equal(1);
      expect(await farmingContract.getStakedNftIndex(bob.address, 3)).to.equal(0);
      expect(await farmingContract.getStakedNftIndex(bob.address, 4)).to.equal(1);
      expect(await farmingContract.getStakedNftIndex(charlie.address, 5)).to.equal(0);
      expect(await farmingContract.getStakedNftIndex(charlie.address, 6)).to.equal(1);

      await expect(farmingContract.getStakedNftIndex(owner.address, 3)).to.be.revertedWith("ERR__NFT_NOT_STAKED");
      await expect(farmingContract.getStakedNftIndex(bob.address, 1)).to.be.revertedWith("ERR__NFT_NOT_STAKED");
      await expect(farmingContract.getStakedNftIndex(charlie.address, 4)).to.be.revertedWith("ERR__NFT_NOT_STAKED");
    });
  });

  describe("Withdraw", async () => {
    beforeEach(async function () {
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);

      for (const signer of [owner, bob, charlie]) {
        await lpToken.connect(signer).setApprovalForAll(farmingContract.address, true);
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }

      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
    });

    it("Should be able to withdraw nft", async function () {
      await farmingContract.deposit(1, owner.address);
      await token2.transfer(farmingContract.address, 10000000);
      expect(await farmingContract.getNftIdsStaked(owner.address)).to.deep.equal([1].map(BigNumber.from));
      await expect(farmingContract.withdraw(1, owner.address)).to.emit(farmingContract, "LogWithdraw");
      expect(await lpToken.ownerOf(1)).to.equal(owner.address);
    });

    it("Should prevent non owner from withdrawing nft", async function () {
      await farmingContract.deposit(1, bob.address);
      await expect(farmingContract.connect(owner).withdraw(1, owner.address)).to.be.revertedWith("ERR__NFT_NOT_STAKED");
      await expect(farmingContract.connect(bob).withdraw(2, bob.address)).to.be.revertedWith("ERR__NFT_NOT_STAKED");
    });
  });

  describe("Rewards", async () => {
    beforeEach(async function () {
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token2.address, token.address, 15);

      for (const signer of [owner, bob, charlie]) {
        await lpToken.connect(signer).setApprovalForAll(farmingContract.address, true);
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }
    });

    it("Should prevent others from claiming rewards", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      expect((await farmingContract.pendingToken(1, token2.address)).toNumber()).to.be.greaterThan(0);
      await expect(farmingContract.connect(bob).extractRewards(1, [token2.address], bob.address)).to.be.revertedWith(
        "ERR__NOT_OWNER"
      );
    });

    it("Should prevent others from withdrawing using v2", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 10);
      await farmingContract.deposit(1, owner.address);
      await farmingContract.connect(bob).deposit(2, bob.address);
      await expect(farmingContract.connect(bob).withdrawAtIndex(1, bob.address, 0)).to.be.revertedWith(
        "ERR__NOT_OWNER"
      );
    });

    it("Should be able to calculate correct rewards correctly", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 30);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 30);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = await getElapsedTime(async () => {
        await farmingContract.deposit(2, owner.address);
      });
      await advanceTime(300);
      const time2 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(3, bob.address);
      });
      await advanceTime(500);
      const time3 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(4, bob.address);
      });
      await advanceTime(900);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(
        Math.floor(10 * (100 + time1 + 300 + time2 + 500 / 4 + time3 / 4 + 900 / 4))
      );
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 4))
      );
      expect(await farmingContract.pendingToken(3, token2.address)).to.equal(
        Math.floor(10 * ((500 * 3) / 4 + (time3 * 3) / 4 + (900 * 3) / 4))
      );
      expect(await farmingContract.pendingToken(4, token.address)).to.equal(Math.floor(15 * ((900 * 3) / 4)));
    });

    it("Should be able to calculate correct rewards correctly - 2", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 20);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 20);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = await getElapsedTime(async () => {
        await farmingContract.deposit(2, owner.address);
      });
      await advanceTime(300);
      const time2 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(3, bob.address);
      });
      await advanceTime(500);
      const time3 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(4, bob.address);
      });
      await advanceTime(900);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(
        Math.floor(100 * 10 + time1 * 10 + 300 * 10 + time2 * 10 + (500 * 10) / 3 + (time3 * 10) / 3 + (900 * 10) / 3)
      );
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 3))
      );
      expect(await farmingContract.pendingToken(3, token2.address)).to.equal(
        Math.floor((500 * 2 * 10) / 3 + (time3 * 2 * 10) / 3 + (900 * 2 * 10) / 3)
      );
      expect(await farmingContract.pendingToken(4, token.address)).to.equal(Math.floor(15 * ((900 * 2) / 3)));
    });

    it("Should be able to calculate correct rewards correctly - 3", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 60);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 60);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = await getElapsedTime(async () => {
        await farmingContract.deposit(2, owner.address);
      });
      await advanceTime(300);
      const time2 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(3, bob.address);
      });
      await advanceTime(500);
      const time3 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(4, bob.address);
      });
      await advanceTime(900);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(
        Math.floor(100 * 10 + time1 * 10 + 300 * 10 + time2 * 10 + (500 * 10) / 7 + (time3 * 10) / 7 + (900 * 10) / 7)
      );
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 7))
      );
      expect(await farmingContract.pendingToken(3, token2.address)).to.equal(
        Math.floor((500 * 6 * 10) / 7 + (time3 * 6 * 10) / 7 + (900 * 6 * 10) / 7)
      );
      expect(await farmingContract.pendingToken(4, token.address)).to.equal(Math.floor(15 * ((900 * 6) / 7)));
    });

    it("Should be able to send correct amount of rewards", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 60);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 60);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = await getElapsedTime(async () => {
        await farmingContract.deposit(2, owner.address);
      });
      await advanceTime(300);
      const time2 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(3, bob.address);
      });
      await advanceTime(500);
      const time3 = await getElapsedTime(async () => {
        await farmingContract.connect(bob).deposit(4, bob.address);
      });
      await advanceTime(900);

      const expectedRewards = [
        Math.floor(
          100 * 10 +
            time1 * 10 +
            300 * 10 +
            time2 * 10 +
            (500 * 10) / 7 +
            (time3 * 10) / 7 +
            (900 * 10) / 7 +
            (3 * 10) / 7
        ),
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 7) + (4 * 15) / 7),
        Math.floor((500 * 6 * 10) / 7 + (time3 * 6 * 10) / 7 + (900 * 6 * 10) / 7 + (5 * 6 * 10) / 7),
        Math.floor(15 * ((900 * 6) / 7) + (6 * 15 * 6) / 7),
      ];

      await token.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));
      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await expect(() => farmingContract.extractRewards(1, [token2.address], owner.address)).to.changeTokenBalances(
        token2,
        [farmingContract, owner],
        [-expectedRewards[0], expectedRewards[0]]
      );
      await expect(() => farmingContract.extractRewards(2, [token.address], owner.address)).to.changeTokenBalances(
        token,
        [farmingContract, owner],
        [-expectedRewards[1], expectedRewards[1]]
      );
      await expect(() =>
        farmingContract.connect(bob).extractRewards(3, [token2.address], bob.address)
      ).to.changeTokenBalances(token2, [farmingContract, bob], [-expectedRewards[2], expectedRewards[2]]);
      await expect(() =>
        farmingContract.connect(bob).extractRewards(4, [token.address], bob.address)
      ).to.changeTokenBalances(token, [farmingContract, bob], [-expectedRewards[3], expectedRewards[3]]);

      expect((await farmingContract.pendingToken(1, token2.address)).toNumber()).to.greaterThan(0);
      expect((await farmingContract.pendingToken(2, token.address)).toNumber()).to.greaterThan(0);
      expect((await farmingContract.pendingToken(3, token2.address)).toNumber()).to.greaterThan(0);
      expect((await farmingContract.pendingToken(4, token.address)).toNumber()).to.equal(0);

      expect((await farmingContract.nftInfo(1)).isStaked).to.be.true;
      expect((await farmingContract.nftInfo(2)).isStaked).to.be.true;
      expect((await farmingContract.nftInfo(3)).isStaked).to.be.true;
      expect((await farmingContract.nftInfo(4)).isStaked).to.be.true;
    });

    it("Extraction of Rewards on 1 token should not affect the other", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token.address, 10);

      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      await farmingContract.deposit(2, owner.address);
      await advanceTime(100);
      await farmingContract.withdraw(2, owner.address);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(
        Math.floor(100 * 10 + 1 * 10 + (100 * 10) / 2 + (1 * 10) / 2)
      );
      expect((await farmingContract.nftInfo(1)).isStaked).to.be.true;
    });

    it("Should be able to send correct amount of rewards to delegatee while withdrawing lp token immediately if available", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token.address, 10);

      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      await expect(() => farmingContract.withdraw(1, bob.address)).to.changeTokenBalances(
        token2,
        [farmingContract, bob],
        [-1010, 1010]
      );
    });

    it("Should be able to send correct amount of rewards while withdrawing", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 60);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 60);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = 1;
      await farmingContract.deposit(2, owner.address);
      await advanceTime(300);
      const time2 = 1;
      await farmingContract.connect(bob).deposit(3, bob.address);

      await advanceTime(500);
      const time3 = 1;
      await farmingContract.connect(bob).deposit(4, bob.address);
      await advanceTime(900);

      const expectedRewards = [
        Math.floor(
          100 * 10 +
            time1 * 10 +
            300 * 10 +
            time2 * 10 +
            (500 * 10) / 7 +
            (time3 * 10) / 7 +
            (900 * 10) / 7 +
            (3 * 10) / 7
        ),
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 7) + (4 * 15) / 7),
        Math.floor((500 * 6 * 10 + time3 * 6 * 10 + 900 * 6 * 10 + 3 * 6 * 10 + 2 * 7 * 10) / 7),
        Math.floor(15 * ((900 * 6) / 7) + (4 * 15 * 6) / 7 + 2 * 15),
      ];

      await token.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));
      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeTokenBalances(
        token2,
        [farmingContract, owner],
        [-expectedRewards[0], expectedRewards[0]]
      );
      await expect(() => farmingContract.withdraw(2, owner.address)).to.changeTokenBalances(
        token,
        [farmingContract, owner],
        [-expectedRewards[1], expectedRewards[1]]
      );
      await expect(() => farmingContract.connect(bob).withdraw(3, bob.address)).to.changeTokenBalances(
        token2,
        [farmingContract, bob],
        [-expectedRewards[2], expectedRewards[2]]
      );
      await expect(() => farmingContract.connect(bob).withdraw(4, bob.address)).to.changeTokenBalances(
        token,
        [farmingContract, bob],
        [-expectedRewards[3], expectedRewards[3]]
      );

      expect(await lpToken.ownerOf(1)).to.equal(owner.address);
      expect(await lpToken.ownerOf(2)).to.equal(owner.address);
      expect(await lpToken.ownerOf(3)).to.equal(bob.address);
      expect(await lpToken.ownerOf(4)).to.equal(bob.address);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(0);
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(0);
      expect(await farmingContract.pendingToken(3, token2.address)).to.equal(0);
      expect(await farmingContract.pendingToken(4, token.address)).to.equal(0);

      expect((await farmingContract.nftInfo(1)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(2)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(3)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(4)).isStaked).to.be.false;
    });

    it("Should be able to withdrawing using withdraw v2", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 60);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 60);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      const time1 = 1;
      await farmingContract.deposit(2, owner.address);
      await advanceTime(300);
      const time2 = 1;
      await farmingContract.connect(bob).deposit(3, bob.address);

      await advanceTime(500);
      const time3 = 1;
      await farmingContract.connect(bob).deposit(4, bob.address);
      await advanceTime(900);

      const expectedRewards = [
        Math.floor(
          100 * 10 +
            time1 * 10 +
            300 * 10 +
            time2 * 10 +
            (500 * 10) / 7 +
            (time3 * 10) / 7 +
            (900 * 10) / 7 +
            (3 * 10) / 7
        ),
        Math.floor(15 * (300 + time2 + 500 + time3 + 900 / 7) + (4 * 15) / 7),
        Math.floor((500 * 6 * 10 + time3 * 6 * 10 + 900 * 6 * 10 + 3 * 6 * 10 + 2 * 7 * 10) / 7),
        Math.floor(15 * ((900 * 6) / 7) + (4 * 15 * 6) / 7 + 2 * 15),
      ];

      await token.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));
      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      let index = await farmingContract.getStakedNftIndex(owner.address, 1);
      await expect(() => farmingContract.withdrawAtIndex(1, owner.address, index)).to.changeTokenBalances(
        token2,
        [farmingContract, owner],
        [-expectedRewards[0], expectedRewards[0]]
      );
      index = await farmingContract.getStakedNftIndex(owner.address, 2);
      await expect(() => farmingContract.withdrawAtIndex(2, owner.address, index)).to.changeTokenBalances(
        token,
        [farmingContract, owner],
        [-expectedRewards[1], expectedRewards[1]]
      );
      index = await farmingContract.getStakedNftIndex(bob.address, 3);
      await expect(() => farmingContract.connect(bob).withdrawAtIndex(3, bob.address, index)).to.changeTokenBalances(
        token2,
        [farmingContract, bob],
        [-expectedRewards[2], expectedRewards[2]]
      );
      index = await farmingContract.getStakedNftIndex(bob.address, 4);
      await expect(() => farmingContract.connect(bob).withdrawAtIndex(4, bob.address, index)).to.changeTokenBalances(
        token,
        [farmingContract, bob],
        [-expectedRewards[3], expectedRewards[3]]
      );

      expect(await lpToken.ownerOf(1)).to.equal(owner.address);
      expect(await lpToken.ownerOf(2)).to.equal(owner.address);
      expect(await lpToken.ownerOf(3)).to.equal(bob.address);
      expect(await lpToken.ownerOf(4)).to.equal(bob.address);

      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(0);
      expect(await farmingContract.pendingToken(2, token.address)).to.equal(0);
      expect(await farmingContract.pendingToken(3, token2.address)).to.equal(0);
      expect(await farmingContract.pendingToken(4, token.address)).to.equal(0);

      expect((await farmingContract.nftInfo(1)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(2)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(3)).isStaked).to.be.false;
      expect((await farmingContract.nftInfo(4)).isStaked).to.be.false;
    });

    it("Should be able to send correct amount of rewards while withdrawing lp token immediately if available", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);

      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeTokenBalances(
        token2,
        [farmingContract, owner],
        [-1010, 1010]
      );
    });

    it("Should be able to send correct amount to delegatee of rewards while withdrawing lp token immediately if available", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);

      await token2.transfer(farmingContract.address, ethers.BigNumber.from(10).pow(18));

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      await expect(() => farmingContract.withdraw(1, bob.address)).to.changeTokenBalances(
        token2,
        [farmingContract, bob],
        [-1010, 1010]
      );

      expect(await lpToken.ownerOf(1)).to.equal(owner.address);
    });
  });

  describe("Rewards - NATIVE", async () => {
    beforeEach(async function () {
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 10);
      await farmingContract.setRewardPerSecond(token2.address, NATIVE, 15);

      for (const signer of [owner, bob, charlie]) {
        await lpToken.connect(signer).setApprovalForAll(farmingContract.address, true);
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }
    });

    it("Should be able to send correct amount of rewards", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.addTokenLiquidity(token2.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 60);
      await liquidityProviders.connect(bob).addTokenLiquidity(token2.address, 60);

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      await farmingContract.deposit(2, owner.address);
      await advanceTime(300);
      await farmingContract.connect(bob).deposit(3, bob.address);
      await advanceTime(500);
      await farmingContract.connect(bob).deposit(4, bob.address);
      await advanceTime(900);

      const expectedRewards = [
        Math.floor(
          100 * 10 + 1 * 10 + 300 * 10 + 1 * 10 + (500 * 10) / 7 + (1 * 10) / 7 + (900 * 10) / 7 + (2 * 10) / 7
        ),
        Math.floor(15 * (300 + 1 + 500 + 1 + (900 + 3) / 7)),
        Math.floor((500 * 6 * 10 + 1 * 6 * 10 + 900 * 6 * 10 + 2 * 6 * 10 + 2 * 7 * 10) / 7),
        Math.floor(15 * ((900 * 6) / 7) + (3 * 15 * 6) / 7 + 2 * 15),
      ];

      await owner.sendTransaction({
        to: farmingContract.address,
        value: ethers.BigNumber.from(10).pow(18),
      });

      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-expectedRewards[0], expectedRewards[0]]
      );
      await expect(() => farmingContract.withdraw(2, owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-expectedRewards[1], expectedRewards[1]]
      );
      await expect(() => farmingContract.connect(bob).withdraw(3, bob.address)).to.changeEtherBalances(
        [farmingContract, bob],
        [-expectedRewards[2], expectedRewards[2]]
      );
      await expect(() => farmingContract.connect(bob).withdraw(4, bob.address)).to.changeEtherBalances(
        [farmingContract, bob],
        [-expectedRewards[3], expectedRewards[3]]
      );
    });
  });

  describe("Reward Rate updation", async () => {
    beforeEach(async () => {
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 10);
      await farmingContract.setRewardPerSecond(token2.address, NATIVE, 15);

      for (const signer of [owner, bob, charlie]) {
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }
    });

    it("Should not invalidate pending rewards on reward rate updation", async function () {
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await liquidityProviders.connect(bob).addTokenLiquidity(token.address, 10);
      await liquidityProviders.connect(charlie).addTokenLiquidity(token.address, 20);

      await lpToken.approve(farmingContract.address, 1);
      await lpToken.connect(bob).approve(farmingContract.address, 2);
      await lpToken.connect(charlie).approve(farmingContract.address, 3);

      let rewardOwner = 0,
        rewardBob = 0,
        rewardCharlie = 0;

      await owner.sendTransaction({ to: farmingContract.address, value: ethers.BigNumber.from(10).pow(18) });

      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 10 * 100));
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await advanceTime(100);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 10 * 1 + 20 * 100));
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 16);
      await advanceTime(100);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 20 * 1 + 16 * 100));

      await farmingContract.connect(bob).deposit(2, bob.address);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 16));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal(rewardBob);
      await advanceTime(150);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += (16 * 150) / 2));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += (16 * 150) / 2));
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 0);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 16 / 2));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += 16 / 2));
      await advanceTime(1000);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal(rewardOwner);
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal(rewardBob);
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 100);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal(rewardOwner);
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal(rewardBob);
      await advanceTime(500);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += (100 * 500) / 2));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += (100 * 500) / 2));

      await farmingContract.connect(charlie).deposit(3, charlie.address);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 100 / 2));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += 100 / 2));
      expect(await farmingContract.pendingToken(3, NATIVE)).to.equal(rewardCharlie);
      await advanceTime(500);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += (100 * 500) / 4));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += (100 * 500) / 4));
      expect(await farmingContract.pendingToken(3, NATIVE)).to.equal((rewardCharlie += (100 * 500) / 2));
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 600);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += 100 / 4));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += 100 / 4));
      expect(await farmingContract.pendingToken(3, NATIVE)).to.equal((rewardCharlie += 100 / 2));
      await advanceTime(600);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal((rewardOwner += (600 * 600) / 4));
      expect(await farmingContract.pendingToken(2, NATIVE)).to.equal((rewardBob += (600 * 600) / 4));
      expect(await farmingContract.pendingToken(3, NATIVE)).to.equal((rewardCharlie += (600 * 600) / 2));

      await expect(() => farmingContract.extractRewards(1, [NATIVE], owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(rewardOwner + 600 / 4), rewardOwner + 600 / 4]
      );
      rewardOwner = 0;
      rewardBob += 600 / 4;
      rewardCharlie += 600 / 2;
      await expect(() => farmingContract.connect(bob).withdraw(2, bob.address)).to.changeEtherBalances(
        [farmingContract, bob],
        [-(rewardBob + 600 / 4), rewardBob + 600 / 4]
      );
      rewardOwner += 600 / 4;
      rewardCharlie += (600 * 2) / 4;
      await expect(() => farmingContract.connect(charlie).withdraw(3, charlie.address)).to.changeEtherBalances(
        [farmingContract, charlie],
        [-(rewardCharlie + (600 * 2) / 3), rewardCharlie + (600 * 2) / 3]
      );
      rewardOwner += 600 / 3;
      await expect(() => farmingContract.extractRewards(1, [NATIVE], owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(rewardOwner + 600), rewardOwner + 600]
      );
    });
  });

  describe("Multi Token Rewards", async function () {
    beforeEach(async () => {
      for (const signer of [owner, bob, charlie]) {
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await lpToken.setApprovalForAll(farmingContract.address, true);
    });

    it("Should set rewards in multiple tokens correctly", async function () {
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      expect(await farmingContract.getRewardTokens(token.address)).to.deep.equal([token2.address]);
      expect(await farmingContract.getRewardRatePerSecond(token.address, token2.address)).to.equal(10);
      expect(await farmingContract.getRewardRatePerSecond(token.address, NATIVE)).to.equal(0);

      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      expect(await farmingContract.getRewardTokens(token.address)).to.deep.equal([token2.address, NATIVE]);
      expect(await farmingContract.getRewardRatePerSecond(token.address, token2.address)).to.equal(10);
      expect(await farmingContract.getRewardRatePerSecond(token.address, NATIVE)).to.equal(20);
    });

    it("Should calculate rewards in multiple tokens correctly", async function () {
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await farmingContract.deposit(1, owner.address);
      await advanceTime(100);
      expect(await farmingContract.pendingToken(1, token.address)).to.equal(0);
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(10 * 100);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal(20 * 100);
    });

    it("Should extract rewards in multiple tokens correctly", async function () {
      await token2.transfer(farmingContract.address, 10000000);
      await owner.sendTransaction({ to: farmingContract.address, value: 1000000 });
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await farmingContract.deposit(1, owner.address);

      await advanceTime(100);
      await expect(() => farmingContract.extractRewards(1, [token2.address], owner.address)).to.changeTokenBalances(
        token2,
        [farmingContract, owner],
        [-(10 * 101), 10 * 101]
      );
      await expect(() => farmingContract.extractRewards(1, [NATIVE], owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(20 * 102), 20 * 102]
      );
      await advanceTime(100);
      const token2Balance = await token2.balanceOf(owner.address);
      await expect(() =>
        farmingContract.extractRewards(1, [NATIVE, token2.address], owner.address)
      ).to.changeEtherBalances([farmingContract, owner], [-(20 * 101), 20 * 101]);
      expect(await token2.balanceOf(owner.address)).to.equal(token2Balance.add(10 * 102));
    });

    it("Should extract rewards in all tokens when withdrawing NFT", async function () {
      await token2.transfer(farmingContract.address, 10000000);
      await owner.sendTransaction({ to: farmingContract.address, value: 1000000 });
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await farmingContract.deposit(1, owner.address);

      await advanceTime(100);
      const token2Balance = await token2.balanceOf(owner.address);
      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(20 * 101), 20 * 101]
      );
      expect(await token2.balanceOf(owner.address)).to.equal(token2Balance.add(10 * 101));
    });

    it("Should be able to claim rewards in token added after staking", async function () {
      await token2.transfer(farmingContract.address, 10000000);
      await owner.sendTransaction({ to: farmingContract.address, value: 1000000 });

      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.deposit(1, owner.address);

      await advanceTime(100);
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(100 * 10);

      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await advanceTime(200);
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(301 * 10);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal(200 * 20);
      await farmingContract.setRewardPerSecond(token.address, token2.address, 0);

      await advanceTime(500);
      expect(await farmingContract.pendingToken(1, token2.address)).to.equal(302 * 10);
      expect(await farmingContract.pendingToken(1, NATIVE)).to.equal(701 * 20);

      const token2Balance = await token2.balanceOf(owner.address);
      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(20 * 702), 20 * 702]
      );
      expect(await token2.balanceOf(owner.address)).to.equal(token2Balance.add(10 * 302));
    });
  });

  describe("Migration", async function () {
    let farmingContractV1: HyphenLiquidityFarming;
    beforeEach(async () => {
      farmingContractV1 = (await upgrades.deployProxy(await ethers.getContractFactory("HyphenLiquidityFarming"), [
        tf.address,
        pauser.address,
        liquidityProviders.address,
        lpToken.address,
      ])) as HyphenLiquidityFarming;
      await wlpm.setIsExcludedAddressStatus([farmingContract.address], [true]);

      for (const signer of [owner, bob, charlie]) {
        for (const tk of [token, token2]) {
          await tk.connect(signer).approve(farmingContract.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(farmingContractV1.address, ethers.constants.MaxUint256);
          await tk.connect(signer).approve(liquidityProviders.address, ethers.constants.MaxUint256);
        }
      }
      await liquidityProviders.addTokenLiquidity(token.address, 10);
      await lpToken.setApprovalForAll(farmingContract.address, true);
      await lpToken.setApprovalForAll(farmingContractV1.address, true);
    });

    it("Should migrate NFT from V1 to V2", async function () {
      await token2.transfer(farmingContractV1.address, 10000000);
      await token2.transfer(farmingContract.address, 10000000);
      await owner.sendTransaction({ to: farmingContract.address, value: 1000000 });

      await farmingContractV1.initalizeRewardPool(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token.address, token2.address, 10);
      await farmingContract.setRewardPerSecond(token.address, NATIVE, 20);
      await farmingContractV1.deposit(1, owner.address);
      await advanceTime(100);

      await expect(() => farmingContractV1.migrateNftsToV2([1], farmingContract.address)).to.changeTokenBalances(
        token2,
        [farmingContractV1, owner],
        [-(10 * 101), 10 * 101]
      );

      await advanceTime(100);
      const token2Balance = await token2.balanceOf(owner.address);
      await expect(() => farmingContract.withdraw(1, owner.address)).to.changeEtherBalances(
        [farmingContract, owner],
        [-(20 * 101), 20 * 101]
      );
      expect(await token2.balanceOf(owner.address)).to.equal(token2Balance.add(10 * 101));
    });
  });
});
