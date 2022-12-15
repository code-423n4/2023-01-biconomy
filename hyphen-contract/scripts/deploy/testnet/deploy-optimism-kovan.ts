import { ethers } from "hardhat";
import { parseUnits } from "ethers/lib/utils";
import { deploy, deployToken } from "../deploy-utils";
import type { IDeployConfig } from "../../types";

(async () => {
  const usdc = await deployToken(
    "USDC",
    "USDC",
    6,
    ["0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404"],
    ethers.BigNumber.from(10).pow(20)
  );
  const bico = await deployToken(
    "BICO",
    "BICO",
    18,
    ["0xDA861C9DccFf6d1fEf7Cae71B5b538AF25063404"],
    ethers.BigNumber.from(10).pow(30)
  );

  const config: IDeployConfig = {
    // We don't support gasless on Optimism Yet
    trustedForwarder: bico.address,

    bicoOwner: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    pauser: "0x46b65ae065341D034fEA45D76c6fA936EAfBfdeb",
    tokens: [
      // USDC
      {
        tokenAddress: usdc.address,
        minCap: parseUnits("100", 6),
        maxCap: parseUnits("58160", 6),
        depositConfigs: [
          {
            chainId: 5,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 6),
          },
          {
            chainId: 80001,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 6),
          },
          {
            chainId: 43113,
            minCap: parseUnits("10", 6),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: parseUnits("50000", 6),
          },
          {
            chainId: 97,
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
        svgHelper: await ethers.getContractFactory("OPTUSDC"),
        decimals: 6,
        rewardTokenAddress: bico.address,
        rewardRatePerSecond: parseUnits("0.003662", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // BICO
      {
        tokenAddress: bico.address,
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
          {
            chainId: 97,
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
        svgHelper: await ethers.getContractFactory("OPTBICO"),
        decimals: 18,
        rewardTokenAddress: bico.address,
        rewardRatePerSecond: parseUnits("0.01", 18),
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
      // ETH
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
          {
            chainId: 97,
            minCap: ethers.BigNumber.from(10).pow(18 - 2),
            // Max Cap needs to be less than the maxTransfer Fee on destination chain id to cover for incentive amount
            maxCap: ethers.BigNumber.from(97).mul(ethers.BigNumber.from(10).pow(18)),
          },
        ],
        equilibriumFee: 10000000,
        maxFee: 200000000,
        transferOverhead: 0,
        maxWalletLiquidityCap: ethers.BigNumber.from(10).pow(18 + 4),
        maxLiquidityCap: ethers.BigNumber.from(10).pow(18 + 5),
        svgHelper: await ethers.getContractFactory("OPTETH"),
        decimals: 18,
        rewardRatePerSecond: 100,
        rewardTokenAddress: bico.address,
        excessStateTransferFeePer: parseUnits("0.045", 8),
      },
    ],
  };
  await deploy(config);
})();
