import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  ERC20Token,
  LiquidityPool,
  LiquidityProvidersTest,
  ExecutorManager,
  LPToken,
  WhitelistPeriodManager,
  TokenManager,
  MockAdaptor,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { CCMPGatewayMock } from "../typechain/CCMPGatewayMock";

let { getLocaleString } = require("./utils");

describe("LiquidityPoolTests", function () {
  let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
  let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
  let executorManager: ExecutorManager;
  let token: ERC20Token, liquidityPool: LiquidityPool;
  let lpToken: LPToken;
  let wlpm: WhitelistPeriodManager;
  let liquidityProviders: LiquidityProvidersTest;
  let tokenManager: TokenManager;
  let mockAdaptor: MockAdaptor;
  let ccmpMock: CCMPGatewayMock;

  let trustedForwarder = "0xFD4973FeB2031D4409fB57afEE5dF2051b171104";
  let equilibriumFee = 10000000;
  let excessStateFee = 4500000;
  let maxFee = 200000000;
  let tokenAddress: string;
  let tag: string = "HyphenUI";

  const abiCoder = new ethers.utils.AbiCoder();

  const NATIVE_WRAP_ADDRESS = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
  const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
  const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
  const minTokenCap = getLocaleString(10 * 1e18);
  const maxTokenCap = getLocaleString(200000 * 1e18);
  const minNativeTokenCap = getLocaleString(1e17);
  const maxNativeTokenCap = getLocaleString(25 * 1e18);

  const commuintyPerTokenMaxCap = getLocaleString(500000 * 1e18);
  const tokenMaxCap = getLocaleString(1000000 * 1e18);
  const baseDivisor = ethers.BigNumber.from(10).pow(10);

  const commuintyPerTokenNativeMaxCap = getLocaleString(100 * 1e18);
  const tokenNativeMaxCap = getLocaleString(200 * 1e18);

  const DEPOSIT_EVENT = "Deposit";
  const DEPOSIT_AND_SWAP_EVENT = "DepositAndSwap";
  const dummyDepositHash = "0xf408509b00caba5d37325ab33a92f6185c9b5f007a965dfbeff7b81ab1ec871a";
  const depositNswapRequestOne = [
    {
      tokenAddress: NATIVE,
      percentage: "2000000000",
      amount: "0",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];

  const depositNswapRequestTwo = [
    {
      tokenAddress: NATIVE,
      percentage: "2000000000",
      amount: "0",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
    {
      tokenAddress: NATIVE,
      percentage: "900000000000",
      amount: "0",
      operation: 2,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];

  const swapNexitRequestOne = [
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "20000000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];

  const swapNexitRequestTwo = [
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "20000000000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];
  const invalidSwapRequest = [
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "20000000000000000000",
      operation: 3,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];

  const swapNexitRequestThree = [
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "20000000000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "200000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
    {
      tokenAddress: NATIVE,
      percentage: "0",
      amount: "2000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6",
    },
  ];

  beforeEach(async function () {
    [owner, pauser, charlie, bob, tf, executor] = await ethers.getSigners();

    tokenManager = (await upgrades.deployProxy(await ethers.getContractFactory("TokenManager"), [
      tf.address,
      pauser.address,
    ])) as TokenManager;
    await tokenManager.deployed();

    const executorManagerFactory = await ethers.getContractFactory("ExecutorManager");
    executorManager = await executorManagerFactory.deploy();
    await executorManager.deployed();

    const mockAdaptorFactory = await ethers.getContractFactory("MockAdaptor");
    mockAdaptor = await mockAdaptorFactory.deploy("0xE592427A0AEce92De3Edee1F18E0157C05861564", NATIVE_WRAP_ADDRESS);
    await mockAdaptor.deployed();

    const lpTokenFactory = await ethers.getContractFactory("LPToken");
    lpToken = (await upgrades.deployProxy(lpTokenFactory, [
      "Hyphen LP Token",
      "HPT",
      trustedForwarder,
      pauser.address,
    ])) as LPToken;

    const liquidtyProvidersFactory = await ethers.getContractFactory("LiquidityProvidersTest");
    liquidityProviders = (await upgrades.deployProxy(liquidtyProvidersFactory, [
      trustedForwarder,
      lpToken.address,
      tokenManager.address,
      pauser.address,
    ])) as LiquidityProvidersTest;

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
    await tokenManager.connect(owner).changeExcessStateFee(tokenAddress, excessStateFee);

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

    ccmpMock = (await (await ethers.getContractFactory("CCMPGatewayMock")).deploy()) as CCMPGatewayMock;
    await liquidityPool.setCCMPContracts(ccmpMock.address, ccmpMock.address);

    for (const signer of [owner, bob, charlie]) {
      await token.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
      await token
        .connect(signer)
        .approve(liquidityPool.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
    }
  });

  async function addTokenLiquidity(tokenAddress: string, tokenValue: BigNumberish, sender: SignerWithAddress) {
    let tx = await token.connect(sender).approve(liquidityProviders.address, tokenValue);
    await tx.wait();
    await liquidityProviders.connect(sender).addTokenLiquidity(tokenAddress, tokenValue);
  }

  async function setSwapAdaptor(name: string, adaptorAddress: string) {
    await liquidityPool.connect(owner).setSwapAdaptor(name, adaptorAddress);
  }

  async function addNativeLiquidity(tokenValue: BigNumberish, sender: SignerWithAddress) {
    await liquidityProviders.connect(sender).addNativeLiquidity({
      value: tokenValue,
    });
  }

  async function getReceiverAddress() {
    return bob.getAddress();
  }

  async function getOwnerAddress() {
    return owner.getAddress();
  }

  async function getNonOwnerAddress() {
    return bob.getAddress();
  }

  async function getExecutorAddress() {
    return executor.getAddress();
  }

  async function depositERC20Token(tokenAddress: string, tokenValue: string, receiver: string, toChainId: number) {
    await token.approve(liquidityPool.address, tokenValue);
    return await liquidityPool.connect(owner).depositErc20(toChainId, tokenAddress, receiver, tokenValue, tag);
  }

  async function depositNative(tokenValue: string, receiver: string, toChainId: number) {
    return await liquidityPool.connect(owner).depositNative(receiver, toChainId, tag, {
      value: tokenValue,
    });
  }
  async function depositNativeAndSwap(tokenValue: string, receiver: string, toChainId: number, swapRequest: any) {
    return await liquidityPool.connect(owner).depositNativeAndSwap(receiver, toChainId, tag, swapRequest, {
      value: tokenValue,
    });
  }

  async function depositAndSwapERC20Token(
    tokenAddress: string,
    tokenValue: string,
    receiver: string,
    toChainId: number,
    swapRequest: any
  ) {
    await token.approve(liquidityPool.address, tokenValue);
    return await liquidityPool
      .connect(owner)
      .depositAndSwapErc20(tokenAddress, receiver, toChainId, tokenValue, tag, swapRequest);
  }

  async function sendFundsToUserV2(
    tokenAddress: string,
    amount: string,
    receiver: string,
    tokenGasPrice: string,
    depositHash?: string
  ) {
    return await liquidityPool
      .connect(executor)
      .sendFundsToUserV2(
        tokenAddress,
        amount,
        receiver,
        depositHash ? depositHash : dummyDepositHash,
        tokenGasPrice,
        137,
        0
      );
  }

  function getSendFundsToUserFromCCMPCalldata(
    tokenSymbol: number,
    sourceChainAmount: BigNumberish,
    tokenDecimals: number,
    receiver: string,
    gasFeePaidInTokenAmount: BigNumberish,
    minAmount?: BigNumberish,
    reclaimerEoa?: string
  ) {
    const hyphenArgs = [];
    if (minAmount != null && reclaimerEoa != null) {
      hyphenArgs.push(abiCoder.encode(["uint256", "address"], [minAmount, reclaimerEoa]));
    }

    return liquidityPool.interface.encodeFunctionData("sendFundsToUserFromCCMP", [
      {
        tokenSymbol,
        sourceChainAmount,
        sourceChainDecimals: tokenDecimals,
        receiver,
        hyphenArgs,
      },
    ]);
  }

  async function swapAndsendFundsToUser(
    tokenAddress: string,
    amount: string,
    receiver: string,
    depositHash?: string,
    tokenGasPrice: BigNumberish = 0,
    swapGasOverhead: BigNumberish = 0,
    swapRequest?: any,
    swapAdapter?: string
  ) {
    return await liquidityPool
      .connect(executor)
      .swapAndSendFundsToUser(
        tokenAddress,
        amount,
        receiver,
        depositHash ? depositHash : dummyDepositHash,
        tokenGasPrice,
        0,
        137,
        swapGasOverhead,
        swapRequest,
        swapAdapter ? swapAdapter : ""
      );
  }

  async function checkStorage() {
    let isTrustedForwarderSet = await liquidityPool.isTrustedForwarder(trustedForwarder);
    expect(isTrustedForwarderSet).to.equal(true);
    expect(await liquidityPool.isPauser(await pauser.getAddress())).to.equals(true);
  }

  it("Should prevent non owners from changing token configuration", async () => {
    await expect(tokenManager.connect(bob).changeFee(token.address, 1, 1)).to.be.revertedWith(
      "Ownable: caller is not the owner"
    );
  });

  it("Should Deploy Liquidity Pool Correctly", async function () {
    expect(await liquidityPool.owner()).to.equal(owner.address);
  });

  it("Check if Pool is initialized properly", async () => {
    await checkStorage();
  });

  it("Should addSupportedToken successfully", async () => {
    await tokenManager
      .connect(owner)
      .addSupportedToken(tokenAddress, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0);
    let tokenTransferConfig = await tokenManager.getTransferConfig(tokenAddress);
    let checkTokenStatus = await tokenManager.tokensInfo(tokenAddress);
    expect(checkTokenStatus.supportedToken).to.equal(true);
    expect(tokenTransferConfig.min).to.equal(minTokenCap);
    expect(tokenTransferConfig.max).to.equal(maxTokenCap);
  });

  it("Should updateTokenCap successfully", async () => {
    let newMinTokenCap = "100000";
    let newMaxTokenCap = "100000000";
    await tokenManager.connect(owner).updateTokenCap(tokenAddress, newMinTokenCap, newMaxTokenCap);

    let checkTokenStatus = await tokenManager.tokensInfo(tokenAddress);
    let tokenTransferConfig = await tokenManager.getTransferConfig(tokenAddress);
    expect(checkTokenStatus.supportedToken).to.equal(true);
    expect(tokenTransferConfig.min).to.equal(newMinTokenCap);
    expect(tokenTransferConfig.max).to.equal(newMaxTokenCap);
  });

  it("Should addNativeLiquidity successfully", async () => {
    let valueEth = ethers.utils.parseEther("1");
    await liquidityProviders.connect(owner).addNativeLiquidity({
      value: valueEth,
    });

    expect(valueEth).to.equal(await liquidityProviders.getSuppliedLiquidityByToken(NATIVE));
  });

  it("Should addTokenLiquidity successfully", async () => {
    let tokenValue = "1000000";
    let totalReserveBefore = await liquidityProviders.getTotalReserveByToken(tokenAddress);
    let tx = await token.connect(owner).approve(liquidityProviders.address, tokenValue);
    await tx.wait();
    await liquidityProviders.connect(owner).addTokenLiquidity(tokenAddress, tokenValue);
    let totalReserveAfter = await liquidityProviders.getTotalReserveByToken(tokenAddress);
    expect(totalReserveBefore.add(tokenValue).toString()).to.equal(totalReserveAfter.toString());
  });

  it("Should deposit ERC20 successfully without rewards", async () => {
    //Deposit Token
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;
    let tokenLiquidityBefore = (await token.balanceOf(liquidityPool.address)).toString();
    let tx = await depositERC20Token(tokenAddress, tokenValue, receiver, toChainId);

    expect(tx)
      .to.emit(liquidityPool, DEPOSIT_EVENT)
      .withArgs(await getOwnerAddress(), tokenAddress, receiver, toChainId, tokenValue, 0, tag);
    let tokenLiquidityAfter = (await token.balanceOf(liquidityPool.address)).toString();
    expect(parseInt(tokenLiquidityAfter)).to.equal(parseInt(tokenLiquidityBefore) + parseInt(tokenValue));
  });

  it("Should deposit ERC20 and Swap data successfully without rewards", async () => {
    //Deposit Token
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;
    let tokenLiquidityBefore = (await token.balanceOf(liquidityPool.address)).toString();
    let tx = await depositAndSwapERC20Token(tokenAddress, tokenValue, receiver, toChainId, depositNswapRequestOne);

    expect(tx)
      .to.emit(liquidityPool, DEPOSIT_AND_SWAP_EVENT)
      .withArgs(await getOwnerAddress(), tokenAddress, receiver, toChainId, tokenValue, 0, tag);
    let tokenLiquidityAfter = (await token.balanceOf(liquidityPool.address)).toString();
    expect(parseInt(tokenLiquidityAfter)).to.equal(parseInt(tokenLiquidityBefore) + parseInt(tokenValue));
  });

  it("Should revert if swap percentage > 100", async () => {
    //Deposit Token
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;

    await expect(depositAndSwapERC20Token(tokenAddress, tokenValue, receiver, toChainId, depositNswapRequestTwo)).to.be
      .reverted;
  });

  it("Should not get reward during deposit if current liquidity = provided liquidity", async () => {
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;
    await addTokenLiquidity(tokenAddress, tokenValue, owner);
    let rewardAmout = await liquidityPool.getRewardAmount(tokenValue, tokenAddress);
    expect(rewardAmout).to.equals(0);
    let tx = await depositERC20Token(tokenAddress, tokenValue, receiver, toChainId);
    expect(tx)
      .to.emit(liquidityPool, DEPOSIT_EVENT)
      .withArgs(await getOwnerAddress(), tokenAddress, receiver, toChainId, tokenValue, 0, tag);
  });

  it("Should not get reward during deposit if current liquidity > provided liquidity", async () => {
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;
    await addTokenLiquidity(tokenAddress, tokenValue, owner);
    // Deposit once so current liquidity becomes more than provided liquidity
    await depositERC20Token(tokenAddress, minTokenCap, receiver, toChainId);

    let rewardAmout = await liquidityPool.getRewardAmount(tokenValue, tokenAddress);
    expect(rewardAmout).to.equals(0);
    let tx = await depositERC20Token(tokenAddress, tokenValue, receiver, toChainId);
    expect(tx)
      .to.emit(liquidityPool, DEPOSIT_EVENT)
      .withArgs(await getOwnerAddress(), tokenAddress, receiver, toChainId, tokenValue, 0, tag);
  });

  describe("Should get reward during deposit", () => {
    it("Current liquidity < Provided liquidity and pool remains in deficit state after deposit", async () => {
      const liquidityToBeAdded = getLocaleString(2 * 1e2 * 1e18);
      const amountToWithdraw = BigNumber.from(minTokenCap).add(1).toString();
      const amountToDeposit = minTokenCap;
      let receiver = await getReceiverAddress();
      let toChainId = 1;

      await addTokenLiquidity(tokenAddress, liquidityToBeAdded, owner);
      await executorManager.addExecutor(executor.address);
      // Send funds to put pool into deficit state so current liquidity < provided liquidity
      let tx = await sendFundsToUserV2(tokenAddress, amountToWithdraw, receiver, "0");
      await tx.wait();
      let rewardAmoutFromContract = await liquidityPool.getRewardAmount(amountToDeposit, tokenAddress);
      let incentivePoolAmount = await liquidityPool.incentivePool(tokenAddress);
      let equilibriumLiquidity = await liquidityProviders.getSuppliedLiquidityByToken(tokenAddress);
      let currentBalance = await token.balanceOf(liquidityPool.address);
      let gasFeeAccumulated = await liquidityPool.gasFeeAccumulatedByToken(tokenAddress);
      let lpFeeAccumulated = await liquidityProviders.getTotalLPFeeByToken(tokenAddress);

      let currentLiquidity = currentBalance.sub(gasFeeAccumulated).sub(lpFeeAccumulated).sub(incentivePoolAmount);
      let calculatedRewardAmount = BigNumber.from(amountToDeposit)
        .mul(incentivePoolAmount)
        .div(equilibriumLiquidity.sub(currentLiquidity));

      expect(calculatedRewardAmount).to.equals(rewardAmoutFromContract);

      let depositTx = await depositERC20Token(tokenAddress, amountToDeposit, receiver, toChainId);
      expect(depositTx)
        .to.emit(liquidityPool, DEPOSIT_EVENT)
        .withArgs(
          await getOwnerAddress(),
          tokenAddress,
          receiver,
          toChainId,
          calculatedRewardAmount.add(amountToDeposit).toString(),
          calculatedRewardAmount,
          tag
        );
    });

    it("Current liquidity < Provided liquidity and pool goes into excess state after deposit", async () => {
      const liquidityToBeAdded = getLocaleString(2 * 1e2 * 1e18);
      const amountToWithdraw = BigNumber.from(minTokenCap).add(1).toString();
      const amountToDeposit = BigNumber.from(minTokenCap).add(minTokenCap).toString();
      let receiver = await getReceiverAddress();
      let toChainId = 1;

      await addTokenLiquidity(tokenAddress, liquidityToBeAdded, owner);
      await executorManager.addExecutor(executor.address);

      // Send funds to put pool into deficit state so current liquidity < provided liquidity
      let tx = await sendFundsToUserV2(tokenAddress, amountToWithdraw, receiver, "0");
      await tx.wait();
      let rewardAmoutFromContract = await liquidityPool.getRewardAmount(amountToDeposit, tokenAddress);
      let incentivePoolAmount = await liquidityPool.incentivePool(tokenAddress);
      let calculatedRewardAmount = incentivePoolAmount;

      expect(calculatedRewardAmount).to.equals(rewardAmoutFromContract);

      let depositTx = await depositERC20Token(tokenAddress, amountToDeposit, receiver, toChainId);
      expect(depositTx)
        .to.emit(liquidityPool, DEPOSIT_EVENT)
        .withArgs(
          await getOwnerAddress(),
          tokenAddress,
          receiver,
          toChainId,
          calculatedRewardAmount.add(amountToDeposit).toString(),
          calculatedRewardAmount,
          tag
        );
    });

    it("Real world use case for Native currency, when deposit gets all incentive pool", async () => {
      // Add Native Currency liquidity
      const liquidityToBeAdded = getLocaleString(50 * 1e18);
      await addNativeLiquidity(liquidityToBeAdded, owner);

      const amountToWithdraw = BigNumber.from(minTokenCap).toString();
      let receiver = await getReceiverAddress();
      let toChainId = 1;
      await executorManager.addExecutor(executor.address);
      // Send funds to put pool into deficit state so current liquidity < provided liquidity
      let tx = await sendFundsToUserV2(NATIVE, amountToWithdraw, receiver, "0");
      await tx.wait();

      const amountToDeposit = BigNumber.from(minTokenCap)
        .add(BigNumber.from(getLocaleString(5 * 1e18)))
        .toString();

      let rewardAmoutFromContract = await liquidityPool.getRewardAmount(amountToDeposit, NATIVE);
      let incentivePoolAmount = await liquidityPool.incentivePool(NATIVE);

      let calculatedRewardAmount = incentivePoolAmount;

      expect(calculatedRewardAmount).to.equals(rewardAmoutFromContract);

      let depositTx = await depositNative(amountToDeposit, receiver, toChainId);

      expect(depositTx)
        .to.emit(liquidityPool, DEPOSIT_EVENT)
        .withArgs(
          await getOwnerAddress(),
          NATIVE,
          receiver,
          toChainId,
          calculatedRewardAmount.add(amountToDeposit).toString(),
          calculatedRewardAmount,
          tag
        );
    });

    it("Real world use case for Native currency, when deposit gets some part of incentive pool", async () => {
      // Add Native Currency liquidity
      const liquidityToBeAdded = getLocaleString(50 * 1e18);
      await addNativeLiquidity(liquidityToBeAdded, owner);

      const amountToWithdraw = BigNumber.from(minTokenCap)
        .add(BigNumber.from(getLocaleString(5 * 1e18)))
        .toString();
      let receiver = await getReceiverAddress();
      let toChainId = 1;
      await executorManager.addExecutor(executor.address);
      // Send funds to put pool into deficit state so current liquidity < provided liquidity
      let tx = await sendFundsToUserV2(NATIVE, amountToWithdraw, receiver, "0");
      await tx.wait();

      let rewardPoolBeforeTransfer = await liquidityPool.incentivePool(NATIVE);
      tx = await sendFundsToUserV2(
        NATIVE,
        amountToWithdraw,
        receiver,
        "0",
        "0xbf4d8d58e7905ad39ea2e4b8c8ae0cae89e5877d8540b03a299a0b14544c1e6a"
      );
      await tx.wait();

      const amountToDeposit = BigNumber.from(minTokenCap).toString();

      let rewardAmoutFromContract = await liquidityPool.getRewardAmount(amountToDeposit, NATIVE);
      let incentivePoolAmount = await liquidityPool.incentivePool(NATIVE);
      let equilibriumLiquidity = await liquidityProviders.getSuppliedLiquidityByToken(NATIVE);

      let currentBalance = await ethers.provider.getBalance(liquidityPool.address);

      let gasFeeAccumulated = await liquidityPool.gasFeeAccumulatedByToken(NATIVE);

      let lpFeeAccumulated = await liquidityProviders.getTotalLPFeeByToken(NATIVE);

      let currentLiquidity = currentBalance.sub(gasFeeAccumulated).sub(lpFeeAccumulated).sub(incentivePoolAmount);

      let currrentLiquidityFromContract = await liquidityPool.getCurrentLiquidity(NATIVE);
      expect(currentLiquidity).to.equals(currrentLiquidityFromContract);

      let calculatedRewardAmount = BigNumber.from(amountToDeposit)
        .mul(incentivePoolAmount)
        .div(equilibriumLiquidity.sub(currentLiquidity));
      expect(calculatedRewardAmount).to.equals(rewardAmoutFromContract);

      let depositTx = await depositNative(amountToDeposit, receiver, toChainId);

      expect(depositTx)
        .to.emit(liquidityPool, DEPOSIT_EVENT)
        .withArgs(
          await getOwnerAddress(),
          NATIVE,
          receiver,
          toChainId,
          calculatedRewardAmount.add(amountToDeposit).toString(),
          calculatedRewardAmount,
          tag
        );
    });

    it("Sending funds to user should increase the incentive pool", async () => {
      // Add Native Currency liquidity
      const liquidityToBeAdded = getLocaleString(50 * 1e18);
      await addNativeLiquidity(liquidityToBeAdded, owner);

      const amountToWithdraw = BigNumber.from(minTokenCap).add(BigNumber.from(getLocaleString(5 * 1e18)));
      let receiver = await getReceiverAddress();
      let toChainId = 1;
      await executorManager.addExecutor(executor.address);
      // Send funds to put pool into deficit state so current liquidity < provided liquidity
      let tx = await sendFundsToUserV2(NATIVE, amountToWithdraw.toString(), receiver, "0");
      await tx.wait();

      let rewardPoolBeforeTransfer = await liquidityPool.incentivePool(NATIVE);

      let transferFeePercentage = await liquidityPool.getTransferFee(NATIVE, amountToWithdraw);

      let excessFeePercentage = transferFeePercentage.sub(BigNumber.from("10000000"));
      let expectedRewardAmount = amountToWithdraw.mul(excessFeePercentage).div(1e10);
      tx = await sendFundsToUserV2(
        NATIVE,
        amountToWithdraw.toString(),
        receiver,
        "0",
        "0xbf4d8d58e7905ad39ea2e4b8c8ae0cae89e5877d8540b03a299a0b14544c1e6a"
      );

      let rewardPoolAfterTrasnfer = await liquidityPool.incentivePool(NATIVE);

      let rewardPoolDiff = rewardPoolAfterTrasnfer.sub(rewardPoolBeforeTransfer);
      expect(rewardPoolDiff.eq(expectedRewardAmount)).to.be.true;
    });
  });

  it("Should depositNative successfully", async () => {
    const tokenValue = minTokenCap;
    const tokenLiquidityBefore = await ethers.provider.getBalance(liquidityPool.address);

    //Deposit Native
    await depositNative(tokenValue, await getReceiverAddress(), 1);
    const tokenLiquidityAfter = await ethers.provider.getBalance(liquidityPool.address);

    expect(parseInt(tokenLiquidityAfter.toString())).to.equal(
      parseInt(tokenLiquidityBefore.toString()) + parseInt(tokenValue)
    );
  });

  it("Should deposit native and Swap data successfully without rewards", async () => {
    const tokenValue = minTokenCap;
    const tokenLiquidityBefore = await ethers.provider.getBalance(liquidityPool.address);

    //Deposit Native
    await depositNativeAndSwap(tokenValue, await getReceiverAddress(), 1, depositNswapRequestOne);
    const tokenLiquidityAfter = await ethers.provider.getBalance(liquidityPool.address);

    expect(parseInt(tokenLiquidityAfter.toString())).to.equal(
      parseInt(tokenLiquidityBefore.toString()) + parseInt(tokenValue)
    );
  });

  it("Should revert if swap percentage > 100", async () => {
    //Deposit Token
    const tokenValue = minTokenCap;
    let receiver = await getReceiverAddress();
    let toChainId = 1;

    await expect(depositNativeAndSwap(tokenValue, receiver, toChainId, depositNswapRequestTwo)).to.be.reverted;
  });

  it("Should setTokenTransferOverhead successfully", async () => {
    let gasOverhead = "21110";
    await tokenManager.connect(owner).setTokenTransferOverhead(tokenAddress, 21110);
    let checkTokenGasOverhead = await tokenManager.tokensInfo(tokenAddress);
    expect(checkTokenGasOverhead.transferOverhead).to.equal(gasOverhead);
  });

  // (node:219241) UnhandledPromiseRejectionWarning: Error: VM Exception while processing transaction: revert SafeMath: subtraction overflow
  it("Should send ERC20 funds to user successfully", async () => {
    await addTokenLiquidity(tokenAddress, minTokenCap, owner);
    const amount = minTokenCap;
    const usdtBalanceBefore = await token.balanceOf(liquidityPool.address);
    const suppliedLiquidity = await liquidityProviders.getSuppliedLiquidityByToken(tokenAddress);
    await executorManager.connect(owner).addExecutor(await executor.getAddress());

    let transferFeeFromContract = await liquidityPool.getTransferFee(tokenAddress, amount);
    await liquidityPool
      .connect(executor)
      .sendFundsToUserV2(token.address, amount.toString(), await getReceiverAddress(), dummyDepositHash, 0, 137, 0);

    let equilibriumLiquidity = suppliedLiquidity;
    let resultingLiquidity = usdtBalanceBefore.sub(amount);
    let numerator = suppliedLiquidity.mul(maxFee * equilibriumFee);
    let denominator = equilibriumLiquidity.mul(equilibriumFee).add(resultingLiquidity.mul(maxFee - equilibriumFee));
    let transferFee = numerator.div(denominator);

    let estimatedValueTransferred = BigNumber.from(amount).sub(transferFee.mul(amount).div(10000000000));
    const usdtBalanceAfter = await token.balanceOf(liquidityPool.address);
    expect(transferFeeFromContract).to.equals(transferFee);
    expect(usdtBalanceBefore.sub(estimatedValueTransferred)).to.equal(usdtBalanceAfter);
  });

  it("Should fail to send ERC20 funds to user: Already Processed", async () => {
    const amount = 1000000;
    const dummyDepositHash = "0xf408509b00caba5d37325ab33a92f6185c9b5f007a965dfbeff7b81ab1ec871a";
    await executorManager.connect(owner).addExecutor(await executor.getAddress());

    await expect(
      liquidityPool
        .connect(executor)
        .sendFundsToUserV2(token.address, amount.toString(), await getReceiverAddress(), dummyDepositHash, 0, 137, 0)
    ).to.be.reverted;
  });

  it("Should fail to send ERC20 funds to user: not Authorised", async () => {
    const dummyDepositHash = "0xf408509b00caba5d37325ab33a92f6185c9b5f007a965dfbeff7b81ab1ec871a";
    await executorManager.connect(owner).addExecutor(await executor.getAddress());
    await expect(
      liquidityPool
        .connect(bob)
        .sendFundsToUserV2(token.address, "1000000", await getReceiverAddress(), dummyDepositHash, 0, 137, 0)
    ).to.be.reverted;
  });

  it("Should fail to send ERC20 funds to user: receiver cannot be Zero", async () => {
    const dummyDepositHash = "0xf408509b00caba5d37325ab33a92f6185c9b5f007a965dfbeff7b81ab1ec871a";
    await executorManager.connect(owner).addExecutors([await executor.getAddress()]);
    await expect(
      liquidityPool
        .connect(executor)
        .sendFundsToUserV2(token.address, "1000000", ZERO_ADDRESS, dummyDepositHash, 0, 137, 0)
    ).to.be.reverted;
  });

  it("Should fail to set new ExecutorManager : only owner can set", async () => {
    let newExecutorManager = await bob.getAddress();
    await expect(liquidityPool.connect(bob).setExecutorManager(newExecutorManager)).be.reverted;
  });

  it("Should fail to addSupportedToken: only owner can add", async () => {
    let minTokenCap = "100000000";
    let maxTokenCap = "10000000000";
    await expect(
      tokenManager.connect(bob).addSupportedToken(tokenAddress, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0)
    ).to.be.reverted;
  });

  it("Should fail to addSupportedToken: min cap should be less than max cap", async () => {
    let minTokenCap = "10000000000";
    let maxTokenCap = "100000000";
    await expect(
      tokenManager.connect(bob).addSupportedToken(tokenAddress, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0)
    ).to.be.reverted;
  });

  it("Should fail to addSupportedToken: token address can't be 0'", async () => {
    let minTokenCap = "10000000000";
    let maxTokenCap = "100000000";
    await expect(
      tokenManager.connect(bob).addSupportedToken(ZERO_ADDRESS, minTokenCap, maxTokenCap, equilibriumFee, maxFee, 0)
    ).to.be.reverted;
  });

  it("Should fail to removeSupportedToken: Only owner can remove supported tokens", async () => {
    await expect(tokenManager.connect(bob).removeSupportedToken(tokenAddress)).to.be.reverted;
  });

  it("Should fail to updateTokenCap: TokenAddress not supported", async () => {
    let minTokenCap = "100000000";
    let maxTokenCap = "10000000000";
    let inactiveTokenAddress = await bob.getAddress();
    await expect(tokenManager.connect(owner).updateTokenCap(inactiveTokenAddress, minTokenCap, maxTokenCap)).to.be
      .reverted;
  });

  it("Should fail to updateTokenCap: TokenAddress can't be 0", async () => {
    let minTokenCap = "100000000";
    let maxTokenCap = "10000000000";
    await expect(tokenManager.connect(owner).updateTokenCap(ZERO_ADDRESS, minTokenCap, maxTokenCap)).to.be.reverted;
  });

  it("Should fail to updateTokenCap: only owner can update", async () => {
    let minTokenCap = "100000000";
    let maxTokenCap = "10000000000";
    await expect(tokenManager.connect(bob).updateTokenCap(tokenAddress, minTokenCap, maxTokenCap)).to.be.reverted;
  });

  it("Should fail to depositErc20: Token address cannot be 0", async () => {
    await expect(
      liquidityPool.connect(owner).depositErc20(ZERO_ADDRESS, await getNonOwnerAddress(), "100000000", 1, tag)
    ).to.be.reverted;
  });

  it("Should fail to depositErc20: Token not supported", async () => {
    let inactiveTokenAddress = await bob.getAddress();
    await expect(
      liquidityPool.connect(owner).depositErc20(137, inactiveTokenAddress, await getNonOwnerAddress(), "100000000", tag)
    ).to.be.reverted;
  });

  it("Should fail to depositErc20: Deposit amount below allowed min Cap limit", async () => {
    await expect(
      liquidityPool.connect(owner).depositErc20(1, tokenAddress, await getNonOwnerAddress(), "200000000000", tag)
    ).to.be.reverted;
  });

  it("Should fail to depositErc20: Deposit amount exceeds allowed max Cap limit", async () => {
    await expect(liquidityPool.connect(owner).depositErc20(tokenAddress, await getNonOwnerAddress(), "20", 1, tag)).to
      .be.reverted;
  });

  it("Should fail to depositErc20: Receiver address cannot be 0", async () => {
    await expect(liquidityPool.connect(owner).depositErc20(1, tokenAddress, ZERO_ADDRESS, "1000000", tag)).to.be
      .reverted;
  });

  it("Should fail to depositErc20: amount should be greater then 0", async () => {
    await expect(liquidityPool.connect(owner).depositErc20(1, tokenAddress, await getNonOwnerAddress(), "0", tag)).to.be
      .reverted;
  });

  it("Should fail to setTokenTransferOverhead: TokenAddress not supported", async () => {
    let inactiveTokenAddress = await bob.getAddress();
    await expect(tokenManager.connect(owner).setTokenTransferOverhead(inactiveTokenAddress, 21110)).to.be.revertedWith(
      "Token not supported"
    );
  });

  it("Should fail to setTokenTransferOverhead: only owner can update", async () => {
    await expect(tokenManager.connect(bob).setTokenTransferOverhead(tokenAddress, 21110)).to.be.reverted;
  });

  it("Should removeSupportedToken successfully", async () => {
    await tokenManager.connect(owner).removeSupportedToken(tokenAddress);

    let checkTokenStatus = await tokenManager.tokensInfo(tokenAddress);
    expect(checkTokenStatus.supportedToken).to.equal(false);
  });

  it("Should allow withdrawl of token gas fee", async () => {
    await addTokenLiquidity(tokenAddress, minTokenCap, owner);
    const amount = minTokenCap;
    await executorManager.connect(owner).addExecutor(await executor.getAddress());

    await liquidityPool
      .connect(executor)
      .sendFundsToUserV2(
        token.address,
        amount.toString(),
        await getReceiverAddress(),
        dummyDepositHash,
        BigNumber.from(10).pow(28),
        137,
        0
      );

    const gasFeeAccumulated = await liquidityPool.gasFeeAccumulated(token.address, executor.address);
    expect(gasFeeAccumulated.gt(0)).to.be.true;

    await expect(() => liquidityPool.connect(executor).withdrawErc20GasFee(token.address)).to.changeTokenBalances(
      token,
      [liquidityPool, executor],
      [-gasFeeAccumulated, gasFeeAccumulated]
    );
  });

  it("Should allow withdrawl of native gas fee", async () => {
    await addNativeLiquidity(minTokenCap, owner);
    const amount = minTokenCap;
    await executorManager.connect(owner).addExecutor(await executor.getAddress());

    await liquidityPool
      .connect(executor)
      .sendFundsToUserV2(
        NATIVE,
        amount.toString(),
        await getReceiverAddress(),
        dummyDepositHash,
        BigNumber.from(10).pow(28),
        137,
        0
      );

    const gasFeeAccumulated = await liquidityPool.gasFeeAccumulated(NATIVE, executor.address);
    expect(gasFeeAccumulated.gt(0)).to.be.true;

    await expect(() => liquidityPool.connect(executor).withdrawNativeGasFee()).to.changeEtherBalances(
      [liquidityPool, executor],
      [-gasFeeAccumulated, gasFeeAccumulated]
    );
  });

  describe("Transfer Fee", async function () {
    it("Should calculate fee properly", async function () {
      const providedLiquidity = ethers.BigNumber.from(minTokenCap).mul(10);
      await addTokenLiquidity(tokenAddress, providedLiquidity, owner);

      const amount = ethers.BigNumber.from(minTokenCap);
      await executorManager.connect(owner).addExecutor(await executor.getAddress());
      const resultingLiquidity = providedLiquidity.sub(amount);

      const expectedFeePerNum = providedLiquidity.mul(providedLiquidity).mul(equilibriumFee).mul(maxFee);
      const expectedFeePerDen = providedLiquidity
        .mul(providedLiquidity)
        .mul(equilibriumFee)
        .add(resultingLiquidity.mul(resultingLiquidity).mul(maxFee - equilibriumFee));
      const expectedFeePer = expectedFeePerNum.div(expectedFeePerDen);

      const expectedTransferFee = amount.mul(expectedFeePer).div(baseDivisor);
      const lpFee = amount.mul(equilibriumFee).div(baseDivisor);
      const incentivePoolFee = expectedTransferFee.sub(lpFee);

      await expect(
        liquidityPool
          .connect(executor)
          .sendFundsToUserV2(token.address, amount, await getReceiverAddress(), dummyDepositHash, 0, 137, 0)
      )
        .to.emit(liquidityPool, "AssetSent")
        .withArgs(
          token.address,
          amount,
          amount.sub(expectedTransferFee),
          await getReceiverAddress(),
          dummyDepositHash,
          137,
          lpFee,
          expectedTransferFee,
          0
        );
      expect(await liquidityPool.incentivePool(token.address)).to.equal(incentivePoolFee);
    });

    it("Should collect constant transaction fee in excess state", async function () {
      const providedLiquidity = ethers.BigNumber.from(minTokenCap).mul(10);
      await addTokenLiquidity(tokenAddress, providedLiquidity, owner);

      await liquidityPool.depositErc20(1, token.address, owner.address, providedLiquidity.mul(10), "test");

      const amount = ethers.BigNumber.from(minTokenCap);
      await executorManager.connect(owner).addExecutor(await executor.getAddress());

      const expectedTransferFee = amount.mul(excessStateFee).div(baseDivisor);
      const lpFee = expectedTransferFee;
      const incentivePoolFee = 0;

      for (let i = 0; i < 10; i++) {
        const hash = ethers.BigNumber.from(dummyDepositHash).add(i).toHexString();
        await expect(
          liquidityPool
            .connect(executor)
            .sendFundsToUserV2(token.address, amount, await getReceiverAddress(), hash, 0, 137, 0)
        )
          .to.emit(liquidityPool, "AssetSent")
          .withArgs(
            token.address,
            amount,
            amount.sub(expectedTransferFee),
            await getReceiverAddress(),
            hash,
            137,
            lpFee,
            expectedTransferFee,
            0
          );
        expect(await liquidityPool.incentivePool(token.address)).to.equal(incentivePoolFee);
      }
    });

    it("Should send GasToken & Remaining ERC20 to user successfully", async () => {
      await addTokenLiquidity(tokenAddress, minTokenCap, owner);
      const amount = minTokenCap;
      const usdtBalanceBefore = await token.balanceOf(liquidityPool.address);
      const suppliedLiquidity = await liquidityProviders.getSuppliedLiquidityByToken(tokenAddress);
      await executorManager.connect(owner).addExecutor(await executor.getAddress());

      let transferFeeFromContract = await liquidityPool.getTransferFee(tokenAddress, amount);
      await setSwapAdaptor("uniswap", mockAdaptor.address);
      await swapAndsendFundsToUser(
        token.address,
        amount.toString(),
        await getReceiverAddress(),
        dummyDepositHash,
        0,
        "12876",
        swapNexitRequestOne,
        "uniswap"
      );

      let equilibriumLiquidity = suppliedLiquidity;
      let resultingLiquidity = usdtBalanceBefore.sub(amount);
      let numerator = suppliedLiquidity.mul(maxFee * equilibriumFee);
      let denominator = equilibriumLiquidity.mul(equilibriumFee).add(resultingLiquidity.mul(maxFee - equilibriumFee));
      let transferFee = numerator.div(denominator);

      let estimatedValueTransferred = BigNumber.from(amount).sub(transferFee.mul(amount).div(10000000000));
      const usdtBalanceAfter = await token.balanceOf(liquidityPool.address);
      expect(transferFeeFromContract).to.equals(transferFee);

      expect(usdtBalanceBefore.sub(estimatedValueTransferred)).to.equal(usdtBalanceAfter);
    });

    it("Should fail if swap amount is greater then transferred amount", async () => {
      const mockAdaptorFailFactory = await ethers.getContractFactory("MockAdaptorFail", owner);
      let mockAdaptorFail = await mockAdaptorFailFactory.deploy(
        "0xE592427A0AEce92De3Edee1F18E0157C05861564",
        ethers.constants.AddressZero
      );
      await mockAdaptorFail.deployed();

      await setSwapAdaptor("uniswap", mockAdaptorFail.address);
      await addTokenLiquidity(tokenAddress, minTokenCap, owner);
      const amount = minTokenCap;
      await executorManager.connect(owner).addExecutor(await executor.getAddress());

      await expect(
        swapAndsendFundsToUser(
          token.address,
          amount.toString(),
          await getReceiverAddress(),
          dummyDepositHash,
          0,
          "12876",
          swapNexitRequestTwo,
          "uniswap"
        )
      ).to.be.reverted;
    });

    it("Should fail if Array length is 0", async () => {
      await executorManager.connect(owner).addExecutor(await executor.getAddress());
      await expect(
        swapAndsendFundsToUser(
          token.address,
          minTokenCap.toString(),
          await getReceiverAddress(),
          dummyDepositHash,
          0,
          "12876",
          [],
          "uniswap"
        )
      ).to.be.revertedWith("31");
    });

    it("Should fail if SwapAdaptor Not Found", async () => {
      await executorManager.connect(owner).addExecutor(await executor.getAddress());
      await expect(
        swapAndsendFundsToUser(
          token.address,
          minTokenCap.toString(),
          await getReceiverAddress(),
          dummyDepositHash,
          0,
          "12876",
          swapNexitRequestTwo,
          "anyRandomSwap"
        )
      ).to.be.revertedWith("32");
    });

    it("Should fail Swap Array > 3", async () => {
      await addTokenLiquidity(tokenAddress, minTokenCap, owner);
      await setSwapAdaptor("uniswap", mockAdaptor.address);

      await executorManager.connect(owner).addExecutor(await executor.getAddress());
      await expect(
        swapAndsendFundsToUser(
          token.address,
          minTokenCap.toString(),
          await getReceiverAddress(),
          dummyDepositHash,
          0,
          "12876",
          swapNexitRequestThree,
          "uniswap"
        )
      ).to.be.revertedWith("too many swap requests");
    });

    it("Should fail for Invalid Swap operation", async () => {
      await addTokenLiquidity(tokenAddress, minTokenCap, owner);
      await setSwapAdaptor("uniswap", mockAdaptor.address);

      await executorManager.connect(owner).addExecutor(await executor.getAddress());
      await expect(
        swapAndsendFundsToUser(
          token.address,
          minTokenCap.toString(),
          await getReceiverAddress(),
          dummyDepositHash,
          0,
          "12876",
          invalidSwapRequest,
          "uniswap"
        )
      ).to.be.reverted;
    });
  });

  describe("sendFundsToUserV2", () => {
    beforeEach(async () => {
      await addTokenLiquidity(token.address, ethers.BigNumber.from(minTokenCap).mul(10), owner);
      await addNativeLiquidity(ethers.BigNumber.from(minTokenCap).mul(10), owner);
      await executorManager.addExecutor(executor.address);
    });

    it("Should send ERC20 funds to users", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const fee = (await liquidityPool.getTransferFee(token.address, amount)).mul(amount).div(baseDivisor);
      expect(fee.gt(0)).to.be.true;
      await expect(() =>
        liquidityPool.connect(executor).sendFundsToUserV2(token.address, amount, bob.address, dummyDepositHash, 0, 1, 0)
      ).to.changeTokenBalances(token, [liquidityPool, bob], [amount.sub(fee).mul(-1), amount.sub(fee)]);
    });

    it("Should send NATIVE funds to users", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const fee = (await liquidityPool.getTransferFee(NATIVE, amount)).mul(amount).div(baseDivisor);
      expect(fee.gt(0)).to.be.true;
      await expect(() =>
        liquidityPool.connect(executor).sendFundsToUserV2(NATIVE, amount, bob.address, dummyDepositHash, 0, 1, 0)
      ).to.changeEtherBalances([liquidityPool, bob], [amount.sub(fee).mul(-1), amount.sub(fee)]);
    });

    it("Should account for token gas base fee in transaction", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const tokenGasBaseFee = 100000;
      const fee = (await liquidityPool.getTransferFee(token.address, amount))
        .mul(amount)
        .div(baseDivisor)
        .add(tokenGasBaseFee);
      expect(fee.gt(0)).to.be.true;
      await expect(() =>
        liquidityPool
          .connect(executor)
          .sendFundsToUserV2(token.address, amount, bob.address, dummyDepositHash, 0, 1, tokenGasBaseFee)
      ).to.changeTokenBalances(token, [liquidityPool, bob], [amount.sub(fee).mul(-1), amount.sub(fee)]);
      expect(await liquidityPool.gasFeeAccumulated(token.address, executor.address)).to.equal(tokenGasBaseFee);
    });
  });
});
