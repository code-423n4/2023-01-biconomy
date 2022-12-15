import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0xd8Ce41FDF0fE96ea4F457d2A22faAF1d128C0954";

const configurations: ITokenAddConfiguration[] = [
  // USDC
  {
    chainId: 56,
    tokenAddress: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    minCap: parseUnits("10", 6),
    maxCap: parseUnits("200000", 6),
  },
  // ETH
  {
    chainId: 56,
    tokenAddress: "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    minCap: parseUnits("0.0039", 18),
    maxCap: parseUnits("100", 18),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);
