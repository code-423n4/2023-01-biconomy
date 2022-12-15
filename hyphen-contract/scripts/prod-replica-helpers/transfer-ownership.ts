import { getContractAddressesByChain } from "../upgrades/upgrade-all/upgrade-all";
import { ethers } from "hardhat";
import {
  ExecutorManager__factory,
  HyphenLiquidityFarmingV2__factory,
  HyphenLiquidityFarming__factory,
  LiquidityPool__factory,
  LiquidityProviders__factory,
  LPToken__factory,
  TokenManager__factory,
  WhitelistPeriodManager__factory,
} from "../../typechain";
import { getProxyAdmin } from "../deploy/deploy-utils";
import proxyAdminAbi from "./abi/ProxyAdmin";
import { IContractAddresses } from "../types";
import { impersonateAndExecute, sendTransaction, setNativeBalance } from "./utils";

const transferOwnership = async (contracts: IContractAddresses, newOwner: string) => {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  const oldOwner = await ExecutorManager__factory.connect(contracts.executorManager, ethers.provider).owner();
  if (!oldOwner) {
    throw new Error("Error while fetching old owner");
  }
  console.log(`Current Contract Owner on chain ${chainId}: ${oldOwner}`);

  await impersonateAndExecute(oldOwner, async (signer) => {
    console.log(`Transferring Ownership For Executor Manager on chain ${chainId}...`);
    const executorManager = ExecutorManager__factory.connect(contracts.executorManager, signer);
    await sendTransaction(executorManager.transferOwnership(newOwner), "Updating Executor Manager Owner");

    console.log(`Transferring Ownership For LiquidityPool on chain ${chainId}...`);
    const liquidityPool = LiquidityPool__factory.connect(contracts.liquidityPool, signer);
    await sendTransaction(liquidityPool.transferOwnership(newOwner), "Updating Liquidity Pool Owner");

    console.log(`Transferring Ownership For LiquidityProviderson chain ${chainId}...`);
    const liquidityProviders = LiquidityProviders__factory.connect(contracts.liquidityProviders, signer);
    await sendTransaction(liquidityProviders.transferOwnership(newOwner), "Updating LiquidityProviders Owner");

    console.log(`Transferring Ownership For LpToken on chain ${chainId}...`);
    const lpToken = LPToken__factory.connect(contracts.lpToken, signer);
    await sendTransaction(lpToken.transferOwnership(newOwner), "Updating LpToken Owner");

    console.log(`Transferring Ownership For TokenManager on chain ${chainId}...`);
    const tokenManager = TokenManager__factory.connect(contracts.tokenManager, signer);
    await sendTransaction(tokenManager.transferOwnership(newOwner), "Updating TokenManager Owner");

    console.log(`Transferring Ownership For WhiteListPeriodManager on chain ${chainId}...`);
    const wlpm = WhitelistPeriodManager__factory.connect(contracts.whitelistPeriodManager, signer);
    await sendTransaction(wlpm.transferOwnership(newOwner), "Updating WhitelistPeriod Manager Owner");

    if (contracts.liquidityFarmingV1) {
      console.log(`Transferring Ownership For LiquidityFarmingV1 Manager on chain ${chainId}...`);
      const liquidityFarmingV1 = HyphenLiquidityFarming__factory.connect(contracts.liquidityFarmingV1, signer);
      await sendTransaction(liquidityFarmingV1.transferOwnership(newOwner), "Updating LiquidityFarmingV1 Owner");
    }

    if (contracts.liquidityFarmingV2) {
      console.log(`Transferring Ownership For LiquidityFarmingV2 on chain ${chainId}...`);
      const liquidityFarmingV2 = HyphenLiquidityFarmingV2__factory.connect(contracts.liquidityFarmingV2, signer);
      await sendTransaction(liquidityFarmingV2.transferOwnership(newOwner), "Updating LiquidityFarmingV2 Owner");
    }
  });

  const proxyAdminAddress = await getProxyAdmin(contracts.liquidityPool);
  console.log(`Transferring Ownership For ProxyAdmin ${proxyAdminAddress} on chain ${chainId}...`);
  let proxyAdmin = new ethers.Contract(proxyAdminAddress, proxyAdminAbi, ethers.provider);
  const currentProxyAdminOwner = await proxyAdmin.owner();
  console.log(`Current ProxyAdmin Owner on chain ${chainId}: ${currentProxyAdminOwner}`);

  await impersonateAndExecute(currentProxyAdminOwner, async (signer) => {
    proxyAdmin = new ethers.Contract(proxyAdminAddress, proxyAdminAbi, signer);
    await sendTransaction(proxyAdmin.transferOwnership(newOwner), "Updating ProxyAdmin Owner");
  });
};

(async () => {
  if (!process.env.NEW_OWNER_ADDRESS) {
    throw new Error("NEW_OWNER_ADDRESS is not set");
  }
  const NEW_OWNER_ADDRESS: string = process.env.NEW_OWNER_ADDRESS;
  console.log(`New Owner Address: ${NEW_OWNER_ADDRESS}`);
  await setNativeBalance(NEW_OWNER_ADDRESS, ethers.utils.parseEther("100"));

  const chainId = (await ethers.provider.getNetwork()).chainId;
  const contracts = await getContractAddressesByChain(process.env.PROD_API_URL as string, chainId);
  console.log(`Contracts on chain ${chainId}: ${JSON.stringify(contracts, null, 2)}`);

  await transferOwnership(contracts, NEW_OWNER_ADDRESS);
})();
