import { ethers } from 'hardhat';
import { HyperlaneAdaptor__factory } from '../../typechain-types';
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

  const gateway = '0x53B309Ff259e568309A19810E3bF1647B6922afd';

  if (!params.abacusConnectionManager || !params.abacusInterchainGasMaster) {
    throw new Error('Abacus Connection Manager or Abacus Interchain Gas Master not set');
  }

  const HyperlaneAdaptor = await new HyperlaneAdaptor__factory(signer).deploy(
    gateway,
    params.owner,
    params.pauser,
    params.abacusConnectionManager,
    params.abacusInterchainGasMaster
  );

  await HyperlaneAdaptor.deployed();
  await new Promise((resolve) => setTimeout(resolve, 10000));

  console.log(`Hyperlane Adaptor: ${HyperlaneAdaptor.address}`);

  await verifyContract(HyperlaneAdaptor.address, [
    gateway,
    params.pauser,
    params.abacusConnectionManager,
    params.abacusInterchainGasMaster,
  ]);
})();
