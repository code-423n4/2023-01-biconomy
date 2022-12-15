import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy, IDeployConfig } from "./helper";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x86C80a8aa58e0A4fa09A69624c31Ab2a6CAD56b8",
    bicoOwner: "0xd76b82204be75ab9610b04cf27c4f4a34291d5e6",
    pauser: "0xc8582180f52B6303F51e7028C3A9f428Eb43DfE7",
    tokens: [
      // USDT
      {
        tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
        minCap: parseUnits("10", 6),
        maxCap: parseUnits("58160", 6),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("100", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 6),
          },
          {
            chainId: 56,
            minCap: parseUnits("100", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 6),
          },
        ],
        equilibriumFee: ethers.utils.parseUnits("0.075", 8),
        maxFee: ethers.utils.parseUnits("0.5", 8),
        transferOverhead: 82491, // TODO
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // USDC
      {
        tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
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
        tokenAddress: "0x91c89A94567980f0e9723b487b0beD586eE96aa7",
        minCap: parseUnits("10", 18),
        maxCap: parseUnits("323220", 18),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("50", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("500000", 18),
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
      // WETH
      {
        tokenAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
        minCap: parseUnits("0.0039", 18),
        maxCap: parseUnits("143", 18),
        depositConfigs: [
          {
            chainId: 1,
            minCap: parseUnits("0.02", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("120", 18),
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
        transferOverhead: 72945,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
