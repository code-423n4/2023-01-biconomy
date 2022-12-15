import { run, ethers, upgrades } from "hardhat";
import HardHatConfig from "../../hardhat.config";
import {
  LiquidityPool,
  LPToken,
  WhitelistPeriodManager,
  LiquidityProviders,
  TokenManager,
  SvgHelperBase,
  HyphenLiquidityFarmingV2,
  ERC20Token,
  // eslint-disable-next-line node/no-missing-import
} from "../../typechain";
import type { BigNumberish } from "ethers";
import { providers } from "ethers";
import type { IContracts, IAddTokenParameters, IDeployConfig } from "../types";
import { HttpNetworkUserConfig } from "hardhat/types";

const LPTokenName = "Hyphen Liquidity Token";
const LPTokenSymbol = "Hyphen-LP";

const wait = (time: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const deploy = async (deployConfig: IDeployConfig) => {
  const contracts = await deployCoreContracts(deployConfig.trustedForwarder, deployConfig.pauser);

  for (const token of deployConfig.tokens) {
    await addTokenSupport(contracts, token);
    contracts.svgHelperMap[token.tokenAddress] = await deploySvgHelper(
      contracts.lpToken,
      token,
      deployConfig.bicoOwner
    );
  }

  console.log(
    "Deployed contracts:",
    JSON.stringify(
      {
        ...Object.fromEntries(
          Object.entries(contracts)
            .filter(([name]) => name !== "svgHelperMap")
            .map(([name, contract]) => [name, contract.address])
        ),
        svgHelpers: Object.fromEntries(
          Object.entries(contracts.svgHelperMap).map(([name, contract]) => [name, contract.address])
        ),
      },
      null,
      2
    )
  );

  await configure(contracts, deployConfig.bicoOwner);
  await verify(contracts, deployConfig);
  await transferOwnership(contracts, deployConfig.bicoOwner);
};

async function deployCoreContracts(trustedForwarder: string, pauser: string): Promise<IContracts> {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  const ExecutorManager = await ethers.getContractFactory("ExecutorManager");
  console.log("Deploying ExecutorManager...");
  const executorManager = await ExecutorManager.deploy({});
  await executorManager.deployed();
  console.log("ExecutorManager deployed to:", executorManager.address);
  await wait(5000);

  console.log("Deploying TokenManager...");
  const tokenManager = (await upgrades.deployProxy(await ethers.getContractFactory("TokenManager"), [
    trustedForwarder,
    pauser,
  ])) as TokenManager;
  await tokenManager.deployed();
  console.log("TokenManager deployed to:", tokenManager.address);

  await wait(5000);

  const LPToken = await ethers.getContractFactory("LPToken");
  console.log("Deploying LPToken...");
  const lpToken = (await upgrades.deployProxy(LPToken, [
    LPTokenName,
    LPTokenSymbol,
    trustedForwarder,
    pauser,
  ])) as LPToken;
  await lpToken.deployed();
  console.log("LPToken Proxy deployed to:", lpToken.address);

  await wait(5000);

  const LiquidityProviders = await ethers.getContractFactory("LiquidityProviders");
  console.log("Deploying LiquidityProviders...");
  const liquidityProviders = (await upgrades.deployProxy(LiquidityProviders, [
    trustedForwarder,
    lpToken.address,
    tokenManager.address,
    pauser,
  ])) as LiquidityProviders;
  await liquidityProviders.deployed();
  console.log("LiquidityProviders Proxy deployed to:", liquidityProviders.address);

  const feeLibFactory = await ethers.getContractFactory("Fee");
  const Fee = await feeLibFactory.deploy();
  await Fee.deployed();

  await wait(5000);
  const LiquidityPool = await ethers.getContractFactory("LiquidityPool", {
    libraries: {
      Fee: Fee.address,
    },
  });
  console.log("Deploying LiquidityPool...");
  const liquidityPool = (await upgrades.deployProxy(LiquidityPool, [
    executorManager.address,
    pauser,
    trustedForwarder,
    tokenManager.address,
    liquidityProviders.address,
  ])) as LiquidityPool;
  await liquidityPool.deployed();
  console.log("LiquidityPool Proxy deployed to:", liquidityPool.address);

  await wait(5000);
  const WhitelistPeriodManager = await ethers.getContractFactory("WhitelistPeriodManager");
  console.log("Deploying WhitelistPeriodManager...");
  const whitelistPeriodManager = (await upgrades.deployProxy(WhitelistPeriodManager, [
    trustedForwarder,
    liquidityProviders.address,
    tokenManager.address,
    lpToken.address,
    pauser,
  ])) as WhitelistPeriodManager;
  await whitelistPeriodManager.deployed();
  console.log("WhitelistPeriodManager Proxy deployed to:", whitelistPeriodManager.address);

  await wait(5000);
  const LiquidityFarmingFactory = await ethers.getContractFactory("HyphenLiquidityFarmingV2");
  console.log("Deploying LiquidityFarmingFactory...");
  const liquidityFarming = (await upgrades.deployProxy(LiquidityFarmingFactory, [
    trustedForwarder,
    pauser,
    liquidityProviders.address,
    lpToken.address,
  ])) as HyphenLiquidityFarmingV2;
  await liquidityFarming.deployed();
  console.log("LiquidityFarmingFactory Proxy deployed to:", liquidityFarming.address);
  await wait(5000);
  await (await whitelistPeriodManager.setIsExcludedAddressStatus([liquidityFarming.address], [true])).wait();

  return {
    executorManager,
    tokenManager,
    lpToken,
    liquidityProviders,
    liquidityPool,
    whitelistPeriodManager,
    liquidityFarming,
    svgHelperMap: {},
  };
}

const deploySvgHelper = async (
  lpToken: LPToken,
  token: IAddTokenParameters,
  bicoOwner: string
): Promise<SvgHelperBase> => {
  console.log(`Deploying SVG helper for token ${token.tokenAddress}...`);
  const svgHelper = (await token.svgHelper.deploy([token.decimals])) as SvgHelperBase;
  await svgHelper.deployed();
  await (await lpToken.setSvgHelper(token.tokenAddress, svgHelper.address)).wait();
  await (await svgHelper.transferOwnership(bicoOwner)).wait();
  console.log("SvgHelper deployed to:", svgHelper.address);
  return svgHelper;
};

const configure = async (contracts: IContracts, bicoOwner: string) => {
  await wait(5000);
  await (await contracts.liquidityProviders.setTokenManager(contracts.tokenManager.address)).wait();
  await wait(5000);
  await (await contracts.liquidityProviders.setLiquidityPool(contracts.liquidityPool.address)).wait();
  await wait(5000);
  await (await contracts.liquidityProviders.setWhiteListPeriodManager(contracts.whitelistPeriodManager.address)).wait();

  console.log("Configured LiquidityProviders");
  await wait(5000);
  await (await contracts.lpToken.setLiquidityProviders(contracts.liquidityProviders.address)).wait();
  await wait(5000);
  await (await contracts.lpToken.setWhiteListPeriodManager(contracts.whitelistPeriodManager.address)).wait();
  await wait(5000);
  console.log("Configured LPToken");
};

const addTokenSupport = async (contracts: IContracts, token: IAddTokenParameters) => {
  // Add support for token
  console.log(`Adding token support for ${token.tokenAddress}...`);
  await (
    await contracts.tokenManager.addSupportedToken(
      token.tokenAddress,
      token.minCap,
      token.maxCap,
      token.equilibriumFee,
      token.maxFee,
      token.transferOverhead
    )
  ).wait();

  let chainIdArray = [];
  let minMaxArray = [];
  for (let index = 0; index < token.depositConfigs.length; index++) {
    let entry = token.depositConfigs[index];
    chainIdArray.push(entry.chainId);
    minMaxArray.push({ min: entry.minCap, max: entry.maxCap });
  }

  console.log(`Setting Deposit Config for ${token.tokenAddress}...`);
  await (
    await contracts.tokenManager.setDepositConfig(
      chainIdArray,
      new Array(chainIdArray.length).fill(token.tokenAddress),
      minMaxArray
    )
  ).wait();

  console.log(`Setting Excess State Transfer Fee % for ${token.tokenAddress}...`);
  await (await contracts.tokenManager.changeExcessStateFee(token.tokenAddress, token.excessStateTransferFeePer)).wait();

  console.log(`Setting Whitelist Period Fee Config for ${token.tokenAddress}...`);
  await (
    await contracts.whitelistPeriodManager.setCap(
      token.tokenAddress,
      token.maxLiquidityCap,
      token.maxWalletLiquidityCap
    )
  ).wait();

  console.log(`Initializing reward pool for ${token.tokenAddress}...`);
  await (
    await contracts.liquidityFarming.setRewardPerSecond(
      token.tokenAddress,
      token.rewardTokenAddress,
      token.rewardRatePerSecond
    )
  ).wait();

  console.log("Added token support for", token.tokenAddress);
};

const deployToken = async (
  name: string,
  symbol: string,
  decimals: number,
  initialMintAddresses: string[],
  initialMintAmountPerAddress: BigNumberish
) => {
  const [signer] = await ethers.getSigners();
  const erc20factory = await ethers.getContractFactory("ERC20Token", signer);
  const token = (await upgrades.deployProxy(erc20factory, [name, symbol, decimals])) as ERC20Token;
  await token.deployed();
  console.log(`Deployed token ${name} at ${token.address}`);

  for (const address of initialMintAddresses) {
    await (await token.mint(address, initialMintAmountPerAddress)).wait();
    console.log(`Minted ${initialMintAmountPerAddress} ${name} to ${address}`);
  }

  await verifyImplementation(token.address);

  return token;
};

const getImplementationAddress = async (
  proxyAddress: string,
  provider: providers.JsonRpcProvider = ethers.provider
) => {
  return ethers.utils.hexlify(
    ethers.BigNumber.from(
      await provider.send("eth_getStorageAt", [
        proxyAddress,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
        "latest",
      ])
    )
  );
};

const getProxyAdmin = async (proxyAddress: string) => {
  return ethers.utils.hexlify(
    ethers.BigNumber.from(
      await ethers.provider.send("eth_getStorageAt", [
        proxyAddress,
        "0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103",
        "latest",
      ])
    )
  );
};

const verifyContract = async (address: string, constructorArguments: any[]) => {
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
  } catch (e) {
    console.log(`Failed to verify Contract ${address} `, e);
  }
};

