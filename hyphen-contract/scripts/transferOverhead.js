let { BigNumber, ethers } = require("ethers");

// This amount should be get from exit transaction parameters including reward amount
let sentAmountDecimal = "101.319533";
let receivedAmountDecimal = "101.105734";
let differenceInAmount = sentAmountDecimal - receivedAmountDecimal;

// Set the transfer Fee percentrage deducted in this transaction. Can be fetched from db or exit transaction logs on explorer.
let transferFeePerc = 0.045
let transferFee = sentAmountDecimal * transferFeePerc / 100;

let expectedExecutorFeeInToken = differenceInAmount - transferFee;

// If token is USDC, then what is the price of native token in USDC?
let nativeTokenPriceInToken = 27.78;

let expectedExecutorFeeInNative = expectedExecutorFeeInToken / nativeTokenPriceInToken;
let gasFeeDeductedOnChain =  ethers.utils.parseUnits(expectedExecutorFeeInNative.toString(), "18");

// Set the gas fee used by the executor. Can be fetched from explorer
let actualGasFeeByExecutor = ethers.utils.parseUnits("0.006039", "18");
let gasUnaccountedFor = BigNumber.from(actualGasFeeByExecutor).sub(gasFeeDeductedOnChain);

// Final gas price of the trasnaction. Can be fetched from the explorer
let gasPrice = ethers.utils.parseUnits("0.0000000275","18");

let transferOverhead = gasUnaccountedFor.div(gasPrice);

console.log(transferOverhead.toString());