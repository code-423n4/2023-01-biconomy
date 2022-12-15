import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0xd8Ce41FDF0fE96ea4F457d2A22faAF1d128C0954";

const configurations: ITokenAddConfiguration[] = [
  // USDT
  {
    chainId: 56,
    tokenAddress: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    minCap: parseUnits("100", 6),
    maxCap: parseUnits("50000", 6),
  },
  // USDC
  {
    chainId: 56,
    tokenAddress: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48",
    minCap: parseUnits("10", 6),
    maxCap: parseUnits("200000", 6),
  },
  // BICO
  {
    chainId: 56,
    tokenAddress: "0xf17e65822b568b3903685a7c9f496cf7656cc6c2",
    minCap: parseUnits("100", 18),
    maxCap: parseUnits("100000", 18),
  },
  // ETH
  {
    chainId: 56,
    tokenAddress: "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
    minCap: parseUnits("0.0039", 18),
    maxCap: parseUnits("100", 18),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);
