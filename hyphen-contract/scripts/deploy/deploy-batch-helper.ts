import { ethers } from "hardhat";
import { verifyContract } from "./deploy-utils";

(async () => {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  const BatchHelper = await ethers.getContractFactory("BatchHelper");
  const batchHelper = await BatchHelper.deploy();
  await batchHelper.deployed();

  console.log("Batch Helper address:", batchHelper.address);

  await verifyContract(batchHelper.address, []);
})();
