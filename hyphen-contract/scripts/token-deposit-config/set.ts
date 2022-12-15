import { BigNumberish } from "ethers";
import { ethers } from "hardhat";
import { TokenManager__factory } from "../../typechain";

interface ITokenAddConfiguration {
  chainId: number;
  minCap: BigNumberish;
  maxCap: BigNumberish;
  tokenAddress: string;
}

const setTokenDepositConfiguration = async (tokenManagerAddress: string, configs: ITokenAddConfiguration[]) => {
  const [signer] = await ethers.getSigners();
  console.log(`signer: ${signer.address}`);

  const tokenManager = TokenManager__factory.connect(tokenManagerAddress, signer);

  const toChainIds = configs.map((config) => config.chainId);
  const tokenAddresses = configs.map((config) => config.tokenAddress);
  const tokenConfigs = configs.map((config) => ({ min: config.minCap, max: config.maxCap }));

  console.log(`Adding tokens to TokenManager on chainId: ${(await ethers.provider.getNetwork()).chainId}`);
  const { wait, hash } = await tokenManager.setDepositConfig(toChainIds, tokenAddresses, tokenConfigs);
  console.log(`Waiting for transaction ${hash} to be confirmed...`);
  await wait();
  console.log(`Transaction ${hash} confirmed!`);
};

export { setTokenDepositConfiguration };
export type { ITokenAddConfiguration };
