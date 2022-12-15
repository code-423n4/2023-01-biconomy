import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x64CD353384109423a966dCd3Aa30D884C9b2E057",
    bicoOwner: "0xd76b82204be75ab9610b04cf27c4f4a34291d5e6",
    pauser: "0x129443cA2a9Dec2020808a2868b38dDA457eaCC7",
    tokens: [
      // USDC
      {
        tokenAddress: "0x04068DA6C83AFCFA0e13ba15A6696662335D5B75", // please cross-check this address
        minCap: parseUnits("10", 6),
        maxCap: parseUnits("221813", 6),
        depositConfigs: [
          {
            chainId: 1, // Ethereum
            minCap: parseUnits("100", 6),
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 137,  // Polygon
            minCap: parseUnits("10", 6),
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 43114, // Avalanche
            minCap: parseUnits("10", 6),
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 56, // Binance chain
            minCap: parseUnits("10", 6),
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 10,  // Optimism
            minCap: parseUnits("10", 6),
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 42161,  // arbitrum
            minCap: parseUnits("10", 6),
            maxCap: parseUnits("200000", 6),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 89491,
        maxWalletLiquidityCap: parseUnits("0", 6), // not used
        maxLiquidityCap: parseUnits("500000", 6),
        svgHelper: await ethers.getContractFactory("FantomUSDC"),
        decimals: 6,
        rewardTokenAddress: "0x524cabe5b2f66cbd6f6b08def086f18f8dde033a",
        rewardRatePerSecond: parseUnits("0.001801", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0x524cabe5b2f66cbd6f6b08def086f18f8dde033a",
        minCap: parseUnits("10", 18),
        maxCap: parseUnits("510000", 18),
        depositConfigs: [
          {
            chainId: 1, // Ethereum
            minCap: parseUnits("50", 18),
            maxCap: parseUnits("500000", 18),
          },
          {
            chainId: 137, // Polygon
            minCap: parseUnits("10", 18),
            maxCap: parseUnits("300000", 18),
          },
          {
            chainId: 56, // Binance chain
            minCap: parseUnits("10", 18),
            maxCap: parseUnits("500000", 18),
          },
          {
            chainId: 10, // Optimism
            minCap: parseUnits("10", 18),
            maxCap: parseUnits("500000", 18),
          },
          {
            chainId: 42161, // arbitrum
            minCap: parseUnits("10", 18),
            maxCap: parseUnits("500000", 18),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 85949,
        maxWalletLiquidityCap: parseUnits("0", 18), // not used
        maxLiquidityCap: parseUnits("750000", 18),
        svgHelper: await ethers.getContractFactory("FantomBICO"),
        decimals: 18,
        rewardTokenAddress: "0x524cabe5b2f66cbd6f6b08def086f18f8dde033a", // please cross-check this address
        rewardRatePerSecond: parseUnits("0", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
