import { ethers } from 'hardhat';
import axios from 'axios';
import { ICCMPGateway__factory } from '../../typechain-types';
import { fromContracts, fromChainId } from './config';

(async () => {
  const provider = new ethers.providers.WebSocketProvider(
    {
      43113: 'wss://api.avax-test.network/ext/bc/C/ws',
    }[fromChainId]
  );
  const gateway = ICCMPGateway__factory.connect(fromContracts.Diamond, provider);

  gateway.on('*', async (data) => {
    if (data.event === 'CCMPMessageRouted') {
      const {
        hash,
        sender,
        sourceGateway,
        sourceAdaptor,
        sourceChainId,
        destinationGateway,
        destinationChainId,
        nonce,
        routerAdaptor,
        gasFeePaymentArgs,
        payload,
      } = data.args;
      const ccmpMessage = {
        hash,
        sender,
        sourceGateway,
        sourceAdaptor,
        sourceChainId: sourceChainId.toString(),
        destinationGateway,
        destinationChainId: destinationChainId.toString(),
        nonce: nonce.toString(),
        routerAdaptor,
        gasFeePaymentArgs: {
          FeeAmount: gasFeePaymentArgs.feeAmount.toString(),
          FeeTokenAddress: gasFeePaymentArgs.feeTokenAddress,
          Relayer: gasFeePaymentArgs.relayer,
        },
        payload: payload.map((p: any) => ({
          To: p.to,
          Calldata: p._calldata,
        })),
      };
      console.log('CCMPMessage: ', JSON.stringify(ccmpMessage, null, 2));
      const response = await axios.post(`http://localhost:3000/api/v1/cross-chain/process/indexer`, {
        chainId: fromChainId,
        data: ccmpMessage,
        txHash: data.transactionHash,
      });
      console.log('Response: ', response.data);
    }
  });
})();
