import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x84a0856b038eaAd1cC7E297cF34A7e72685A8693",
    bicoOwner: "0xd76b82204be75ab9610b04cf27c4f4a34291d5e6",
    pauser: "0x144A36059cdc0eF8e192ddC4df6E6d2F013fDa6A",
    tokens: [
      // USDT
      {
        tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
        minCap: parseUnits("100", 6),
        maxCap: parseUnits("58160", 6),
        depositConfigs: [
          {
            chainId: 137,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 6),
          },
        ],
        equilibriumFee: parseUnits("0.1", 8),
        maxFee: parseUnits("2.5", 8),
        transferOverhead: 82491,
        maxWalletLiquidityCap: parseUnits("10000", 6),
        maxLiquidityCap: parseUnits("578829", 6),
        svgHelper: await ethers.getContractFactory("EthereumUSDT"),
        decimals: 6,
        rewardTokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        rewardRatePerSecond: parseUnits("0.002247835648148150", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // USDC
      {
        tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
        minCap: parseUnits("100", 6),
        maxCap: parseUnits("221813", 6),
        depositConfigs: [
          {
            chainId: 137,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 43114,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.1", 8),
        maxFee: ethers.utils.parseUnits("2.5", 8),
        transferOverhead: 89491,
        maxWalletLiquidityCap: parseUnits("10000", 6),
        maxLiquidityCap: parseUnits("1643855", 6),
        svgHelper: await ethers.getContractFactory("EthereumUSDC"),
        decimals: 6,
        rewardTokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        rewardRatePerSecond: parseUnits("0.006383761574074080", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        minCap: parseUnits("50", 18),
        maxCap: parseUnits("123220", 18),
        depositConfigs: [
          {
            chainId: 137,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 18),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.1", 8),
        maxFee: ethers.utils.parseUnits("2.5", 8),
        transferOverhead: 85949,
        maxWalletLiquidityCap: parseUnits("8474.57", 18),
        maxLiquidityCap: parseUnits("610350", 18),
        svgHelper: await ethers.getContractFactory("EthereumBICO"),
        decimals: 18,
        rewardTokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        rewardRatePerSecond: parseUnits("0.002796886574074070", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // ETH
      {
        tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        minCap: parseUnits("0.02", 18),
        maxCap: parseUnits("143", 18),
        depositConfigs: [
          {
            chainId: 137,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100", 18),
          },
          {
            chainId: 43114,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100", 18),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.1", 8),
        maxFee: ethers.utils.parseUnits("2.5", 8),
        transferOverhead: 59271,
        maxWalletLiquidityCap: parseUnits("3.86", 18),
        maxLiquidityCap: parseUnits("1774", 18),
        svgHelper: await ethers.getContractFactory("EthereumETH"),
        decimals: 18,
        rewardTokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        rewardRatePerSecond: parseUnits("0.017809687500000000", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
