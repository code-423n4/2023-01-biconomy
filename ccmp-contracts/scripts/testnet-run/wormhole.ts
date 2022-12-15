import { ethers } from 'hardhat';
import {
  ERC20Token__factory,
  ICCMPGateway__factory,
  SampleContract__factory,
} from '../../typechain-types';
import { getCCMPMessagePayloadFromSourceTx } from './utils';
import { NodeHttpTransport } from '@improbable-eng/grpc-web-node-http-transport';
import {
  getSignedVAA,
  getEmitterAddressEth,
  parseSequenceFromLogEth,
  IWormhole__factory,
} from '@certusone/wormhole-sdk';
import type { CCMPMessageStruct } from '../../typechain-types/contracts/interfaces/ICCMPRouterAdaptor';
import { BigNumber } from 'ethers';
import {
  fromChain,
  fromContracts,
  toContracts,
  toChainId,
  fromChainId,
  exitGateway,
  sourceGateway,
  sourceHyphen,
  exitBatchHelper,
  sourceToken,
} from './config';

const wormholeRpcHost = 'https://wormhole-v2-testnet-api.certus.one';

const abiCoder = new ethers.utils.AbiCoder();

const CONSISTENCY_LEVEL = 1;

const getVaa = async (sourceTxHash: string): Promise<Uint8Array> => {
  const emitter = getEmitterAddressEth(fromContracts.WormholeAdaptor);
  console.log(`Emitter Address for Wormhole Adapter: ${emitter}`);

  const receipt = await ethers.provider.getTransactionReceipt(sourceTxHash);
  const sequence = parseSequenceFromLogEth(receipt, fromContracts.wormholeBridgeAddress);
  console.log(`Sequence for Wormhole Adapter: ${sequence}`);

  console.log(`Getting VAA for source transaction ${sourceTxHash}...`);
  return new Promise<Uint8Array>((resolve, reject) => {
    const id = setInterval(async () => {
      try {
        console.log(wormholeRpcHost, fromContracts.emitterChain, emitter, sequence);
        const { vaaBytes } = await getSignedVAA(
          wormholeRpcHost,
          fromContracts.emitterChain,
          emitter,
          sequence,
          {
            transport: NodeHttpTransport(),
          }
        );
        clearInterval(id);
        resolve(vaaBytes);
      } catch (e) {
        console.log('VAA Not found', e);
      }
    }, 2000);
  });
};

const executeApprovedTransaction = async (
  txHash: string,
  message: CCMPMessageStruct,
  vaa: Uint8Array
) => {
  console.log(`Executing source transaction ${txHash} on exit chain...`);
  const gateway = exitGateway();

  try {
    console.log(message);

    const wormhole = IWormhole__factory.connect(toContracts.wormholeBridgeAddress, gateway.signer);

    const vaaParsed = await wormhole.parseAndVerifyVM(vaa);
    console.log('VAA: ', vaaParsed);

    const { hash, wait } = await gateway.receiveMessage(message, vaa, false, {
      gasPrice: ethers.utils.parseUnits('50', 'gwei'),
      // gasLimit: 1000000
    });
    console.log(`Submitted exit transaction ${hash} on exit chain.`);
    const { blockNumber } = await wait(5);
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
    console.log(e);
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

const simpleMessage = async () => {
  await preCheck();

  const gateway = sourceGateway();
  const token = sourceToken();

  const sampleContract = SampleContract__factory.connect(
    fromContracts.sampleContract,
    gateway.signer
  );
  const calldata = sampleContract.interface.encodeFunctionData('emitEvent', ['Hello World']);

  try {
    const { hash, wait } = await gateway.sendMessage(
      80001,
      'wormhole',
      [
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
        {
          to: toContracts.sampleContract,
          _calldata: calldata,
        },
      ],
      {
        feeTokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        feeAmount: 0,
        relayer: '0x0000000000000000000000000000000000000001',
      },
      abiCoder.encode(['uint256'], [CONSISTENCY_LEVEL]),
      {
        gasPrice: 50 * 1e9,
      }
    );

    console.log(`Source chain hash: ${hash}`);
    await wait(1);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
  } catch (e) {
    console.error(`Error executing transaction`);
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

const hyphenDepositAndCall = async () => {
  await preCheck();

  const hyphen = sourceHyphen();
  const gateway = sourceGateway();
  const sourceDecimals = BigNumber.from(10).pow(fromContracts.decimals);
  const token = sourceToken();
  const signerAddress = await gateway.signer.getAddress();

  const approval = await token.allowance(signerAddress, fromContracts.hyphen);
  console.log(`Approval To Hyphen: ${approval.toString()}`);
  if (approval.lt(ethers.constants.MaxInt256.div(2))) {
    console.log(`Approving token transfer to hyphen...`);
    await token.approve(fromContracts.hyphen, ethers.constants.MaxUint256);
  }

  try {
    const { hash, wait } = await hyphen.depositAndCall(
      toChainId,
      fromContracts.token,
      await hyphen.signer.getAddress(),
      BigNumber.from(100).mul(sourceDecimals),
      'CCMPTest',
      [],
      {
        feeTokenAddress: fromContracts.token,
        feeAmount: BigNumber.from(10).mul(sourceDecimals),
        relayer: '0x0000000000000000000000000000000000000001',
      },
      abiCoder.encode(
        ['string', 'bytes'],
        ['wormhole', abiCoder.encode(['uint256'], [CONSISTENCY_LEVEL])]
      ),
      {
        // gasLimit: 1000000,
      }
    );
    await wait(1);

    // const hash = "0xf84a3b3c2ba05d6f12010311f5f8cbb03bd1b86a5e30737b884e3c61e8b37804";

    console.log(`Source chain hash: ${hash}`);

    const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);

    const vaa = await getVaa(hash);

    await executeApprovedTransaction(hash, ccmpMessage, vaa);
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

    const params = {
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
      adaptorName: 'wormhole',
      routerArgs: abiCoder.encode(['uint256'], [CONSISTENCY_LEVEL]),
      hyphenArgs: [],
    };

    console.log(JSON.stringify(params, null, 2));

    // Perform Source Chain Transaction
    const { hash, wait } = await hyphen.depositAndCall(params, {
      gasLimit: 1000000,
    });
    const receipt = await wait(1);

    // const hash = "0xf84a3b3c2ba05d6f12010311f5f8cbb03bd1b86a5e30737b884e3c61e8b37804";

    console.log(`Source chain hash: ${hash}, blockNumber: ${receipt.blockNumber}`);

    // Parse Event And Get VAA
    // const ccmpMessage = await getCCMPMessagePayloadFromSourceTx(hash);
    // const vaa = await getVaa(hash);

    // Perform Exit Transaction
    // await executeApprovedTransaction(hash, ccmpMessage, vaa);
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
