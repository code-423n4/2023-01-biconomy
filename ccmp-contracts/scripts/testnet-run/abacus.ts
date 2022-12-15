import { ethers } from 'hardhat';
import { BigNumber } from 'ethers';
import { ICCMPGateway__factory } from '../../typechain-types';
import { SampleContract__factory } from '../../typechain-types';
import { getCCMPMessagePayloadFromSourceTx } from './utils';
import type { CCMPMessageStruct } from '../../typechain-types/contracts/interfaces/ICCMPGateway.sol/ICCMPGateway';
import { AbacusCore, MultiProvider } from '@abacus-network/sdk';

import {
  fromChain,
  fromContracts,
  toContracts,
  toChainId,
  toChain,
  fromChainId,
  exitGateway,
  sourceGateway,
  sourceHyphen,
  exitBatchHelper,
  sourceToken,
} from './config';

const core = AbacusCore.fromEnvironment(
  'testnet2',
  new MultiProvider({
    fuji: {
      provider: new ethers.providers.JsonRpcProvider(process.env.FUJI_URL),
    },
    mumbai: {
      provider: new ethers.providers.JsonRpcProvider(process.env.MUMBAI_URL),
    },
  })
);

const abiCoder = new ethers.utils.AbiCoder();

const waitUntilTxStatus = async (txHash: string) => {
  console.log('Waiting for tx status...');
  const fromProvider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const txReceipt = await fromProvider.getTransactionReceipt(txHash);

  const id = setInterval(() => {
    try {
      const message = core.getDispatchedMessages(txReceipt);
      console.log(message);
    } catch (e) {
      console.log(`Error getting dispatched receipt: ${e}`);
    }
  }, 5000);

  console.log(await core.waitForMessageProcessing(txReceipt));
  clearInterval(id);
};

const executeApprovedTransaction = async (txHash: string, message: CCMPMessageStruct) => {
  console.log(`Executing source transaction message ${txHash} on exit chain...`);
  const { Diamond: CCMPGatewayAddrTo } = toContracts;
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);

  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(CCMPGatewayAddrTo, wallet);
  try {
    const { hash, wait } = await gateway.receiveMessage(
      message,
      abiCoder.encode(['string'], ['0x']),
      false,
      {
        // gasPrice: ethers.utils.parseUnits("50", "gwei"),
        // gasLimit: 1000000,
      }
    );
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait();
    console.log(`Transaction ${hash} confirmed on exit chain at block ${blockNumber}`);
  } catch (e) {
    console.error(`Error executing transaction`);
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(JSON.stringify((e as any).error, null, 2));
    }
  }
};

const simpleMessage = async () => {
  const [signer] = await ethers.getSigners();

  const { Diamond: CCMPGatewayFromAddr } = fromContracts;
  const { sampleContract: SampleContractToAddr, AxelarAdaptor: AxelarAdaptorToAddr } = toContracts;

  const gateway = ICCMPGateway__factory.connect(CCMPGatewayFromAddr, signer);

  const sampleContract = SampleContract__factory.connect(SampleContractToAddr, signer);
  const calldata = sampleContract.interface.encodeFunctionData('emitEvent', ['Hello World']);

  try {
    // const { hash, wait } = await gateway.sendMessage(
    //   toChainId,
    //   'abacus',
    //   [
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //     {
    //       to: SampleContractToAddr,
    //       _calldata: calldata,
    //     },
    //   ],
    //   {
    //     feeTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    //     feeAmount: 0,
    //     relayer: signer.address,
    //   },
    //   abiCoder.encode(['string'], [AxelarAdaptorToAddr]),
    //   {
    //     // gasLimit: 1000000,
    //   }
    // );

    // console.log(`Source chain hash: ${hash}`);
    // await wait();

    const hash = "0xa0ca5b0c4d472f972dbbd1f2197c531bfb9b0220410d41a2b09ff4aaf0a0e384";

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    console.log(ccmpMessage);

    await waitUntilTxStatus(hash);

    await executeApprovedTransaction(hash, ccmpMessage);
  } catch (e) {
    console.error(`Error executing transaction`, e);
    const errorData = (e as any).error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    } else {
      console.log(e);
    }
  }
};

const preCheck = async () => {
  const fromGateway = sourceGateway();
  const toGateway = exitGateway();

  if ((await fromGateway.gateway(toChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on source chain`);
    await (await fromGateway.setGateway(toChainId, toContracts.Diamond)).wait();
  }

  if ((await toGateway.gateway(fromChainId)) === ethers.constants.AddressZero) {
    console.log(`Gateway not set on exit chain`);
    await (await toGateway.setGateway(fromChainId, fromContracts.Diamond)).wait();
  }
};

const hyphenDepositAndCallWithBatchHelper = async () => {
  await preCheck();

  const hyphen = sourceHyphen();
  const gateway = sourceGateway();
  const sourceDecimals = BigNumber.from(10).pow(fromContracts.decimals);
  const token = sourceToken();
  const signerAddress = await gateway.signer.getAddress();
  const batchHelper = exitBatchHelper();

  // Check Token Approval
  const approval = await token.allowance(signerAddress, fromContracts.hyphen);
  console.log(`Approval To Hyphen: ${approval.toString()}`);
  if (approval.lt(ethers.constants.MaxInt256.div(2))) {
    console.log(`Approving token transfer to hyphen...`);
    await token.approve(fromContracts.hyphen, ethers.constants.MaxUint256);
  }

  try {
    // TODO: Fetch via Off Chain Call
    const gasFeePaymentArgs = {
      feeTokenAddress: fromContracts.token,
      feeAmount: BigNumber.from(10).mul(sourceDecimals),
      relayer: '0x0000000000000000000000000000000000000001',
    };

    // Perform Source Chain Transaction
    const { hash, wait } = await hyphen.depositAndCall({
      toChainId,
      tokenAddress: fromContracts.token,
      receiver: batchHelper.address,
      amount: BigNumber.from(100).mul(sourceDecimals),
      tag: 'CCMPTest',
      payloads: [
        {
          to: toContracts.batchHelper,
          _calldata: batchHelper.interface.encodeFunctionData('execute', [
            toContracts.token,
            toContracts.lpToken,
            toContracts.liquidityProviders,
            toContracts.liquidityFarming,
            signerAddress,
          ]),
        },
      ],
      gasFeePaymentArgs,
      adaptorName: 'abacus',
      routerArgs: abiCoder.encode(['uint256'], [0]),
      hyphenArgs: [],
    });
    const receipt = await wait(1);

    console.log(`Source chain hash: ${hash}, blockNumber: ${receipt.blockNumber}`);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    await waitUntilTxStatus(hash);

    // Perform Exit Transaction
    await executeApprovedTransaction(hash, ccmpMessage);
  } catch (e) {
    console.error(`Error executing transaction`);
    console.log(e);
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      console.log(errorData);
      const error = gateway.interface.parseError(errorData);
      console.log(error);
    }
  }
};

hyphenDepositAndCallWithBatchHelper();
