import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import { ethers, upgrades, network } from 'hardhat';
import { smock, FakeContract } from '@defi-wonderland/smock';
import {
  CCMPMessagePayloadStruct,
  CCMPMessageStruct,
  GasFeePaymentArgsStruct,
} from '../typechain-types/contracts/interfaces/ICCMPRouterAdaptor';
import { Structs } from '../typechain-types/contracts/interfaces/IWormhole';
import { parseUnits } from 'ethers/lib/utils';
import { use } from 'chai';
import {
  ICCMPGateway,
  ICCMPGateway__factory,
  AxelarAdaptor,
  WormholeAdaptor,
  SampleContract,
  CCMPHelper,
  IAxelarGateway,
  IAxelarGateway__factory,
  MockWormhole,
  ERC20Token,
  SampleContract__factory,
  CCMPExecutor,
  CCMPExecutor__factory,
  AxelarAdaptor__factory,
  WormholeAdaptor__factory,
  CCMPHelper__factory,
  ERC20Token__factory,
  MockWormhole__factory,
  IAbacusConnectionManager,
  HyperlaneAdaptor,
  HyperlaneAdaptor__factory,
} from '../typechain-types';
import { deployGateway } from '../scripts/deploy/deploy';
import { IAbacusConnectionManager__factory } from '@abacus-network/app';
import { getDeployerInstance } from '../scripts/deploy/deploy-metadeployer';

const NATIVE = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

use(smock.matchers);

