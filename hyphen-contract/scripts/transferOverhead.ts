let { BigNumber, ethers } = require("ethers");

let sentAmount = ethers.utils.parseUnits("2.000174338223706993", "18");
let receivedAmount = ethers.utils.parseUnits("1.999255842125327365", "18");
let gasFeeDeductedOnChain =  ethers.utils.parseUnits("0.000000160412259956", "18");
let actualGasFeeByExecutor = ethers.utils.parseUnits("0.000000256803745", "18");
let gasUnaccountedFor = BigNumber.from(actualGasFeeByExecutor).sub(gasFeeDeductedOnChain);

let gasPrice = ethers.utils.parseUnits(".000000000001358666","18");

let transferOverhead = gasUnaccountedFor.div(gasPrice);

console.log(transferOverhead.toString());