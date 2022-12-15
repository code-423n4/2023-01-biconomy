import { ethers } from "hardhat";
import { ERC20Token__factory } from "../../typechain";
import { getSupportedTokenAddresses } from "../upgrades/upgrade-all/upgrade-all";
import { impersonateAndExecute, sendTransaction, setNativeBalance } from "./utils";
import tokenAddressToFundingAccount from "./token-address-to-funding-account";

const fundErc20FromAccount = async (fundingAccount: string, tokenAddress: string, to: string) => {
  await impersonateAndExecute(fundingAccount, async (signer) => {
    const { chainId } = await ethers.provider.getNetwork();
    const token = ERC20Token__factory.connect(tokenAddress, signer);
    const liquidity = await token.balanceOf(signer.address);
    const amount = liquidity.div(2);
    console.log(`Funding ${to} with ${amount} ${tokenAddress} from ${fundingAccount} on chain ${chainId}...`);
    await sendTransaction(token.transfer(to, amount), "Funding ERC20 Token");
    const finalBalance = await token.balanceOf(to);
    console.log(`${to} has ${finalBalance} ${tokenAddress} on chain ${chainId}`);
  });
};

(async () => {
  await setNativeBalance(process.env.TRANSACTOR_ADDRESS!, ethers.utils.parseEther("1000"));
  const { chainId } = await ethers.provider.getNetwork();
  const supportedTokenAddresses = (await getSupportedTokenAddresses(process.env.PROD_API_URL!, chainId)).filter(
    (x) => x.toLowerCase() !== "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
  );
  console.log(`Supported ERC20 Tokens on chain ${chainId}: ${JSON.stringify(supportedTokenAddresses, null, 2)}`);
  for (const token of supportedTokenAddresses) {
    const fundingAccount =
      tokenAddressToFundingAccount[token.toLowerCase() as keyof typeof tokenAddressToFundingAccount];
    if (!fundingAccount) {
      console.error(`No funding account found for ${token}`);
      continue;
    }
    const fundingAccountNativeBalance = await ethers.provider.getBalance(fundingAccount);
    if (fundingAccountNativeBalance.eq(0)) {
      await setNativeBalance(fundingAccount, ethers.utils.parseEther("1000"));
    }

    await fundErc20FromAccount(fundingAccount, token, process.env.TRANSACTOR_ADDRESS!);
  }
})();
