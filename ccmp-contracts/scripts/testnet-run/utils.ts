import { ethers } from "hardhat";
import { ICCMPGateway__factory } from "../../typechain-types";
import type { CCMPMessageStruct } from "../../typechain-types/contracts/interfaces/ICCMPRouterAdaptor";

const CCMPMessageRoutedTopic = "0xd104ea90f9fae928714248aaeace6818d814f775ed2883b9286841dc71b66ada";

export const getCCMPMessagePayloadFromSourceTx = async (txHash: string): Promise<CCMPMessageStruct> => {
  const [signer] = await ethers.getSigners();
  const receipt = await ethers.provider.getTransactionReceipt(txHash);
  const gateway = ICCMPGateway__factory.connect(receipt.to, signer);
  const log = receipt.logs.find((log) => log.topics[0] === CCMPMessageRoutedTopic);
  if (!log) {
    throw new Error(`No CCMP message routed log found for transaction ${txHash}`);
  }
  const data = gateway.interface.parseLog(log);
  const {
    sender,
    sourceGateway,
    sourceAdaptor,
    sourceChainId,
    destinationGateway,
    destinationChainId,
    nonce,
    routerAdaptor,
    payload,
    gasFeePaymentArgs,
  } = data.args;
  return {
    sender,
    sourceGateway,
    sourceChainId,
    sourceAdaptor,
    destinationChainId,
    destinationGateway,
    nonce,
    routerAdaptor,
    payload,
    gasFeePaymentArgs,
  };
};
