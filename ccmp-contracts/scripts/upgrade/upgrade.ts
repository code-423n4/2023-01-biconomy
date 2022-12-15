import { ethers } from 'hardhat';
import {
  CCMPConfigurationFacet__factory,
  DiamondCutFacet,
  CCMPReceiverMessageFacet__factory,
  CCMPSendMessageFacet__factory,
  DiamondCutFacet__factory,
  DiamondLoupeFacet__factory,
} from '../../typechain-types';
import { getSelectors } from '../deploy/utils';
import { verifyContract } from '../verify/verify';
import type { Contract } from 'ethers';
import { FacetCutAction } from '../deploy/utils';

const factory = {
  configuration: CCMPConfigurationFacet__factory,
  receiveMessage: CCMPReceiverMessageFacet__factory,
  sendMessage: CCMPSendMessageFacet__factory,
};

const registerFacet = async (diamond: DiamondCutFacet, facets: Contract[]) => {
  const existingFacets = await DiamondLoupeFacet__factory.connect(
    diamond.address,
    diamond.signer
  ).facets();
  const existingFuctionSelectors = existingFacets
    .map((f) => f.functionSelectors)
    .reduce((a, b) => [...a, ...b]);

  const facetCuts = facets
    .map((facet) => [
      {
        facetAddress: facet.address,
        action: FacetCutAction.Replace,
        functionSelectors: getSelectors(facet).filter((f) => existingFuctionSelectors.includes(f)),
      },
      {
        facetAddress: facet.address,
        action: FacetCutAction.Add,
        functionSelectors: getSelectors(facet).filter((f) => !existingFuctionSelectors.includes(f)),
      },
    ])
    .reduce((a, b) => [...a, ...b])
    .filter((f) => f.functionSelectors.length > 0);
  console.log(`Executing FacetCuts: ${JSON.stringify(facetCuts, null, 2)}`);
  try {
    const { hash, wait } = await diamond.diamondCut(facetCuts, ethers.constants.AddressZero, '0x');
    console.log(`DiamondCut tx hash: ${hash}`);
    const { status } = await wait();
    if (status) {
      console.log(`DiamondCut tx successful`);
    } else {
      throw new Error(`DiamondCut tx failed`);
    }
  } catch (e) {
    const errorData =
      (e as any).error?.data ||
      (e as any).error?.error?.data ||
      (e as any).error?.error?.error?.data;
    if (errorData) {
      const error = diamond.interface.parseError(errorData);
      console.log(error);
    }
  }
};

const deployFacet = async (name: keyof typeof factory): Promise<Contract> => {
  const signer = (await ethers.getSigners())[0];
  console.log(`Deploying ${name} facet...`);
  const contract = await new factory[name](signer).deploy();
  await contract.deployed();
  console.log(`Deployed ${name} facet at ${contract.address}`);
  setTimeout(() => verifyContract(contract.address, []), 10000);
  return contract;
};

(async () => {
  const diamondAddress = process.env.DIAMOND;
  if (!diamondAddress) {
    throw new Error('Diamond address not set');
  }
  const upgradeItems = process.env.UPGRADE?.split(',') || [];
  if (!upgradeItems.length) {
    throw new Error('No upgrade items specified');
  }

  const facets = [];
  for (const item of upgradeItems) {
    const facet = await deployFacet(item as keyof typeof factory);
    facets.push(facet);
  }

  await registerFacet(
    DiamondCutFacet__factory.connect(diamondAddress, (await ethers.getSigners())[0]),
    facets
  );
})();
