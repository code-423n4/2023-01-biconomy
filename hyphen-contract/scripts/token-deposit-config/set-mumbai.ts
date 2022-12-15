import { parseUnits } from "ethers/lib/utils";
import { setTokenDepositConfiguration } from "./set";
import type { ITokenAddConfiguration } from "./set";

const TokenManager = "0xc23F4c4886f1D48d980dd33a712c7B71c3d31032";

const configurations: ITokenAddConfiguration[] = [
  {
    chainId: 97,
    tokenAddress: "0xeabc4b91d9375796aa4f69cc764a4ab509080a58",
    minCap: parseUnits("100", 18),
    maxCap: parseUnits("1000", 18),
  },
  {
    chainId: 97,
    tokenAddress: "0xa6fa4fb5f76172d178d61b04b0ecd319c5d1c0aa",
    minCap: parseUnits("0.01", 18),
    maxCap: parseUnits("100", 18),
  },
  {
    chainId: 97,
    tokenAddress: "0xdA5289fCAAF71d52a80A254da614a192b693e977",
    minCap: parseUnits("100", 6),
    maxCap: parseUnits("1000", 6),
  },
];

setTokenDepositConfiguration(TokenManager, configurations);
