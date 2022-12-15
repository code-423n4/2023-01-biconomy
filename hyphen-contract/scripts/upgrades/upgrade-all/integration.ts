import { ethers } from "hardhat";
import { upgradeAllContracts, getContractAddressesByChain } from "./upgrade-all";

(async () => {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Upgrading contracts on chain ${chainId}`);
  const contracts = await getContractAddressesByChain(process.env.INTEGRATION_API_URL as string, chainId);
  console.log(`Contracts: ${JSON.stringify(contracts, null, 2)}`);
  await upgradeAllContracts(contracts);
})();
