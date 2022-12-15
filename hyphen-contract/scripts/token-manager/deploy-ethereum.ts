import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy, IDeployConfig } from "./helper";

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
        maxCap: parseUnits("120000", 6),
        depositConfigs: [
          {
            chainId: 137,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 6),
          },
          {
            chainId: 56,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 6),
          }
        ],
        equilibriumFee: ethers.utils.parseUnits("0.075", 8),
        maxFee: ethers.utils.parseUnits("0.5", 8),
        transferOverhead: 82491, // TODO
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
          {
            chainId: 56,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("200000", 6),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.075", 8),
        maxFee: ethers.utils.parseUnits("0.5", 8),
        transferOverhead: 89491,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
        minCap: parseUnits("50", 18),
        maxCap: parseUnits("550000", 18),
        depositConfigs: [
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
        equilibriumFee: ethers.utils.parseUnits("0.075", 8),
        maxFee: ethers.utils.parseUnits("0.5", 8),
        transferOverhead: 85949,
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
          {
            chainId: 56,
            minCap: parseUnits("0.02", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("135", 18),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.075", 8),
        maxFee: ethers.utils.parseUnits("0.5", 8),
        transferOverhead: 59271,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
