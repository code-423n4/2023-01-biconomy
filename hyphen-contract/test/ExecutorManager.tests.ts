import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import {
  ExecutorManager,
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

describe("ExecutorManagerTests", function () {
  let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
  let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
  let executorManager: ExecutorManager;

  beforeEach(async function () {
    [owner, pauser, charlie, bob, tf, executor] = await ethers.getSigners();

    const executorManagerFactory = await ethers.getContractFactory("ExecutorManager");
    executorManager = await executorManagerFactory.deploy();
    await executorManager.deployed();
  });

  it("Should register executor", async function () {
    await executorManager.addExecutor(executor.address);
    expect(await executorManager.getAllExecutors()).to.deep.equal([executor.address]);
    expect(await executorManager.getExecutorStatus(executor.address)).to.be.true;
  });

  it("Should return false for non executor", async function () {
    expect(await executorManager.getExecutorStatus(executor.address)).to.be.false;
  });

  it("Should be able to add multiple executors", async function () {
    await executorManager.addExecutors([executor.address, bob.address]);
    expect((await executorManager.getAllExecutors()).length).to.equal(2);
    expect(await executorManager.getExecutorStatus(executor.address)).to.be.true;
    expect(await executorManager.getExecutorStatus(bob.address)).to.be.true;
  });

  it("Should be able to remove multiple executors", async function () {
    await executorManager.addExecutors([executor.address, bob.address]);
    await executorManager.removeExecutors([executor.address, bob.address]);
    expect((await executorManager.getAllExecutors()).length).to.equal(0);
    expect(await executorManager.getExecutorStatus(executor.address)).to.be.false;
    expect(await executorManager.getExecutorStatus(bob.address)).to.be.false;
  });
});