describe('CCMPGateway', async function () {
  let owner: SignerWithAddress,
    alice: SignerWithAddress,
    bob: SignerWithAddress,
    charlie: SignerWithAddress,
    trustedForwarder: SignerWithAddress,
    pauser: SignerWithAddress;
  let CCMPGateway: ICCMPGateway,
    CCMPExecutor: CCMPExecutor,
    AxelarAdaptor: AxelarAdaptor,
    WormholeAdaptor: WormholeAdaptor,
    HyperlaneAdaptor: HyperlaneAdaptor,
    MockAxelarGateway: FakeContract<IAxelarGateway>,
    MockWormholeGateway: MockWormhole,
    MockAbacusConnectionManager: FakeContract<IAbacusConnectionManager>,
    CCMPHelper: CCMPHelper,
    Token: ERC20Token,
    SampleContract: SampleContract,
    SampleContractMock: FakeContract<SampleContract>;
  const abiCoder = new ethers.utils.AbiCoder();

  const getSampleCalldata = (message: string) =>
    SampleContract.interface.encodeFunctionData('emitEvent', [message]);
  const getSampleCalldataWithValidation = (message: string) =>
    SampleContract.interface.encodeFunctionData('emitWithValidation', [message]);

  const reset = async () => await network.provider.send('hardhat_reset');

  beforeEach(async function () {
    await reset();

    [owner, alice, bob, charlie, trustedForwarder, pauser] = await ethers.getSigners();

    MockAxelarGateway = await smock.fake(IAxelarGateway__factory.abi);

    MockWormholeGateway = await new MockWormhole__factory(owner).deploy();

    MockAbacusConnectionManager = await smock.fake(IAbacusConnectionManager__factory.abi);

    await owner.sendTransaction({
      to: new Wallet(process.env.METADEPLOYER_PRIVATE_KEY!, ethers.provider).address,
      value: parseUnits('1', 'ether'),
    });
    const deployer = await getDeployerInstance();

    const { contracts: Diamond } = await deployGateway(deployer, pauser.address);
    CCMPGateway = ICCMPGateway__factory.connect(Diamond.Diamond.address, owner);

    CCMPExecutor = await new CCMPExecutor__factory(owner).deploy(
      CCMPGateway.address,
      owner.address
    );
    await CCMPGateway.setCCMPExecutor(CCMPExecutor.address);

    AxelarAdaptor = await new AxelarAdaptor__factory(owner).deploy(
      MockAxelarGateway.address,
      CCMPGateway.address,
      owner.address,
      pauser.address
    );

    WormholeAdaptor = await new WormholeAdaptor__factory(owner).deploy(
      MockWormholeGateway.address,
      CCMPGateway.address,
      owner.address,
      pauser.address,
      1
    );

    HyperlaneAdaptor = await new HyperlaneAdaptor__factory(owner).deploy(
      CCMPGateway.address,
      owner.address,
      pauser.address,
      MockAbacusConnectionManager.address,
      MockAbacusConnectionManager.address
    );

    SampleContract = await new SampleContract__factory(owner).deploy(
      CCMPExecutor.address,
      ethers.constants.AddressZero
    );

    SampleContractMock = await smock.fake(SampleContract__factory.abi);

    CCMPHelper = await new CCMPHelper__factory(owner).deploy();

    Token = (await upgrades.deployProxy(new ERC20Token__factory(owner), [
      'Token',
      'TKN',
      18,
    ])) as ERC20Token;

    for (const signer of [owner, alice, bob, charlie, trustedForwarder, pauser]) {
      await Token.mint(signer.address, parseUnits('1000000', 18));
    }
    const chainId = (await ethers.provider.getNetwork()).chainId;
    await AxelarAdaptor.setChainIdToName(chainId + 1, 'test');
  });

  it('Should manage adaptors correctly', async function () {
    await expect(CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address))
      .to.emit(CCMPGateway, 'AdaptorUpdated')
      .withArgs('axelar', AxelarAdaptor.address);

    await expect(CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address))
      .to.emit(CCMPGateway, 'AdaptorUpdated')
      .withArgs('wormhole', WormholeAdaptor.address);

    expect(await CCMPGateway.routerAdator('axelar')).to.equal(AxelarAdaptor.address);
    expect(await CCMPGateway.routerAdator('wormhole')).to.equal(WormholeAdaptor.address);
  });

  it('Should prevent non owners from setting adaptors', async function () {
    await expect(CCMPGateway.connect(alice).setRouterAdaptor('wormhole', WormholeAdaptor.address))
      .to.be.reverted;
  });

  it('Should prevent non owners from changing pauser', async function () {
    await expect(CCMPGateway.connect(alice).setPauser(bob.address)).to.be.reverted;
  });

  it('Should allow owner to change pauser', async function () {
    await expect(CCMPGateway.setPauser(bob.address))
      .emit(CCMPGateway, 'PauserUpdated')
      .withArgs(bob.address);
    expect(await CCMPGateway.pauser()).to.equal(bob.address);
  });

  it('Should allow pauser to pause and unpause', async function () {
    await expect(CCMPGateway.connect(pauser).pause()).to.emit(CCMPGateway, 'ContractPaused');
    await expect(CCMPGateway.connect(pauser).unpause()).to.emit(CCMPGateway, 'ContractUnpaused');
  });

  it('Should prevent non pauser from pausing or unpausing', async function () {
    await expect(CCMPGateway.pause()).to.be.reverted;
    await expect(CCMPGateway.unpause()).to.be.reverted;
  });

  it('Should set gateways correctly', async function () {
    await expect(CCMPGateway.setGateway(10, CCMPGateway.address))
      .to.emit(CCMPGateway, 'GatewayUpdated')
      .withArgs(10, CCMPGateway.address);

    expect(await CCMPGateway.gateway(10)).to.equal(CCMPGateway.address);
  });

  it('Should prevent non owners from setting gateway', async function () {
    await expect(CCMPGateway.connect(alice).setGateway(10, CCMPGateway.address)).to.be.reverted;
  });

  describe('Sending Messages', async function () {
    let payloads: CCMPMessagePayloadStruct[];
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);

    beforeEach(async function () {
      payloads = [
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World'),
        },
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World 2.0'),
        },
      ];

      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };

      MockAxelarGateway.validateContractCall.returns(true);
    });

    it('Should revert if adaptor is not supported', async function () {
      await expect(CCMPGateway.sendMessage(10, 'axelar', payloads, gasFeePaymentArgs, emptyBytes))
        .to.be.revertedWithCustomError(CCMPGateway, 'UnsupportedAdapter')
        .withArgs('axelar');
    });

    it('Should revert if source chain id is same as destnation', async function () {
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await expect(
        CCMPGateway.sendMessage(
          chainId,
          'axelar',
          payloads,
          gasFeePaymentArgs,
          abiCoder.encode(['string'], [ethers.constants.AddressZero])
        )
      )
        .to.be.revertedWithCustomError(CCMPGateway, 'UnsupportedDestinationChain')
        .withArgs(chainId);
    });

    it('Should revert if destination chain gateway is not registered', async function () {
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await expect(
        CCMPGateway.sendMessage(
          chainId + 1,
          'axelar',
          payloads,
          gasFeePaymentArgs,
          abiCoder.encode(['string'], [ethers.constants.AddressZero])
        )
      )
        .to.be.revertedWithCustomError(CCMPGateway, 'UnsupportedDestinationChain')
        .withArgs(chainId + 1);
    });

    it('Should revert if payload is empty', async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      await expect(
        CCMPGateway.sendMessage(
          chainId + 1,
          'axelar',
          [],
          gasFeePaymentArgs,
          abiCoder.encode(['string'], [ethers.constants.AddressZero])
        )
      )
        .to.be.revertedWithCustomError(CCMPGateway, 'InvalidPayload')
        .withArgs('No payload');
    });

    it('Should revert if contract is paused', async function () {
      await CCMPGateway.connect(pauser).pause();

      const chainId = (await ethers.provider.getNetwork()).chainId;
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      await expect(
        CCMPGateway.sendMessage(
          chainId + 1,
          'axelar',
          payloads,
          gasFeePaymentArgs,

          abiCoder.encode(['string'], [ethers.constants.AddressZero])
        )
      ).to.be.reverted;
    });

    it('Should route payload if all checks are satisfied', async function () {
      const chainId = (await ethers.provider.getNetwork()).chainId;
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await AxelarAdaptor.setChainIdToName(chainId + 1, 'ethereum-test');
      await AxelarAdaptor.setAxelarAdaptorAddressChecksummed(
        'ethereum-test',
        ethers.utils.getAddress(AxelarAdaptor.address)
      );

      await expect(
        CCMPGateway.sendMessage(chainId + 1, 'axelar', payloads, gasFeePaymentArgs, emptyBytes)
      ).to.not.be.reverted;
    });
  });

  describe('Receiving Messages - Axelar', async function () {
    let payloads: CCMPMessagePayloadStruct[];
    let message: CCMPMessageStruct;
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);
    let chainId: number;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;

      payloads = [
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World'),
        },
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World 2.0'),
        },
      ];

      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };

      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: AxelarAdaptor.address,
        sourceChainId: chainId + 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: 'axelar',
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        gasFeePaymentArgs: gasFeePaymentArgs,
        payload: payloads,
      };
    });

    it('Should revert if source is not registered', async function () {
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'InvalidSource')
        .withArgs(chainId + 1, CCMPGateway.address);
    });

    it('Should revert if destination chain is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationChainId = 12321;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(12321, CCMPGateway.address);
    });

    it('Should revert if destination gateway is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationGateway = bob.address;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(chainId, bob.address);
    });

    it('Should revert if nonce is already used', async function () {
      MockAxelarGateway.validateContractCall.returns(true);
      const messageHash = await CCMPHelper.hash(message);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      await AxelarAdaptor.setChainIdToName(chainId + 1, 'ethereum-test');
      await AxelarAdaptor.setAxelarAdaptorAddressChecksummed(
        'ethereum-test',
        ethers.utils.getAddress(AxelarAdaptor.address)
      );
      await AxelarAdaptor.execute(
        ethers.utils.formatBytes32String('ethereum-test'),
        'ethereum-test',
        AxelarAdaptor.address,
        abiCoder.encode(['bytes32'], [messageHash])
      );
      await CCMPGateway.receiveMessage(message, emptyBytes, false);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'AlreadyExecuted')
        .withArgs(message.nonce);
    });

    it('Should revert if message validation fails', async function () {
      MockAxelarGateway.validateContractCall.returns(false);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);

      await expect(
        CCMPGateway.receiveMessage(message, emptyBytes, false)
      ).to.be.revertedWithCustomError(CCMPGateway, 'VerificationFailed');
    });

    it('Should revert if contract is paused', async function () {
      await CCMPGateway.connect(pauser).pause();

      MockAxelarGateway.validateContractCall.returns(true);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);

      expect(CCMPGateway.receiveMessage(message, emptyBytes, false)).to.be.reverted;
    });

    it('Should execute message if all checks are satisfied', async function () {
      const messageHash = await CCMPHelper.hash(message);

      MockAxelarGateway.validateContractCall.returns(true);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('axelar', AxelarAdaptor.address);
      await AxelarAdaptor.setChainIdToName(chainId + 1, 'ethereum-test');
      await AxelarAdaptor.setAxelarAdaptorAddressChecksummed(
        'ethereum-test',
        ethers.utils.getAddress(AxelarAdaptor.address)
      );
      await AxelarAdaptor.execute(
        ethers.utils.formatBytes32String('ethereum-test'),
        'ethereum-test',
        AxelarAdaptor.address,
        abiCoder.encode(['bytes32'], [messageHash])
      );

      const tx = CCMPGateway.receiveMessage(message, emptyBytes, false);

      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World');
      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World 2.0');
    });
  });

  describe('Receiving Messages - Wormhole', async function () {
    let payloads: CCMPMessagePayloadStruct[];
    let message: CCMPMessageStruct;
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    let chainId: number;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);

    const sampleVmStruct: Structs.VMStruct = {
      version: 0,
      timestamp: 0,
      nonce: 0,
      emitterChainId: 0,
      emitterAddress: ethers.constants.AddressZero,
      sequence: 0,
      consistencyLevel: 0,
      payload: '',
      guardianSetIndex: 0,
      signatures: [],
      hash: ethers.utils.keccak256(ethers.constants.AddressZero),
    };

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;
      payloads = [
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World'),
        },
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World 2.0'),
        },
      ];
      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };
      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: AxelarAdaptor.address,
        sourceChainId: chainId + 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: 'wormhole',
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        gasFeePaymentArgs,
        payload: payloads,
      };
    });

    it('Should revert if source is not registered', async function () {
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'InvalidSource')
        .withArgs(chainId + 1, CCMPGateway.address);
    });

    it('Should revert if destination chain is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationChainId = 12321;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(12321, CCMPGateway.address);
    });

    it('Should revert if destination gateway is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationGateway = bob.address;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(chainId, bob.address);
    });

    it('Should revert if nonce is already used', async function () {
      const messageHash = await CCMPHelper.hash(message);

      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);
      await CCMPGateway.receiveMessage(message, emptyBytes, false);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'AlreadyExecuted')
        .withArgs(message.nonce);
    });

    it('Should revert if message validation fails', async function () {
      await MockWormholeGateway.setValidationState(false);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);

      await expect(
        CCMPGateway.receiveMessage(message, emptyBytes, false)
      ).to.be.revertedWithCustomError(CCMPGateway, 'VerificationFailed');
    });

    it('Should execute message if all checks are satisfied', async function () {
      const newStruct = { ...sampleVmStruct };
      const messageHash = await CCMPHelper.hash(message);
      newStruct.payload = messageHash;
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);

      const tx = CCMPGateway.receiveMessage(message, emptyBytes, false);

      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World');
      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World 2.0');
    });
  });

  describe('Receiving Messages - Hyperlane', async function () {
    let payloads: CCMPMessagePayloadStruct[];
    let message: CCMPMessageStruct;
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);
    let chainId: number;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;

      payloads = [
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World'),
        },
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World 2.0'),
        },
      ];

      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };

      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: AxelarAdaptor.address,
        sourceChainId: chainId + 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: 'hyperlane',
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        gasFeePaymentArgs: gasFeePaymentArgs,
        payload: payloads,
      };
    });

    it('Should revert if source is not registered', async function () {
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'InvalidSource')
        .withArgs(chainId + 1, CCMPGateway.address);
    });

    it('Should revert if destination chain is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationChainId = 12321;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(12321, CCMPGateway.address);
    });

    it('Should revert if destination gateway is incorrect', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);

      message.destinationGateway = bob.address;
      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'WrongDestination')
        .withArgs(chainId, bob.address);
    });

    it('Should revert if message validation fails', async function () {
      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('hyperlane', HyperlaneAdaptor.address);

      await expect(
        CCMPGateway.receiveMessage(message, emptyBytes, false)
      ).to.be.revertedWithCustomError(CCMPGateway, 'VerificationFailed');
    });

    it('Should execute message if all checks are satisfied', async function () {
      const messageHash = await CCMPHelper.hash(message);

      MockAbacusConnectionManager.isInbox.returns(true);

      await CCMPGateway.setGateway(chainId + 1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('hyperlane', HyperlaneAdaptor.address);
      await HyperlaneAdaptor.updateDomainId(chainId + 1, chainId + 1);
      await HyperlaneAdaptor.setHyperlaneAdaptor(chainId + 1, HyperlaneAdaptor.address);
      await HyperlaneAdaptor.handle(
        chainId + 1,
        ethers.utils.hexZeroPad(HyperlaneAdaptor.address, 32),
        abiCoder.encode(['bytes32'], [messageHash])
      );

      const tx = CCMPGateway.receiveMessage(message, emptyBytes, false);

      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World');
      await expect(tx).to.emit(SampleContract, 'SampleEvent').withArgs('Hello World 2.0');
    });
  });

  describe('Fee Management', async function () {
    let chainId: number;
    let payloads: CCMPMessagePayloadStruct[];
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);
    let routeArgs = emptyBytes;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;
      payloads = [
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World'),
        },
        {
          to: SampleContract.address,
          _calldata: getSampleCalldata('Hello World 2.0'),
        },
      ];

      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };

      await CCMPGateway.setGateway(1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);
    });

    it('Should allow fee to be paid separately in native tokens', async function () {
      gasFeePaymentArgs.feeAmount = parseUnits('1', 18);
      gasFeePaymentArgs.relayer = charlie.address;

      await expect(
        CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs, {
          value: gasFeePaymentArgs.feeAmount,
        })
      )
        .to.emit(CCMPGateway, 'FeePaid')
        .withArgs(NATIVE, gasFeePaymentArgs.feeAmount, charlie.address);

      await expect(() =>
        CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs, {
          value: gasFeePaymentArgs.feeAmount,
        })
      ).to.changeEtherBalances(
        [owner, charlie],
        [gasFeePaymentArgs.feeAmount.mul(-1), gasFeePaymentArgs.feeAmount]
      );
    });

    it('Should revert if there is a mismatch in native token fee amount', async function () {
      gasFeePaymentArgs.feeAmount = parseUnits('1', 18);
      gasFeePaymentArgs.relayer = charlie.address;

      await expect(
        CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs, {
          value: gasFeePaymentArgs.feeAmount.sub(1),
        })
      ).to.be.revertedWithCustomError(CCMPGateway, 'NativeAmountMismatch');
    });

    it('Shoud allow fee to be paid separately in ERC20 tokens', async function () {
      gasFeePaymentArgs.feeAmount = parseUnits('1', 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPGateway.address, gasFeePaymentArgs.feeAmount.mul(2));

      await expect(CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs))
        .to.emit(CCMPGateway, 'FeePaid')
        .withArgs(Token.address, gasFeePaymentArgs.feeAmount, charlie.address);

      await expect(() =>
        CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs)
      ).to.changeTokenBalances(
        Token,
        [owner, charlie],
        [gasFeePaymentArgs.feeAmount.mul(-1), gasFeePaymentArgs.feeAmount]
      );
    });

    it('Shoud revert if user has insufficient tokens', async function () {
      await Token.transfer(alice.address, await Token.balanceOf(owner.address));

      gasFeePaymentArgs.feeAmount = parseUnits('1', 18);
      gasFeePaymentArgs.relayer = charlie.address;
      gasFeePaymentArgs.feeTokenAddress = Token.address;

      await Token.approve(CCMPGateway.address, gasFeePaymentArgs.feeAmount);

      await expect(CCMPGateway.sendMessage(1, 'wormhole', payloads, gasFeePaymentArgs, routeArgs))
        .to.be.reverted;
    });
  });

  describe('Message Execution', async function () {
    let chainId: number;
    let gasFeePaymentArgs: GasFeePaymentArgsStruct;
    let message: CCMPMessageStruct;
    const emptyBytes = abiCoder.encode(['bytes'], [ethers.constants.HashZero]);
    let routeArgs = emptyBytes;

    beforeEach(async function () {
      chainId = (await ethers.provider.getNetwork()).chainId;

      gasFeePaymentArgs = {
        feeTokenAddress: NATIVE,
        feeAmount: 0,
        relayer: alice.address,
      };

      message = {
        sender: owner.address,
        sourceGateway: CCMPGateway.address,
        sourceAdaptor: WormholeAdaptor.address,
        sourceChainId: 1,
        destinationGateway: CCMPGateway.address,
        destinationChainId: chainId,
        routerAdaptor: 'wormhole',
        nonce: BigNumber.from(chainId + 1).mul(BigNumber.from(2).mul(128)),
        gasFeePaymentArgs: gasFeePaymentArgs,
        payload: [],
      };

      await CCMPGateway.setGateway(1, CCMPGateway.address);
      await CCMPGateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);
    });

    it('Should be able to execute contract calls', async function () {
      const payload: CCMPMessagePayloadStruct = {
        to: SampleContractMock.address,
        _calldata: getSampleCalldata('Hello World'),
      };

      message.payload = [payload];
      const messageHash = await CCMPHelper.hash(message);
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await CCMPGateway.receiveMessage(message, emptyBytes, false);

      expect(SampleContractMock.emitEvent).to.have.been.calledWith('Hello World');
    });

    it('Should revert if contract call fails', async function () {
      const payload: CCMPMessagePayloadStruct = {
        to: SampleContractMock.address,
        _calldata: getSampleCalldata('Hello World'),
      };

      const revertMessage = 'REVERT_TEST';

      message.payload = [payload];

      const messageHash = await CCMPHelper.hash(message);
      SampleContractMock.emitEvent.reverts(revertMessage);
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.be.revertedWithCustomError(CCMPGateway, 'ExternalCallFailed')
        .withArgs(0, SampleContractMock.address, '0x');
    });

    it('Should not revert if contract call fails and parital execution is allowed', async function () {
      const payload: CCMPMessagePayloadStruct = {
        to: SampleContractMock.address,
        _calldata: getSampleCalldata('Hello World'),
      };

      const revertMessage = 'REVERT_TEST';

      message.payload = [payload];

      const messageHash = await CCMPHelper.hash(message);
      SampleContractMock.emitEvent.reverts(revertMessage);
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes, true)).to.not.be.reverted;
    });

    it('Should emit valid origin details', async function () {
      const payload: CCMPMessagePayloadStruct = {
        to: SampleContract.address,
        _calldata: getSampleCalldataWithValidation('Hello World'),
      };

      message.payload = [payload];
      const messageHash = await CCMPHelper.hash(message);
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await expect(CCMPGateway.receiveMessage(message, emptyBytes, false))
        .to.emit(SampleContract, 'SampleEventExtended')
        .withArgs('Hello World', 1, owner.address);
    });

    it('Should revert if message is executed from a contract other than Gateway', async function () {
      const payload: CCMPMessagePayloadStruct = {
        to: SampleContract.address,
        _calldata: getSampleCalldataWithValidation('Hello World'),
      };

      message.payload = [payload];
      const messageHash = await CCMPHelper.hash(message);
      await MockWormholeGateway.setValidationState(true);
      await MockWormholeGateway.setPayload(messageHash);

      await expect(SampleContract.emitWithValidation('Hello World')).to.be.revertedWithCustomError(
        SampleContract,
        'InvalidOrigin'
      );
    });
  });
});
