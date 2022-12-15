import { run, ethers, upgrades } from "hardhat";
import { TokenManager } from "../../typechain";
import type { BigNumberish, ContractFactory } from "ethers";

interface IAddTokenParameters {
  tokenAddress: string;
  minCap: BigNumberish;
  maxCap: BigNumberish;
  depositConfigs: { chainId: number; minCap: BigNumberish; maxCap: BigNumberish }[];
  equilibriumFee: BigNumberish;
  maxFee: BigNumberish;
  transferOverhead: BigNumberish;
  excessStateTransferFeePer: BigNumberish;
}

interface IContracts {
  tokenManager: TokenManager;
}

interface IDeployConfig {
  trustedForwarder: string;
  bicoOwner: string;
  pauser: string;
  tokens: IAddTokenParameters[];
}

const wait = (time: number): Promise<void> => {
  return new Promise((resolve) => {
    setTimeout(resolve, time);
  });
};

const deploy = async (deployConfig: IDeployConfig) => {
  const contracts = await deployCoreContracts(deployConfig.trustedForwarder, deployConfig.pauser);

  for (const token of deployConfig.tokens) {
    await addTokenSupport(contracts, token);
  }

  // await configure(contracts, deployConfig.bicoOwner);
  await verify(contracts, deployConfig);
};

async function deployCoreContracts(trustedForwarder: string, pauser: string): Promise<IContracts> {
  const [deployer] = await ethers.getSigners();

  console.log("Deployer:", deployer.address);

  console.log("Deploying TokenManager...");
  const tokenManager = (await upgrades.deployProxy(await ethers.getContractFactory("TokenManager"), [
    trustedForwarder,
    pauser,
  ])) as TokenManager;
  await tokenManager.deployed();
  console.log("TokenManager deployed to:", tokenManager.address);
  await wait(5000);

  return { tokenManager };
}

const configure = async (contracts: IContracts, bicoOwner: string) => {
  await (await contracts.tokenManager.transferOwnership(bicoOwner)).wait();
  await wait(5000);

  console.log(`Transferred Ownership to ${bicoOwner}`);
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

  console.log("Added token support for", token.tokenAddress);
};

const getImplementationAddress = async (proxyAddress: string) => {
  return ethers.utils.hexlify(
    ethers.BigNumber.from(
      await ethers.provider.send("eth_getStorageAt", [
        proxyAddress,
        "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc",
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
    console.log(`Failed to verify Contract ${address} `, e);
  }
};

const verify = async (
  contracts: IContracts,
  config: { trustedForwarder: string; pauser: string; tokens: IAddTokenParameters[] }
) => {
  console.log("Verifying Contracts...");

  await verifyImplementation(contracts.tokenManager.address);
};

export {
  deployCoreContracts as deployContracts,
  configure,
  addTokenSupport,
  verify,
  deploy,
  verifyContract,
  verifyImplementation,
  IDeployConfig,
};
