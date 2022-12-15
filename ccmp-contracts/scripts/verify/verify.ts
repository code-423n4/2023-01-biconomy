import { run, ethers } from "hardhat";
import { providers } from "ethers";
import type { CCMPContracts } from "../deploy/deploy";

export const getImplementationAddress = async (
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

export const verifyContract = async (address: string, constructorArguments: any[]) => {
  try {
    await run("verify:verify", {
      address,
      constructorArguments,
    });
  } catch (e) {
    console.log(`Failed to verify Contract ${address} `, e);
  }
};

export const verifyImplementation = async (proxyAddress: string) => {
  const implementationAddress = await getImplementationAddress(proxyAddress);
  console.log(`Verifying implementation at ${implementationAddress}`);
  try {
    await run("verify:verify", {
      address: implementationAddress,
    });
  } catch (e) {
    console.log(`Failed to verify Contract ${implementationAddress} `, e);
  }
};
