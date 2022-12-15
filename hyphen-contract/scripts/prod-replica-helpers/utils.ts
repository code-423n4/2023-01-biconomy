import { ethers, network } from "hardhat";
import { ContractTransaction, ContractReceipt, BigNumberish } from "ethers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

export const sendTransaction = async (
  tx: Promise<ContractTransaction>,
  description?: string
): Promise<ContractReceipt> => {
  const { wait, hash, chainId } = await tx;
  console.log(`Sent Transaction ${hash} on chain ${chainId} ${description}`);
  const receipt = await wait();
  if (receipt.status === 1) {
    console.log(`Transaction ${hash} on chain ${chainId} for ${description} confirmed on block ${receipt.blockNumber}`);
  } else {
    console.log(`Transaction ${hash} on chain ${chainId} for ${description} failed`);
  }
  return receipt;
};

export const impersonateAndExecute = async (
  addressToImpersonate: string,
  action: (signer: SignerWithAddress) => Promise<any>
) => {
  console.log(`Impersonating ${addressToImpersonate}...`);
  const result = await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [addressToImpersonate],
  });
  console.log(`Impersonation Request Result: ${JSON.stringify(result, null, 2)}`);
  const signer = await ethers.getSigner(addressToImpersonate);
  try {
    await action(signer);
  } catch (e) {
    console.error(`Error executing action with impersonated accoutn: ${e}`);
  }
  console.log(`Stop Impersonating ${addressToImpersonate}...`);
  await network.provider.request({
    method: "hardhat_stopImpersonatingAccount",
    params: [addressToImpersonate],
  });
};

export const setNativeBalance = async (address: string, balance: BigNumberish) => {
  const { chainId } = await ethers.provider.getNetwork();
  console.log(`Setting native balance of ${address} to ${balance} on chain ${chainId}`);
  await network.provider.send("hardhat_setBalance", [
    address,
    ethers.BigNumber.from(balance).toHexString().replace("0x0", "0x"),
  ]);
  const updatedBalance = await ethers.provider.getBalance(address);
  console.log(`Native balance of ${address} is now ${updatedBalance} on chain ${chainId}`);
};
