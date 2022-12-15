import { ethers } from 'hardhat';
import {
  AxelarAdaptor,
  WormholeAdaptor,
  SampleContract,
  CCMPExecutor,
  CCMPExecutor__factory,
  AxelarAdaptor__factory,
  WormholeAdaptor__factory,
  DiamondInit__factory,
  CCMPConfigurationFacet__factory,
  CCMPSendMessageFacet__factory,
  DiamondCutFacet__factory,
  DiamondLoupeFacet__factory,
  CCMPReceiverMessageFacet__factory,
  HyperlaneAdaptor__factory,
  Diamond__factory,
  CCMPConfigurationFacet,
  CCMPSendMessageFacet,
  DiamondCutFacet,
  DiamondLoupeFacet,
  DiamondInit,
  CCMPReceiverMessageFacet,
  Diamond,
  ICCMPGateway__factory,
  HyperlaneAdaptor,
  Deployer,
  SampleContract__factory,
} from '../../typechain-types';
import { Contract, Wallet } from 'ethers';
import { deployCreate3, FacetCutAction, getSelectors } from './utils';
import { DiamondArgsStruct } from '../../typechain-types/contracts/gateway/Diamond';
import { getDeployerInstance } from './deploy-metadeployer';
import { DEPLOYMENT_SALTS } from './deploymentSalt';

const AxelarAdaptorKey = 'axelar';
const WormholeAdaptorKey = 'wormhole';
const AbacusAdaptorKey = 'hyperlane';

const waitSec = async (n: number) => await new Promise((resolve) => setTimeout(resolve, n * 1000));

export type DeployParams = {
  owner: string;
  pauser: string;
  axelarGateway?: string;
  wormholeGateway?: string;
  wormholeDeploymentMode?: 0 | 1;
  abacusConnectionManager?: string;
  abacusInterchainGasMaster?: string;
};

export type GatewayContracts = {
  CCMPConfigurationFacet?: CCMPConfigurationFacet;
  CCMPReceiverMessageFacet?: CCMPReceiverMessageFacet;
  CCMPSendMessageFacet?: CCMPSendMessageFacet;
  DiamondCutFacet?: DiamondCutFacet;
  DiamondLoupeFacet?: DiamondLoupeFacet;
  DiamondInit?: DiamondInit;
  Diamond: Diamond;
};

export type GatewayContractConstructorArgs = {
  CCMPConfigurationFacet?: any[];
  CCMPReceiveMessageFacet?: any[];
  CCMPSendMessageFacet?: any[];
  DiamondCutFacet?: any[];
  DiamondLoupeFacet?: any[];
  DiamondInit?: any[];
  Diamond: any[];
};

export type CCMPContracts = {
  CCMPExecutor: CCMPExecutor;
  AxelarAdaptor?: AxelarAdaptor;
  WormholeAdaptor?: WormholeAdaptor;
  HyperlaneAdaptor?: HyperlaneAdaptor;
} & GatewayContracts;

export type CCMPContractsConstructorArgs = {
  CCMPExecutor: any[];
  AxelarAdaptor?: any[];
  WormholeAdaptor?: any[];
  HyperlaneAdaptor?: any[];
} & GatewayContractConstructorArgs;

