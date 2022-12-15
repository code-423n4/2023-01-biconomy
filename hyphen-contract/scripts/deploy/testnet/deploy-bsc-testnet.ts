import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const config: IDeployConfig = {
    trustedForwarder: "0x61456BF1715C1415730076BB79ae118E806E74d2",
    bicoOwner: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    pauser: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    tokens: [
      // USDT
      {
        tokenAddress: "0xbf22b04E250A5921ab4dC0d4ceD6E391459e92D4",
        minCap: parseUnits("100", 18),
        maxCap: parseUnits("58160",18),
        depositConfigs: [
          {
            chainId: 5,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 18),
          },
          {
            chainId: 80001,
            minCap: parseUnits("10",18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 18),
          },
          {
            chainId: 43113,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 18),
          },
        ],
        equilibriumFee: parseUnits("0.1", 8),
        maxFee: parseUnits("2.5", 8),
        transferOverhead: 82491,
        maxWalletLiquidityCap: parseUnits("10000", 18),
        maxLiquidityCap: parseUnits("578829", 18),
        svgHelper: await ethers.getContractFactory("BSCUSDT"),
        decimals: 18,
        rewardTokenAddress: "0x756289346D2b3C867966899c6D0467EdEb4Da3C4",
        rewardRatePerSecond: parseUnits("0.003662", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: "0x756289346D2b3C867966899c6D0467EdEb4Da3C4",
        minCap: parseUnits("50", 18),
        maxCap: parseUnits("123220", 18),
        depositConfigs: [
          {
            chainId: 5,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 18),
          },
          {
            chainId: 80001,
            minCap: parseUnits("10", 18),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("100000", 18),
          },
          {
            chainId: 43113,
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
        svgHelper: await ethers.getContractFactory("BSCBICO"),
        decimals: 18,
        rewardTokenAddress: "0x756289346D2b3C867966899c6D0467EdEb4Da3C4",
        rewardRatePerSecond: parseUnits("0", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
