import { Contract, ContractFactory } from 'ethers';
import { ethers } from 'hardhat';
import { Deployer__factory } from '../../typechain-types';

export const FacetCutAction = { Add: 0, Replace: 1, Remove: 2 };

// get function selectors from ABI
export const getSelectors = (contract: Contract) => {
  const signatures = Object.keys(contract.interface.functions);
  const selectors = signatures
    .filter((v) => v !== 'init(bytes)')
    .map((v) => contract.interface.getSighash(v));
  return selectors;
};

export const deployCreate3 = async (
  deployerContractAddress: string,
  salt: string,
  contractFactory: ContractFactory,
  constructorArguments: any[],
  name: string,
  options?: {
    gasLimit?: number;
    gasPrice?: number;
    nonce?: number;
  },
  debug: boolean = false
): Promise<string> => {
  const [signer] = await ethers.getSigners();
  if (!deployerContractAddress) {
    throw new Error('DEPLOYER_ADDRESS not set');
  }
  const { data: creationCode } = contractFactory.getDeployTransaction(...constructorArguments);
  if (!creationCode) {
    throw new Error(`Failed to get creation code for ${name}`);
  }

  // Deploy the contract
  debug &&
    console.log(
      `Deploying ${name} with deployer ${deployerContractAddress} using salt keccak256("${salt}")...`
    );
  const deploymentSalt = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(salt));
  const Deployer = Deployer__factory.connect(deployerContractAddress, signer);
  const { wait, hash } = await Deployer.deploy(deploymentSalt, creationCode, options || {});
  debug && console.log(`Submitted transaction ${hash} for ${name} deployment`);
  const { status, logs, blockNumber } = await wait();
  if (status !== 1) {
    throw new Error(`Transaction ${hash} for deploying ${name} failed`);
  }
  debug &&
    console.log(`Transaction ${hash} for deploying ${name} included in block ${blockNumber}`);

  // Get the address of the deployed contract
  const topicHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('ContractDeployed(address)'));
  const contractDeployedLog = logs.find((log) => log.topics[0] === topicHash);

  if (!contractDeployedLog) {
    throw new Error(
      `Transaction ${hash} for deploying ${name} did not emit ContractDeployed event`
    );
  }
  const contractAddress = Deployer.interface.parseLog(contractDeployedLog).args.contractAddress;
  debug && console.log(`Deployed ${name} at ${contractAddress}`);
  return contractAddress;
};