export const deployGateway = async (
  deployer: Deployer,
  pauser: string,
  debug: boolean = false
): Promise<{ contracts: GatewayContracts; constructorArgs: GatewayContractConstructorArgs }> => {
  debug && console.log('Deploying CCMPGateway...');
  const [signer] = await ethers.getSigners();

  // Deploy DiamondInit
  // DiamondInit provides a function that is called when the diamond is upgraded or deployed to initialize state variables
  // Read about how the diamondCut function works in the EIP2535 Diamonds standard
  const DiamondInit = DiamondInit__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.DiamondInit,
      new DiamondInit__factory(signer),
      [],
      'DiamondInit'
    ),
    signer
  );
  debug && console.log('DiamondInit deployed:', DiamondInit.address);

  // Deploy facets and set the `facetCuts` variable
  debug && console.log('Deploying facets...');

  debug && console.log('Deploying CCMPConfigurationFacet...');
  const CCMPConfigurationFacet = CCMPConfigurationFacet__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.CCMPConfigurationFacet,
      new CCMPConfigurationFacet__factory(signer),
      [],
      'CCMPConfigurationFacet'
    ),
    signer
  );
  debug && console.log('CCMPConfigurationFacet deployed:', CCMPConfigurationFacet.address);

  debug && console.log('Deploying CCMPReceiverMessageFacet...');
  const CCMPReceiverMessageFacet = CCMPReceiverMessageFacet__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.CCMPReceiverMessageFacet,
      new CCMPReceiverMessageFacet__factory(signer),
      [],
      'CCMPReceiverMessageFacet'
    ),
    signer
  );
  debug && console.log('CCMPReceiverMessageFacet deployed:', CCMPReceiverMessageFacet.address);

  debug && console.log('Deploying CCMPSendMessageFacet...');
  const CCMPSendMessageFacet = CCMPSendMessageFacet__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.CCMPSendMessageFacet,
      new CCMPSendMessageFacet__factory(signer),
      [],
      'CCMPSendMessageFacet'
    ),
    signer
  );
  debug && console.log('CCMPSendMessageFacet deployed:', CCMPSendMessageFacet.address);

  debug && console.log('Deploying DiamondCutFacet...');
  const DiamondCutFacet = DiamondCutFacet__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.DiamondCutFacet,
      new DiamondCutFacet__factory(signer),
      [],
      'DiamondCutFacet'
    ),
    signer
  );
  debug && console.log('DiamondCutFacet deployed:', DiamondCutFacet.address);

  debug && console.log('Deploying DiamondLoupeFacet...');
  const DiamondLoupeFacet = DiamondLoupeFacet__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.DiamondLoupeFacet,
      new DiamondLoupeFacet__factory(signer),
      [],
      'DiamondLoupeFacet'
    ),
    signer
  );
  debug && console.log('DiamondLoupeFacet deployed:', DiamondLoupeFacet.address);

  const facetCuts = [
    CCMPConfigurationFacet,
    CCMPSendMessageFacet,
    CCMPReceiverMessageFacet,
    DiamondCutFacet,
    DiamondLoupeFacet,
  ].map((facet) => ({
    facetAddress: facet.address,
    action: FacetCutAction.Add,
    functionSelectors: getSelectors(facet),
  }));

  // Creating a function call
  // This call gets executed during deployment and can also be executed in upgrades
  // It is executed with delegatecall on the DiamondInit address.
  let functionCall = DiamondInit.interface.encodeFunctionData('init');

  // Setting arguments that will be used in the diamond constructor
  const diamondArgs: DiamondArgsStruct = {
    owner: signer.address,
    pauser,
    init: DiamondInit.address,
    initCalldata: functionCall,
  };

  // deploy Diamond
  const Diamond = Diamond__factory.connect(
    await deployCreate3(
      deployer.address,
      DEPLOYMENT_SALTS.Diamond,
      new Diamond__factory(signer),
      [facetCuts, diamondArgs],
      'Diamond'
    ),
    signer
  );
  debug && console.log('CCMP Gateway Diamond deployed:', Diamond.address);

  return {
    contracts: {
      CCMPConfigurationFacet,
      CCMPReceiverMessageFacet,
      CCMPSendMessageFacet,
      DiamondCutFacet,
      DiamondLoupeFacet,
      DiamondInit,
      Diamond,
    },
    constructorArgs: {
      CCMPConfigurationFacet: [],
      CCMPReceiveMessageFacet: [],
      CCMPSendMessageFacet: [],
      DiamondCutFacet: [],
      DiamondLoupeFacet: [],
      DiamondInit: [],
      Diamond: [facetCuts, diamondArgs],
    },
  };
};

