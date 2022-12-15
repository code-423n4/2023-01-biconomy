import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers';
import { ethers, network } from 'hardhat';
import { Deployer, Deployer__factory, SampleContract__factory } from '../typechain-types';
import { deployCreate3 } from '../scripts/deploy/utils';
import { expect } from 'chai';

describe('Deployer', async () => {
  let Deployer: Deployer;
  let signer: SignerWithAddress;
  let signer2: SignerWithAddress;
  let signer3: SignerWithAddress;

  const reset = async () => await network.provider.send('hardhat_reset');

  beforeEach(async () => {
    await reset();
    [signer, signer2, signer3] = await ethers.getSigners();
    Deployer = await new Deployer__factory(signer).deploy();
  });

  it('Should deploy contract successfully', async () => {
    const contractAddress = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer2.address, signer3.address],
      'SampleContract'
    );
    expect(contractAddress).to.not.be.null;
    const contract = SampleContract__factory.connect(contractAddress, signer);
    expect(await contract.getCCMPExecutor()).to.equal(signer2.address);
    expect(await contract.getHyphenLiquidityPool()).to.equal(signer3.address);
  });

  it('Deployment Address Should not depend upon constructor arguments', async () => {
    expect(signer2.address).to.not.equal(signer3.address);
    const contractAddress = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer2.address, signer3.address],
      'SampleContract'
    );
    expect(contractAddress).to.not.be.null;

    await reset();

    const NewDeployer = await new Deployer__factory(signer).deploy();
    expect(NewDeployer.address).to.equal(Deployer.address);
    const contractAddressAfterReset = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer3.address, signer2.address],
      'SampleContract'
    );
    expect(contractAddressAfterReset).to.not.be.null;
    expect(contractAddressAfterReset).to.equal(contractAddress);
  });

  it('Deployment Address Should not depend upon signer nonce', async () => {
    expect(signer2.address).to.not.equal(signer3.address);
    const contractAddress = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer2.address, signer3.address],
      'SampleContract'
    );
    expect(contractAddress).to.not.be.null;

    await reset();

    const NewDeployer = await new Deployer__factory(signer).deploy();
    expect(NewDeployer.address).to.equal(Deployer.address);

    await signer.sendTransaction({ to: signer2.address, value: 1 });
    await signer.sendTransaction({ to: signer2.address, value: 1 });
    await signer.sendTransaction({ to: signer2.address, value: 1 });
    await signer.sendTransaction({ to: signer2.address, value: 1 });

    const contractAddressAfterReset = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer3.address, signer2.address],
      'SampleContract'
    );
    expect(contractAddressAfterReset).to.not.be.null;
    expect(contractAddressAfterReset).to.equal(contractAddress);
  });

  it('Deployment Address Should depend upon salt', async () => {
    expect(signer2.address).to.not.equal(signer3.address);
    const contractAddress = await deployCreate3(
      Deployer.address,
      'SampleContract',
      new SampleContract__factory(signer),
      [signer2.address, signer3.address],
      'SampleContract'
    );
    expect(contractAddress).to.not.be.null;

    await reset();

    const NewDeployer = await new Deployer__factory(signer).deploy();
    expect(NewDeployer.address).to.equal(Deployer.address);
    const contractAddressAfterReset = await deployCreate3(
      Deployer.address,
      'SampleContract2',
      new SampleContract__factory(signer),
      [signer2.address, signer3.address],
      'SampleContract'
    );
    expect(contractAddressAfterReset).to.not.be.null;
    expect(contractAddressAfterReset).to.not.equal(contractAddress);
  });
});
