import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x64CD353384109423a966dCd3Aa30D884C9b2E057",
    bicoOwner: "0xd76b82204be75ab9610b04cf27c4f4a34291d5e6",
    pauser: "0xF1033Eb90b969666A82a7485803606fE7ef97f81",
    tokens: [
      // USDC
      {
        tokenAddress: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
        minCap: parseUnits("10", 6),
        maxCap: parseUnits("221813", 6),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("100", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 137,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.1", 8),
        maxFee: ethers.utils.parseUnits("2.5", 8),
        transferOverhead: 89491,
        maxWalletLiquidityCap: parseUnits("10000", 6),
        maxLiquidityCap: parseUnits("503108", 6),
        svgHelper: await ethers.getContractFactory("AvalancheUSDC"),
        decimals: 6,
        rewardTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        rewardRatePerSecond: parseUnits("0.000034814379098636", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // WETH
      {
        tokenAddress: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
        minCap: parseUnits("0.0039", 18),
        maxCap: parseUnits("143", 18),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("0.02", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100", 18),
          },
          {
            chainId: 137,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100", 18),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.1", 8),
        maxFee: ethers.utils.parseUnits("2.5", 8),
        transferOverhead: 72945,
        maxWalletLiquidityCap: parseUnits("3.86", 18),
        maxLiquidityCap: parseUnits("171", 18),
        svgHelper: await ethers.getContractFactory("AvalancheETH"),
        decimals: 18,
        rewardTokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        rewardRatePerSecond: parseUnits("0.000030666706752555", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