export const deploy = async (
  {
    owner,
    pauser,
    axelarGateway,
    wormholeGateway,
    wormholeDeploymentMode,
    abacusConnectionManager,
    abacusInterchainGasMaster,
  }: DeployParams,
  debug: boolean = false
): Promise<{ contracts: CCMPContracts; constructorArgs: CCMPContractsConstructorArgs }> => {
  const [signer] = await ethers.getSigners();
  const chainId = await signer.getChainId();
  debug && console.log(`Deployer: ${signer.address}`);

  if (chainId === 31337) {
    await signer.sendTransaction({
      to: new Wallet(process.env.METADEPLOYER_PRIVATE_KEY!, ethers.provider).address,
      value: ethers.utils.parseEther('1'),
    });
  }

  const deployerContract = await getDeployerInstance(debug);

  const { contracts: diamonds, constructorArgs } = await deployGateway(
    deployerContract,
    pauser,
    debug
  );
  const updatedConstructorArgs = { ...constructorArgs } as CCMPContractsConstructorArgs;

  await waitSec(5);

  updatedConstructorArgs.CCMPExecutor = [diamonds.Diamond.address, signer.address];
  const CCMPExecutor = CCMPExecutor__factory.connect(
    await deployCreate3(
      deployerContract.address,
      DEPLOYMENT_SALTS.CCMPExecutor,
      new CCMPExecutor__factory(signer),
      updatedConstructorArgs.CCMPExecutor,
      'CCMPExecutor'
    ),
    signer
  );
  debug && console.log(`CCMPExecutor: ${CCMPExecutor.address}`);

  let AxelarAdaptor;
  updatedConstructorArgs.AxelarAdaptor = [];
  if (axelarGateway) {
    debug && console.log(`Deploying AxelarAdaptor...`);
    updatedConstructorArgs.AxelarAdaptor = [
      axelarGateway,
      diamonds.Diamond.address,
      signer.address,
      pauser,
    ];
    AxelarAdaptor = AxelarAdaptor__factory.connect(
      await deployCreate3(
        deployerContract.address,
        DEPLOYMENT_SALTS.AxelarAdaptor,
        new AxelarAdaptor__factory(signer),
        updatedConstructorArgs.AxelarAdaptor,
        'AxelarAdaptor'
      ),
      signer
    );

    debug && console.log(`AxelarAdaptor: ${AxelarAdaptor.address}`);
    await waitSec(5);
  }

  let WormholeAdaptor;
  updatedConstructorArgs.WormholeAdaptor = [];
  if (wormholeGateway && wormholeDeploymentMode) {
    debug && console.log(`Deploying WormholeAdaptor...`);
    updatedConstructorArgs.WormholeAdaptor = [
      wormholeGateway,
      diamonds.Diamond.address,
      signer.address,
      pauser,
      wormholeDeploymentMode,
    ];
    WormholeAdaptor = WormholeAdaptor__factory.connect(
      await deployCreate3(
        deployerContract.address,
        DEPLOYMENT_SALTS.WormholeAdaptor,
        new WormholeAdaptor__factory(signer),
        updatedConstructorArgs.WormholeAdaptor,
        'WormholeAdaptor'
      ),
      signer
    );
    debug && console.log(`WormholeAdaptor: ${WormholeAdaptor.address}`);
    await waitSec(5);
  }

  let HyperlaneAdaptor;
  if (abacusConnectionManager && abacusInterchainGasMaster) {
    debug && console.log(`Deploying AbacusAdapter...`);
    updatedConstructorArgs.HyperlaneAdaptor = [
      diamonds.Diamond.address,
      signer.address,
      pauser,
      abacusConnectionManager,
      abacusInterchainGasMaster,
    ];
    HyperlaneAdaptor = HyperlaneAdaptor__factory.connect(
      await deployCreate3(
        deployerContract.address,
        DEPLOYMENT_SALTS.HyperlaneAdaptor,
        new HyperlaneAdaptor__factory(signer),
        updatedConstructorArgs.HyperlaneAdaptor,
        'HyperlaneAdaptor'
      ),
      signer
    );
    debug && console.log(`AbacusAdapter: ${HyperlaneAdaptor.address}`);
    await waitSec(5);
  }

  const contracts: CCMPContracts = {
    CCMPExecutor,
    AxelarAdaptor,
    WormholeAdaptor,
    HyperlaneAdaptor: HyperlaneAdaptor,
    ...diamonds,
  };

  await configure(contracts, debug);

  await transferOwnership(contracts.CCMPExecutor, owner, debug);
  await transferOwnership(
    ICCMPGateway__factory.connect(contracts.Diamond.address, signer),
    owner,
    debug
  );
  if (AxelarAdaptor) {
    await transferOwnership(AxelarAdaptor, owner, debug);
  }
  if (WormholeAdaptor) {
    await transferOwnership(WormholeAdaptor, owner, debug);
  }
  if (HyperlaneAdaptor) {
    await transferOwnership(HyperlaneAdaptor, owner, debug);
  }

  return { contracts, constructorArgs: updatedConstructorArgs };
};

export const deploySampleContract = async (
  ccmpExecutor: string,
  hyphenLiquidityPool: string,
  debug: boolean = false
): Promise<SampleContract> => {
  debug && console.log(`Deploying SampleContract...`);
  const [signer] = await ethers.getSigners();
  const SampleContract = (await new SampleContract__factory(signer).deploy(
    ccmpExecutor,
    hyphenLiquidityPool
  )) as SampleContract;
  debug && console.log(`SampleContract: ${SampleContract.address}`);
  return SampleContract;
};

const transferOwnership = async (contract: Contract, newOwner: string, debug: boolean = false) => {
  debug && console.log(`Transferring ownership of ${contract.address} to ${newOwner}...`);
  await contract.transferOwnership(newOwner);
  debug && console.log(`Ownership transferred.`);
};

const configure = async (contracts: CCMPContracts, debug: boolean = false) => {
  debug && console.log(`Configuring CCMPGateway...`);
  const [deployer] = await ethers.getSigners();

  if (!contracts.Diamond || !contracts.CCMPExecutor) {
    return;
  }

  const CCMPGateway = ICCMPGateway__factory.connect(contracts.Diamond.address, deployer);
  if (contracts.AxelarAdaptor) {
    await (
      await CCMPGateway.setRouterAdaptor(AxelarAdaptorKey, contracts.AxelarAdaptor.address)
    ).wait();
    await waitSec(5);
  }
  if (contracts.WormholeAdaptor) {
    await (
      await CCMPGateway.setRouterAdaptor(WormholeAdaptorKey, contracts.WormholeAdaptor.address)
    ).wait();
    await waitSec(5);
  }
  if (contracts.HyperlaneAdaptor) {
    await (
      await CCMPGateway.setRouterAdaptor(AbacusAdaptorKey, contracts.HyperlaneAdaptor.address)
    ).wait();
    await waitSec(5);
  }
  await CCMPGateway.setCCMPExecutor(contracts.CCMPExecutor.address);
  await waitSec(5);
  debug && console.log(`CCMPGateway configured.`);
};
