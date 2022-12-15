import { ethers } from "hardhat";
import axios from "axios";
import {
  upgradeLPToken,
  upgradeLiquidityFarming,
  upgradeLiquidityFarmingV2,
  upgradeLiquidityPool,
  upgradeLiquidityProviders,
  upgradeTokenManager,
  upgradeWhiteListPeriodManager,
} from "../upgrade";
import { verifyImplementation } from "../../deploy/deploy-utils";

import type { IContractAddresses } from "../../types";
import { providers } from "ethers";

export const getProviderMapByChain = async (baseUrl: string): Promise<Record<number, providers.JsonRpcProvider>> => {
  const response = (await axios.get(`${baseUrl}/api/v1/configuration/networks`)).data.message as any[];
  return Object.fromEntries(response.map(({ chainId, rpc }) => [chainId, new ethers.providers.JsonRpcProvider(rpc)]));
};

export const getContractAddresses = async (baseUrl: string): Promise<Record<number, IContractAddresses>> => {
  const response = (await axios.get(`${baseUrl}/api/v1/configuration/networks`)).data.message as any[];
  return Object.fromEntries(response.map(({ chainId, contracts }) => [chainId, contracts.hyphen]));
};

export const getContractAddressesByChain = async (baseUrl: string, chainId: number): Promise<IContractAddresses> => {
  const response = (await axios.get(`${baseUrl}/api/v1/configuration/networks`)).data.message as any[];
  const chain = response.filter((c) => c.chainId === chainId)[0];
  return chain.contracts.hyphen;
};

export const getSupportedTokenAddresses = async (baseUrl: string, chainId: number): Promise<string[]> => {
  const response = (await axios.get(`${baseUrl}/api/v1/configuration/tokens`)).data.message as any[];
  const supportedTokenAddresses = response
    .map((token) => token[chainId])
    .filter((x) => x)
    .map((x) => x.address);
  return supportedTokenAddresses;
};

export const upgradeAllContracts = async (addresses: IContractAddresses) => {
  await upgradeAndVerify(addresses.lpToken, upgradeLPToken);
  await upgradeAndVerify(addresses.liquidityPool, upgradeLiquidityPool);
  await upgradeAndVerify(addresses.liquidityProviders, upgradeLiquidityProviders);
  await upgradeAndVerify(addresses.tokenManager, upgradeTokenManager);
  await upgradeAndVerify(addresses.whitelistPeriodManager, upgradeWhiteListPeriodManager);
  if (addresses.liquidityFarmingV1) {
    await upgradeAndVerify(addresses.liquidityFarmingV1, upgradeLiquidityFarming);
  }
  if (addresses.liquidityFarmingV2) {
    await upgradeAndVerify(addresses.liquidityFarmingV2, upgradeLiquidityFarmingV2);
  }
};

const upgradeAndVerify = async (proxy: string, upgrader: (address: string) => Promise<void>) => {
  try {
    const [signer] = await ethers.getSigners();
    console.log("Proxy: ", proxy, " Deployer: ", signer.address);
    console.log("Upgrading Proxy...");
    await upgrader(proxy);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 5000);
    });
    await verifyImplementation(proxy);
  } catch (e) {
    console.error(`Error upgrading ${proxy}: ${e}`);
  }
};