const verifyImplementation = async (address: string) => {
  try {
    await run("verify:verify", {
      address: await getImplementationAddress(address),
    });
  } catch (e) {
    console.log(`Failed to verify Contract ${address} `);
  }
};

const verify = async (
  contracts: IContracts,
  config: { trustedForwarder: string; pauser: string; tokens: IAddTokenParameters[] }
) => {
  console.log("Verifying Contracts...");
  for (const token of config.tokens) {
    await verifyContract(contracts.svgHelperMap[token.tokenAddress].address, [token.decimals]);
  }
  await verifyContract(contracts.executorManager.address, []);
  await verifyImplementation(contracts.tokenManager.address);
  await verifyImplementation(contracts.lpToken.address);
  await verifyImplementation(contracts.liquidityProviders.address);
  await verifyImplementation(contracts.liquidityPool.address);
  await verifyImplementation(contracts.whitelistPeriodManager.address);
  await verifyImplementation(contracts.liquidityFarming.address);
};

const transferOwnership = async (contracts: IContracts, bicoOwner: string) => {
  await (await contracts.tokenManager.transferOwnership(bicoOwner)).wait();
  await wait(5000);
  await (await contracts.lpToken.transferOwnership(bicoOwner)).wait();
  await wait(5000);
  await (await contracts.executorManager.transferOwnership(bicoOwner)).wait();
  await wait(5000);
  await (await contracts.liquidityProviders.transferOwnership(bicoOwner)).wait();
  await wait(5000);
  await (await contracts.liquidityPool.transferOwnership(bicoOwner)).wait();
  await wait(5000);
  await (await contracts.whitelistPeriodManager.transferOwnership(bicoOwner)).wait();
  console.log(`Transferred Ownership to ${bicoOwner}`);
};

const getProviderMapByChain = async (): Promise<Record<number, providers.JsonRpcProvider>> =>
  Object.fromEntries(
    await Promise.all(
      Object.entries(HardHatConfig.networks!)
        .map(([, network]) => (network as HttpNetworkUserConfig).url)
        .filter((url) => url)
        .map(async (url) => {
          try {
            const provider = new providers.JsonRpcProvider(url);
            const chainId = (await provider.getNetwork()).chainId;
            return [chainId, provider];
          } catch (e) {
            console.log(`Failed to connect to ${url}`);
            return [];
          }
        })
    )
  );

export {
  deployCoreContracts as deployContracts,
  configure,
  addTokenSupport,
  verify,
  deploy,
  verifyContract,
  verifyImplementation,
  deployToken,
  getProxyAdmin,
  getImplementationAddress,
  getProviderMapByChain,
};
