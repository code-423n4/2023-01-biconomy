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
  SampleContract,
  SampleContract__factory,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber, BigNumberish } from "ethers";
import { CCMPGatewayMock } from "../typechain/CCMPGatewayMock";

let { getLocaleString } = require("./utils");

type GasFeePaymentArgs = {
  feeTokenAddress: string;
  feeAmount: BigNumberish;
  relayer: string;
};

type CCMPMessagePayload = {
  to: string;
  _calldata: string;
};

describe("LiquidityPoolTests - Deposit And Call", function () {
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
  let sampleContract: SampleContract;

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

  const dummyDepositHash = "0xf408509b00caba5d37325ab33a92f6185c9b5f007a965dfbeff7b81ab1ec871a";

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

    sampleContract = await new SampleContract__factory(owner).deploy(ccmpMock.address, liquidityPool.address);
  });

  async function addTokenLiquidity(tokenAddress: string, tokenValue: BigNumberish, sender: SignerWithAddress) {
    let tx = await token.connect(sender).approve(liquidityProviders.address, tokenValue);
    await tx.wait();
    await liquidityProviders.connect(sender).addTokenLiquidity(tokenAddress, tokenValue);
  }

  async function addNativeLiquidity(tokenValue: BigNumberish, sender: SignerWithAddress) {
    await liquidityProviders.connect(sender).addNativeLiquidity({
      value: tokenValue,
    });
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

  describe("CCMP", async function () {
    const emptyBytes = abiCoder.encode(["string"], ["0x"]);
    let chainId: number;

    beforeEach(async () => {
      await addTokenLiquidity(token.address, ethers.BigNumber.from(minTokenCap).mul(10), owner);
      await addNativeLiquidity(ethers.BigNumber.from(minTokenCap).mul(10), owner);
      chainId = (await ethers.provider.getNetwork()).chainId;
    });

    const compareLastCallPayloads = (a: CCMPMessagePayload[], b: CCMPMessagePayload[]): boolean => {
      if (a.length !== b.length) {
        console.log("lengths not equal");
        return false;
      }

      for (let i = 0; i < a.length; i++) {
        if (a[i].to != b[i].to) {
          console.log(`to not equal at index ${i}. a: ${a[i].to}, b: ${b[i].to}`);
          return false;
        }

        if (a[i]._calldata != b[i]._calldata) {
          console.log(`calldata not equal at index ${i}. a: ${a[i]._calldata}, b: ${b[i]._calldata}`);
          return false;
        }
      }

      return true;
    };

    it("Should be able to accept deposits in ERC20", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: token.address,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = BigNumber.from(minTokenCap);
      const minAmount = 0;

      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(() =>
        liquidityPool.depositAndCall({
          toChainId: destinationChainId,
          tokenAddress: token.address,
          receiver: charlie.address,
          amount,
          tag: "test",
          payloads,
          gasFeePaymentArgs,
          adaptorName,
          routerArgs,
          hyphenArgs: [],
        })
      ).to.changeTokenBalances(token, [liquidityPool, owner], [amount, amount.mul(-1)]);

      const lastCallArgs = await ccmpMock.lastCallArgs();
      const lastCallPayload = await ccmpMock.lastCallPayload();

      expect(lastCallArgs.destinationChainId).to.equal(destinationChainId);
      expect(lastCallArgs.adaptorName).to.equal(adaptorName);
      expect(
        compareLastCallPayloads(lastCallPayload, [
          {
            to: liquidityPool.address,
            _calldata: getSendFundsToUserFromCCMPCalldata(
              tokenSymbol,
              amount,
              18,
              charlie.address,
              gasFeePaymentArgs.feeAmount
            ),
          },
          ...payloads,
        ])
      ).to.be.true;
      expect(lastCallArgs.gasFeePaymentArgs.relayer).to.equal(gasFeePaymentArgs.relayer);
      expect(lastCallArgs.gasFeePaymentArgs.feeAmount).to.equal(gasFeePaymentArgs.feeAmount);
      expect(lastCallArgs.gasFeePaymentArgs.feeTokenAddress).to.equal(gasFeePaymentArgs.feeTokenAddress);
      expect(lastCallArgs.routerArgs).to.equal(routerArgs);
    });

    it("Should be able to accept deposits in Native", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const reclaimer = charlie;
      const minAmount = 0;

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(() =>
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [abiCoder.encode(["uint256", "address"], [minAmount, charlie.address])],
          },
          {
            value: amount,
          }
        )
      ).to.changeEtherBalances([liquidityPool, owner], [amount, amount.mul(-1)]);

      const lastCallArgs = await ccmpMock.lastCallArgs();
      const lastCallPayload = await ccmpMock.lastCallPayload();

      expect(lastCallArgs.destinationChainId).to.equal(destinationChainId);
      expect(lastCallArgs.adaptorName).to.equal(adaptorName);
      expect(
        compareLastCallPayloads(lastCallPayload, [
          {
            to: liquidityPool.address,
            _calldata: getSendFundsToUserFromCCMPCalldata(
              tokenSymbol,
              amount,
              18,
              charlie.address,
              gasFeePaymentArgs.feeAmount,
              minAmount,
              charlie.address
            ),
          },
          ...payloads,
        ])
      ).to.be.true;
      expect(lastCallArgs.gasFeePaymentArgs.relayer).to.equal(gasFeePaymentArgs.relayer);
      expect(lastCallArgs.gasFeePaymentArgs.feeAmount).to.equal(gasFeePaymentArgs.feeAmount);
      expect(lastCallArgs.gasFeePaymentArgs.feeTokenAddress).to.equal(gasFeePaymentArgs.feeTokenAddress);
      expect(lastCallArgs.routerArgs).to.equal(routerArgs);
    });

    it("Should include existing payloads while deposit", async function () {
      const payloads: CCMPMessagePayload[] = [
        {
          to: owner.address,
          _calldata: "0x1234",
        },
        {
          to: owner.address,
          _calldata: "0x1234",
        },
        {
          to: owner.address,
          _calldata: "0x1234",
        },
      ];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const minAmount = 0;

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(() =>
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [],
          },
          {
            value: amount,
          }
        )
      ).to.changeEtherBalances([liquidityPool, owner], [amount, amount.mul(-1)]);

      const lastCallArgs = await ccmpMock.lastCallArgs();
      const lastCallPayload = await ccmpMock.lastCallPayload();

      expect(lastCallArgs.destinationChainId).to.equal(destinationChainId);
      expect(lastCallArgs.adaptorName).to.equal(adaptorName);
      expect(
        compareLastCallPayloads(lastCallPayload, [
          {
            to: liquidityPool.address,
            _calldata: getSendFundsToUserFromCCMPCalldata(
              tokenSymbol,
              amount,
              18,
              charlie.address,
              gasFeePaymentArgs.feeAmount
            ),
          },
          ...payloads.map(({ to, _calldata }) => ({
            to,
            // abi.encodePacked(...)
            _calldata: ethers.utils.solidityPack(["bytes", "address"], [_calldata, owner.address]),
          })),
        ])
      ).to.be.true;
      expect(lastCallArgs.gasFeePaymentArgs.relayer).to.equal(gasFeePaymentArgs.relayer);
      expect(lastCallArgs.gasFeePaymentArgs.feeAmount).to.equal(gasFeePaymentArgs.feeAmount);
      expect(lastCallArgs.gasFeePaymentArgs.feeTokenAddress).to.equal(gasFeePaymentArgs.feeTokenAddress);
      expect(lastCallArgs.routerArgs).to.equal(routerArgs);
    });

    it("Should forward origin details", async function () {
      const message = "MESSAGE_TEST";
      const payloads: CCMPMessagePayload[] = [
        {
          to: sampleContract.address,
          _calldata: sampleContract.interface.encodeFunctionData("emitEvent", [message]),
        },
      ];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress(
        [destinationChainId, chainId],
        [liquidityPool.address, liquidityPool.address]
      );

      await liquidityPool.depositAndCall(
        {
          toChainId: destinationChainId,
          tokenAddress: NATIVE,
          receiver: charlie.address,
          amount,
          tag: "test",
          payloads,
          gasFeePaymentArgs,
          adaptorName,
          routerArgs,
          hyphenArgs: [],
        },
        {
          value: amount,
        }
      );

      const lastCallPayload = (await ccmpMock.lastCallPayload())[1];
      await expect(ccmpMock.callContract(lastCallPayload.to, lastCallPayload._calldata, chainId, liquidityPool.address))
        .to.emit(sampleContract, "Message")
        .withArgs(message, owner.address, chainId);
    });

    it("Should prevent secondary paylods from executing on liquidity pool on destination chain", async function () {
      const message = "MESSAGE_TEST";
      const payloads: CCMPMessagePayload[] = [
        {
          to: liquidityPool.address,
          _calldata: sampleContract.interface.encodeFunctionData("emitEvent", [message]),
        },
      ];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [],
          },
          {
            value: amount,
          }
        )
      ).to.be.revertedWith("51");
    });

    it("Should prevent recipient from receiving messages from contracts other than hyphen", async function () {
      const message = "MESSAGE_TEST";
      const payloads: CCMPMessagePayload[] = [
        {
          to: liquidityPool.address,
          _calldata: sampleContract.interface.encodeFunctionData("emitEvent", [message]),
        },
      ];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(ccmpMock.callContract(sampleContract.address, payloads[0]._calldata, chainId, owner.address)).to.be
        .reverted;
    });

    it("Should be able to pay Native fee while depositing", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const feeAmount = 20;
      const relayer = bob;
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: feeAmount,
        relayer: relayer.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const minAmount = 0;

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(() =>
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [],
          },
          {
            value: amount.add(feeAmount),
          }
        )
      ).to.changeEtherBalances([liquidityPool, owner, relayer], [amount, amount.add(feeAmount).mul(-1), feeAmount]);

      const lastCallArgs = await ccmpMock.lastCallArgs();
      const lastCallPayload = await ccmpMock.lastCallPayload();

      expect(lastCallArgs.destinationChainId).to.equal(destinationChainId);
      expect(lastCallArgs.adaptorName).to.equal(adaptorName);
      expect(
        compareLastCallPayloads(lastCallPayload, [
          {
            to: liquidityPool.address,
            _calldata: getSendFundsToUserFromCCMPCalldata(
              tokenSymbol,
              amount,
              18,
              charlie.address,
              gasFeePaymentArgs.feeAmount,
              minAmount
            ),
          },
          ...payloads,
        ])
      ).to.be.true;
      expect(lastCallArgs.gasFeePaymentArgs.relayer).to.equal(gasFeePaymentArgs.relayer);
      expect(lastCallArgs.gasFeePaymentArgs.feeAmount).to.equal(gasFeePaymentArgs.feeAmount);
      expect(lastCallArgs.gasFeePaymentArgs.feeTokenAddress).to.equal(gasFeePaymentArgs.feeTokenAddress);
      expect(lastCallArgs.routerArgs).to.equal(routerArgs);
    });

    it("Should be able to pay ERC20 fee while depositing", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const feeAmount = 20;
      const relayer = bob;
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: token.address,
        feeAmount: feeAmount,
        relayer: relayer.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const minAmount = 0;

      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);
      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(() =>
        liquidityPool.depositAndCall({
          toChainId: destinationChainId,
          tokenAddress: token.address,
          receiver: charlie.address,
          amount,
          tag: "test",
          payloads,
          gasFeePaymentArgs,
          adaptorName,
          routerArgs,
          hyphenArgs: [],
        })
      ).to.changeTokenBalances(
        token,
        [liquidityPool, owner, relayer],
        [amount, amount.add(feeAmount).mul(-1), feeAmount]
      );

      const lastCallArgs = await ccmpMock.lastCallArgs();
      const lastCallPayload = await ccmpMock.lastCallPayload();

      expect(lastCallArgs.destinationChainId).to.equal(destinationChainId);
      expect(lastCallArgs.adaptorName).to.equal(adaptorName);
      expect(
        compareLastCallPayloads(lastCallPayload, [
          {
            to: liquidityPool.address,
            _calldata: getSendFundsToUserFromCCMPCalldata(
              tokenSymbol,
              amount,
              18,
              charlie.address,
              gasFeePaymentArgs.feeAmount
            ),
          },
          ...payloads,
        ])
      ).to.be.true;
      expect(lastCallArgs.gasFeePaymentArgs.relayer).to.equal(gasFeePaymentArgs.relayer);
      expect(lastCallArgs.gasFeePaymentArgs.feeAmount).to.equal(gasFeePaymentArgs.feeAmount);
      expect(lastCallArgs.gasFeePaymentArgs.feeTokenAddress).to.equal(gasFeePaymentArgs.feeTokenAddress);
      expect(lastCallArgs.routerArgs).to.equal(routerArgs);
    });

    it("Should revert if token symbol is not registered", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const minAmount = 0;

      await liquidityPool.setLiquidityPoolAddress([destinationChainId], [liquidityPool.address]);

      await expect(
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [],
          },
          {
            value: amount,
          }
        )
      ).to.be.revertedWith("11");
    });

    it("Should revert if destination chain liquidity pool not registered", async function () {
      const payloads: CCMPMessagePayload[] = [];
      const gasFeePaymentArgs: GasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: owner.address,
      };
      const adaptorName = "wormhole";
      const routerArgs = emptyBytes;
      const destinationChainId = 1;
      const tokenSymbol = 1;
      const amount = ethers.BigNumber.from(minTokenCap);
      const minAmount = 0;

      await tokenManager.setTokenSymbol([NATIVE], [tokenSymbol]);

      await expect(
        liquidityPool.depositAndCall(
          {
            toChainId: destinationChainId,
            tokenAddress: NATIVE,
            receiver: charlie.address,
            amount,
            tag: "test",
            payloads,
            gasFeePaymentArgs,
            adaptorName,
            routerArgs,
            hyphenArgs: [],
          },
          {
            value: amount,
          }
        )
      ).to.be.revertedWith("12");
    });

    it("Should be able to release tokens to user via CCMP", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const fromChainId = BigNumber.from(2).pow(255).sub(1);
      const tokenSymbol = 1;
      const calldata = getSendFundsToUserFromCCMPCalldata(tokenSymbol, minTokenCap, 18, charlie.address, 0);

      const transferFeePer = await liquidityPool.getTransferFee(token.address, amount);
      const transferFee = amount.mul(transferFeePer).div(baseDivisor);
      const transferredAmount = amount.sub(transferFee);

      expect(transferredAmount).to.be.gt(0);

      await liquidityPool.setLiquidityPoolAddress([fromChainId], [liquidityPool.address]);
      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);

      await expect(() =>
        ccmpMock.callContract(liquidityPool.address, calldata, fromChainId, liquidityPool.address)
      ).to.changeTokenBalances(token, [liquidityPool, charlie], [transferredAmount.mul(-1), transferredAmount]);
    });

    it("Should revert if origin contract is invalid", async function () {
      const fromChainId = BigNumber.from(2).pow(255).sub(1);
      const tokenSymbol = 1;
      const calldata = getSendFundsToUserFromCCMPCalldata(tokenSymbol, minTokenCap, 18, charlie.address, 0);

      await liquidityPool.setLiquidityPoolAddress([fromChainId], [liquidityPool.address]);
      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);

      await expect(
        ccmpMock.callContract(liquidityPool.address, calldata, fromChainId, owner.address)
      ).to.be.revertedWith("24");
    });

    it("Should revert if token symbol is not set", async function () {
      const fromChainId = BigNumber.from(2).pow(255).sub(1);
      const tokenSymbol = 1;
      const calldata = getSendFundsToUserFromCCMPCalldata(tokenSymbol, minTokenCap, 18, charlie.address, 0, 0);

      await liquidityPool.setLiquidityPoolAddress([fromChainId], [liquidityPool.address]);

      await expect(
        ccmpMock.callContract(liquidityPool.address, calldata, fromChainId, liquidityPool.address)
      ).to.be.revertedWith("25");
    });

    it("Should revert if transferred amount is less than min value", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const fromChainId = BigNumber.from(2).pow(255).sub(1);
      const tokenSymbol = 1;
      const reclaimer = charlie;
      const calldata = getSendFundsToUserFromCCMPCalldata(
        tokenSymbol,
        amount,
        18,
        charlie.address,
        0,
        amount.add(1),
        reclaimer.address
      );

      await liquidityPool.setLiquidityPoolAddress([fromChainId], [liquidityPool.address]);
      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);

      await expect(
        ccmpMock.callContract(liquidityPool.address, calldata, fromChainId, liquidityPool.address)
      ).to.be.revertedWith("49");
    });

    it("Should process transaction with tf < minAmount if origin is receiver", async function () {
      const amount = ethers.BigNumber.from(minTokenCap);
      const fromChainId = BigNumber.from(2).pow(255).sub(1);
      const tokenSymbol = 1;
      const receiver = charlie;
      const gasFeePaid = 10;
      const reclaimer = charlie;
      const calldata = getSendFundsToUserFromCCMPCalldata(
        tokenSymbol,
        amount,
        18,
        receiver.address,
        gasFeePaid,
        amount.add(1),
        reclaimer.address
      );

      const transferFeePer = await liquidityPool.getTransferFee(token.address, amount);
      const transferFee = amount.mul(transferFeePer).div(baseDivisor);
      const transferredAmount = amount.sub(transferFee);

      expect(transferredAmount).to.be.gt(0);

      await liquidityPool.setLiquidityPoolAddress([fromChainId], [liquidityPool.address]);
      await tokenManager.setTokenSymbol([token.address], [tokenSymbol]);

      await expect(() =>
        ccmpMock.connect(reclaimer).callContract(liquidityPool.address, calldata, fromChainId, liquidityPool.address)
      ).to.changeTokenBalances(token, [liquidityPool, receiver], [transferredAmount.mul(-1), transferredAmount]);
    });
  });
});
