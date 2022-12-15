import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0xd8Ce41FDF0fE96ea4F457d2A22faAF1d128C0954";

const configurations: ITokenAddConfiguration[] = [
  // USDT
  {
    chainId: 56,
    tokenAddress: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F",
    minCap: parseUnits("100", 6),
    maxCap: parseUnits("50000", 6),
  },
  // USDC
  {
    chainId: 56,
    tokenAddress: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    minCap: parseUnits("10", 6),
    maxCap: parseUnits("200000", 6),
  },
  // BICO
  {
    chainId: 56,
    tokenAddress: "0x91c89A94567980f0e9723b487b0beD586eE96aa7",
    minCap: parseUnits("100", 18),
    maxCap: parseUnits("100000", 18),
  },
  // ETH
  {
    chainId: 56,
    tokenAddress: "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    minCap: parseUnits("0.0039", 18),
    maxCap: parseUnits("100", 18),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);
