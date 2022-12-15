import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import {
  ERC20Token,
  UniswapAdaptor,
  MockSwapRouter
  // eslint-disable-next-line node/no-missing-import
} from "../typechain";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
let { getLocaleString } = require("./utils");

describe("AdaptorTests", function () {
    let owner: SignerWithAddress, pauser: SignerWithAddress, bob: SignerWithAddress;
    let charlie: SignerWithAddress, tf: SignerWithAddress, executor: SignerWithAddress;
    let token: ERC20Token, token2: ERC20Token;
    let uniswapManager: UniswapAdaptor;
    let mockswapManager: MockSwapRouter;
    
    const minTokenCap = getLocaleString(10 * 1e18);
    const NATIVE = "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE";
    const NATIVE_WRAP_ADDRESS = "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6";
    const swapRequestFixedOutput = [{
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "20000000000000000",
      operation: 0,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    }];
      
    const swapRequestFixedInput = [{
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "20000000000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    }];

    const gasAndSwapRequest = [{
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "200000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    },
      {
        tokenAddress: "0x64Ef393b6846114Bad71E2cB2ccc3e10736b5716", 
        percentage: "0", 
        amount: "20000000000000000000",
        operation: 1,
        path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    }];

    const invalidSwapRequest = [{
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "20000000000000000000",
      operation: 3,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    }];
  
    const swapNexitRequestThree = [{
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "20000000000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    },
    {
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "200000000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    },
    {
      tokenAddress: NATIVE, 
      percentage: "0", 
      amount: "2000000000",
      operation: 1,
      path: "0x64ef393b6846114bad71e2cb2ccc3e10736b5716000bb8b4fbf271143f4fbf7b91a5ded31805e42b2208d6"
    }];  
  
    beforeEach(async function () {
      [owner, pauser, charlie, bob, tf, executor] = await ethers.getSigners();
  
      const mockRouterFactory = await ethers.getContractFactory("MockSwapRouter");
      mockswapManager = await mockRouterFactory.deploy();
      await mockswapManager.deployed();

      const uniswapAdaptorFactory = await ethers.getContractFactory("UniswapAdaptor");
      uniswapManager = await uniswapAdaptorFactory.deploy(mockswapManager.address, NATIVE_WRAP_ADDRESS);
      await uniswapManager.deployed();

      const erc20factory = await ethers.getContractFactory("ERC20Token");
      token = (await upgrades.deployProxy(erc20factory, ["USDT", "USDT", 18])) as ERC20Token;
      token2 = (await upgrades.deployProxy(erc20factory, ["USDC", "USDC", 6])) as ERC20Token;

      for (const signer of [owner, bob, charlie]) {
        await token.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
        await token2.mint(signer.address, ethers.BigNumber.from(100000000).mul(ethers.BigNumber.from(10).pow(18)));
      }
    });

    async function getReceiverAddress() {
        return bob.getAddress();
    }

    it("Should Process GasToken swap & return remaining funds succefully", async function () {
      await token.approve(uniswapManager.address, minTokenCap);
      
      await uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(), swapRequestFixedOutput);
      let allowanceAfterSwap = await token.allowance(owner.address, uniswapManager.address);

      expect(allowanceAfterSwap).equal(0); // allowance should be zero after swap
      expect(await ethers.provider.getBalance(uniswapManager.address)).to.equal(0); // uniswap manager should have zero balance
    });

    it("Should swap for GasToken & swap remaining funds desired token successfully", async function () {
      await token.approve(uniswapManager.address, minTokenCap);

      await uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(), gasAndSwapRequest);
      let allowanceAfterSwap = await token.allowance(owner.address, uniswapManager.address);

      expect(allowanceAfterSwap).equal(0); // allowance should be zero after swap
      expect(await ethers.provider.getBalance(uniswapManager.address)).to.equal(0); // uniswap manager should have zero balance
    });

    it("Should call fixedInput method of swapRouter succefully", async function () {
      await token.approve(uniswapManager.address, minTokenCap);

      await uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(), swapRequestFixedInput);
      let allowanceAfterSwap = await token.allowance(owner.address, uniswapManager.address);

      expect(allowanceAfterSwap).equal(0); // allowance should be zero after swap
      expect(await ethers.provider.getBalance(uniswapManager.address)).to.equal(0); // uniswap manager should have zero balance
    });

    it("Should Fail if TokenIn is NATIVE", async function () {
      await token.approve(uniswapManager.address, minTokenCap);
      await expect(uniswapManager.swap(NATIVE, minTokenCap, await getReceiverAddress(),swapRequestFixedOutput)).to.be.revertedWith("wrong function");
    });

    it("Should Fail if TokenIn is NATIVE", async function () {
        await token.approve(uniswapManager.address, minTokenCap);
        await expect(uniswapManager.swap(NATIVE, minTokenCap, await getReceiverAddress(),swapRequestFixedOutput)).to.be.revertedWith("wrong function");
   });

    it("Should Fail swap Array > 3", async function () {
      await token.approve(uniswapManager.address, minTokenCap);
      await expect(uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(), swapNexitRequestThree))
      .to.be.revertedWith("too many swap requests");
    });

    it("Should Fail swapNative Array > 1", async function () {
      await token.approve(uniswapManager.address, minTokenCap);

      await expect(uniswapManager.swapNative(minTokenCap, await getReceiverAddress(), swapNexitRequestThree))
      .to.be.revertedWith("only 1 swap request allowed");
    });

    it("Should revert if apporval is not given", async function () {
      await expect(uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(),swapRequestFixedInput)).to.be
      .revertedWith("VM Exception while processing transaction: reverted with reason string 'STF'");
    });

    it("Should not hold any funds in case of failure", async function () {

        let mockRouterFailFactory = await ethers.getContractFactory("MockSwapRouterFail");
        let mockswapFailManager = await mockRouterFailFactory.deploy();
        await mockswapFailManager.deployed();

        const uniswapAdaptorFactory = await ethers.getContractFactory("UniswapAdaptor");
        uniswapManager = await uniswapAdaptorFactory.deploy(mockswapFailManager.address, NATIVE_WRAP_ADDRESS);
        await uniswapManager.deployed();

        await token.approve(uniswapManager.address, minTokenCap);
        await expect(uniswapManager.swap(token.address, minTokenCap, await getReceiverAddress(),swapRequestFixedInput)).to.be
        .reverted;
        expect(await ethers.provider.getBalance(uniswapManager.address)).to.equal(0); // uniswap manager should have zero balance
    });
});