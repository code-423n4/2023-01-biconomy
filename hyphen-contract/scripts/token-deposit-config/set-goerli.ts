
import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0x49B5e3Dc6E9f11031E355c272b0Ed11afB90177e";

const configurations: ITokenAddConfiguration[] = [
  {
    chainId: 97,
    tokenAddress: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716",
    minCap: parseUnits("100", 18),
    maxCap: parseUnits("1000", 18),
  },
  {
    chainId: 97,
    tokenAddress: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
    minCap: parseUnits("0.01", 18),
    maxCap: parseUnits("100", 18),
  },
  {
    chainId: 97,
    tokenAddress: "0xb5B640E6414b6DeF4FC9B3C1EeF373925effeCcF",
    minCap: parseUnits("100", 6),
    maxCap: parseUnits("1000", 6),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);