import { ethers } from 'hardhat';
import { ICCMPConfiguration__factory, WormholeAdaptor__factory } from '../../typechain-types';
import { verifyContract } from '../verify/verify';
import { deployParams } from './testnet';

(async () => {
  const networkId = (await ethers.provider.getNetwork()).chainId;
  console.log(`Network: ${networkId}`);

  const params = deployParams[networkId];
  if (!params) {
    throw new Error(`No deploy params for network ${networkId}`);
  }

  const [signer] = await ethers.getSigners();

  const gateway = '0x5dB92fdAC16d027A3Fef6f438540B5818b6f66D5';

  if (!params.wormholeDeploymentMode || !params.wormholeGateway) {
    throw new Error('Wormhole Deployment Mode or Wormhole Gateway not set');
  }

  const WormholeAdaptor = await new WormholeAdaptor__factory(signer).deploy(
    params.wormholeGateway,
    gateway,
    params.owner,
    params.pauser,
    params.wormholeDeploymentMode
  );

  await WormholeAdaptor.deployed();
  await new Promise((resolve) => setTimeout(resolve, 60000));

  console.log(`WormholeAdaptor: ${WormholeAdaptor.address}`);

  await verifyContract(WormholeAdaptor.address, [
    params.wormholeGateway,
    gateway,
    params.pauser,
    params.wormholeDeploymentMode,
  ]);

  console.log('Updating router adaptor...');
  const Gateway = ICCMPConfiguration__factory.connect(gateway, signer);
  await Gateway.setRouterAdaptor('wormhole', WormholeAdaptor.address);
})();
