import { getContractAddresses, getContractAddressesByChain } from "../upgrades/upgrade-all/upgrade-all";
import { ethers, upgrades } from "hardhat";
import { IContractAddresses } from "../types";

const forceImportForUpgrade = async (contracts: IContractAddresses) => {
  await Promise.all([
    contracts.liquidityPool &&
      upgrades.forceImport(
        contracts.liquidityPool,
        await ethers.getContractFactory("LiquidityPool", {
          libraries: {
            Fee: contracts.liquidityPool,
          },
        }),
        {
          kind: "transparent",
        }
      ),
    contracts.liquidityProviders &&
      upgrades.forceImport(contracts.liquidityProviders, await ethers.getContractFactory("LiquidityProviders"), {
        kind: "transparent",
      }),
    contracts.lpToken &&
      upgrades.forceImport(contracts.lpToken, await ethers.getContractFactory("LPToken"), {
        kind: "transparent",
      }),
    contracts.tokenManager &&
      upgrades.forceImport(contracts.tokenManager, await ethers.getContractFactory("TokenManager"), {
        kind: "transparent",
      }),
    contracts.whitelistPeriodManager &&
      upgrades.forceImport(
        contracts.whitelistPeriodManager,
        await ethers.getContractFactory("WhitelistPeriodManager"),
        {
          kind: "transparent",
        }
      ),
    contracts.liquidityFarmingV1 &&
      upgrades.forceImport(contracts.liquidityFarmingV1, await ethers.getContractFactory("HyphenLiquidityFarming"), {
        kind: "transparent",
      }),
    contracts.liquidityFarmingV2 &&
      upgrades.forceImport(contracts.liquidityFarmingV2, await ethers.getContractFactory("HyphenLiquidityFarmingV2"), {
        kind: "transparent",
      }),
  ]);
};

(async () => {
  const chainId = (await ethers.provider.getNetwork()).chainId;
  // const contracts = await getContractAddressesByChain(process.env.PROD_API_URL as string, chainId);
  const contracts = {
    liquidityPool: "0xb831F0848A055b146a0b13D54cfFa6C1FE201b83",
  };
  console.log(`Forcing Import for Contracts on chain ${chainId}: ${JSON.stringify(contracts, null, 2)}`);
  await forceImportForUpgrade(contracts);
})();
