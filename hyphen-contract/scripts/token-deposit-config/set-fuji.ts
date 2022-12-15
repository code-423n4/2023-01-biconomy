
import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0xf972dAf3273B84Ab862a73a75dca1204E4a357cf";

const configurations: ITokenAddConfiguration[] = [
  {
    chainId: 97,
    tokenAddress: "0xB4E0F6FEF81BdFea0856bB846789985c9CFf7e85",
    minCap: parseUnits("100", 18),
    maxCap: parseUnits("1000", 18),
  },
  {
    chainId: 97,
    tokenAddress: "0x7fCDc2C1EF3e4A0bCC8155a558bB20a7218f2b05",
    minCap: parseUnits("0.01", 18),
    maxCap: parseUnits("100", 18),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);