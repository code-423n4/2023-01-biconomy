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
        tokenAddress: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
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
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 89491,
        maxWalletLiquidityCap: parseUnits("0", 6), // not used
        maxLiquidityCap: parseUnits("500000", 6),
        svgHelper: await ethers.getContractFactory("ArbitrumUSDC"),
        decimals: 6,
        rewardTokenAddress: "0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d",
        rewardRatePerSecond: parseUnits("0.001604", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d",
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
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 85949,
        maxWalletLiquidityCap: parseUnits("0", 18), // not used
        maxLiquidityCap: parseUnits("750000", 18),
        svgHelper: await ethers.getContractFactory("ArbitrumBICO"),
        decimals: 18,
        rewardTokenAddress: "0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d",
        rewardRatePerSecond: parseUnits("0", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // ETH
      {
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        minCap: parseUnits("0.02", 18),
        maxCap: parseUnits("143", 18),
        depositConfigs: [
          {
            chainId: 1, // Ethereum
            minCap: parseUnits("0.02", 18),
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 137, // Polygon
            minCap: parseUnits("0.0039", 18),
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 56, // Binance chain
            minCap: parseUnits("0.0039", 18),
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 43114, // Avalanche
            minCap: parseUnits("0.0039", 18),
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 10, // Optimism
            minCap: parseUnits("0.0039", 18),
            maxCap: parseUnits("130", 18),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 59271,
        maxWalletLiquidityCap: parseUnits("0", 18), // not used
        maxLiquidityCap: parseUnits("445", 18),
        svgHelper: await ethers.getContractFactory("ArbitrumETH"),
        decimals: 18,
        rewardTokenAddress: "0xa68Ec98D7ca870cF1Dd0b00EBbb7c4bF60A8e74d",
        rewardRatePerSecond: parseUnits("0.001459", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
