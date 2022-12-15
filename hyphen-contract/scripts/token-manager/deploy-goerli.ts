import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy, IDeployConfig } from "./helper";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0xE041608922d06a4F26C0d4c27d8bCD01daf1f792",
    bicoOwner: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    pauser: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    tokens: [
      {
        tokenAddress: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
        minCap: ethers.BigNumber.from(10).pow(18 + 2),
        maxCap: ethers.BigNumber.from(10).pow(18 + 4),
        depositConfigs: [
          {
            chainId: 43113,
            minCap: ethers.BigNumber.from(10).pow(18 + 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(9).mul(ethers.BigNumber.from(10).pow(18 + 3)),
          },
          {
            chainId: 80001,
            minCap: ethers.BigNumber.from(10).pow(18 + 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(9).mul(ethers.BigNumber.from(10).pow(18 + 3)),
          },
        ],
        equilibriumFee: 10000000,
        maxFee: 200000000,
        transferOverhead: 0,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      {
        tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
        minCap: ethers.BigNumber.from(10).pow(18 - 2),
        maxCap: ethers.BigNumber.from(10).pow(18 + 2),
        depositConfigs: [
          {
            chainId: 43113,
            minCap: ethers.BigNumber.from(10).pow(18 - 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(97).mul(ethers.BigNumber.from(10).pow(18)),
          },
          {
            chainId: 80001,
            minCap: ethers.BigNumber.from(10).pow(18 - 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(97).mul(ethers.BigNumber.from(10).pow(18)),
          },
        ],
        equilibriumFee: 10000000,
        maxFee: 200000000,
        transferOverhead: 0,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      {
        tokenAddress: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
        minCap: ethers.BigNumber.from(10).pow(6 + 2),
        maxCap: ethers.BigNumber.from(10).pow(6 + 4),
        depositConfigs: [
          {
            chainId: 80001,
            minCap: ethers.BigNumber.from(10).pow(6 + 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(9).mul(ethers.BigNumber.from(10).pow(6 + 3)),
          },
        ],
        equilibriumFee: 10000000,
        maxFee: 200000000,
        transferOverhead: 0,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
