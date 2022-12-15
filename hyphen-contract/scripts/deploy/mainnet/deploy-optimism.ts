import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x22f9a22EA02eB2fE0B76e4685c5D7Ae718717084",
    bicoOwner: "0xd76b82204be75ab9610b04cf27c4f4a34291d5e6",
    pauser: "0x129443cA2a9Dec2020808a2868b38dDA457eaCC7",
    tokens: [
      // USDC
      {
        tokenAddress: "0x7f5c764cbc14f9669b88837ca1490cca17c31607",
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
          {
            chainId: 43114,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
          {
            chainId: 56,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 89491,
        maxWalletLiquidityCap: parseUnits("10000", 6), // not used
        maxLiquidityCap: parseUnits("500000", 6),
        svgHelper: await ethers.getContractFactory("OPTUSDC"),
        decimals: 6,
        rewardTokenAddress: "0xd6909e9e702024eb93312b989ee46794c0fb1c9d",
        rewardRatePerSecond: parseUnits("0.001668", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0xd6909e9e702024eb93312b989ee46794c0fb1c9d",
        minCap: parseUnits("10", 18),
        maxCap: parseUnits("510000", 18),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("50", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("500000", 18),
          },
          {
            chainId: 137,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("300000", 18),
          },
          {
            chainId: 56,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("500000", 18),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 85949,
        maxWalletLiquidityCap: parseUnits("8474", 18), // not used
        maxLiquidityCap: parseUnits("750000", 18),
        svgHelper: await ethers.getContractFactory("OPTBICO"),
        decimals: 18,
        rewardTokenAddress: "0xd6909e9e702024eb93312b989ee46794c0fb1c9d",
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
            chainId: 1,
            minCap: parseUnits("0.02", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 137,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 56,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("130", 18),
          },
          {
            chainId: 43114,
            minCap: parseUnits("0.0039", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("130", 18),
          },
        ],
        equilibriumFee: parseUnits("0.075", 8),
        maxFee: parseUnits("0.5", 8),
        transferOverhead: 59271,
        maxWalletLiquidityCap: parseUnits("3", 18), // not used
        maxLiquidityCap: parseUnits("260", 18),
        svgHelper: await ethers.getContractFactory("OPTETH"),
        decimals: 18,
        rewardTokenAddress: "0xd6909e9e702024eb93312b989ee46794c0fb1c9d",
        rewardRatePerSecond: parseUnits("0.001035", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
