import { upgradeLiquidityPool } from "./upgrade";
import { verifyImplementation } from "../deploy/deploy-utils";
import { ethers } from "hardhat";

(async () => {
  const proxy = process.env.PROXY || "0x8033Bd14c4C114C14C910fe05Ff13DB4C481a85D";
  const [signer] = await ethers.getSigners();

  console.log("Proxy: ", proxy, " Deployer: ", signer.address);
  console.log("Upgrading Proxy...");
  await upgradeLiquidityPool(proxy);
  await new Promise((resolve) => setTimeout(resolve, 5000));
  await verifyImplementation(proxy);
})();
