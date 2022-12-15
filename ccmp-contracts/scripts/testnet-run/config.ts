import type { ChainName } from "@certusone/wormhole-sdk";
import { ethers } from "hardhat";
import { ICCMPGateway__factory, ERC20Token__factory } from "../../typechain-types";

export const contracts = {
  80001: {
    CCMPExecutor: "0xAe4D41d1105896FC976e19681A42d3057Ee6c528",
    AxelarAdaptor: "0x2BFA42C7359E789b2A78612B79510d09660B2E16",
    WormholeAdaptor: "0x428D93d5042bC2efda4f5402f55E5B7f0B8e3Ce8",
    AbacusAdaptor: "0xBB5D00aF8A3B275Cb1f59950A0fF62a099a91810",
    Diamond: "0x5dB92fdAC16d027A3Fef6f438540B5818b6f66D5",
    sampleContract: "0x9B9A1bE28bB12C78f0D02400D8755591Cd517739",

    wormholeBridgeAddress: "0x0CBE91CF822c73C2315FB05100C2F714765d5c20",
    emitterChain: "polygon" as ChainName,

    hyphen: "0xb831F0848A055b146a0b13D54cfFa6C1FE201b83",
    token: "0xeaBc4b91d9375796AA4F69cC764A4aB509080A58",
    lpToken: "0x48E2577e5f781CBb3374912a31b1aa39c9E11d39",
    liquidityProviders: "0xFD210117F5b9d98Eb710295E30FFF77dF2d80002",
    liquidityFarming: "0xf97859fb869329933b40F36A86E7e44f334Ed16a",
    decimals: 18,

    batchHelper: "0xa759C8Db00DadBE0599E3a38B19B5C0E12e43BBe",
  },
  43113: {
    CCMPExecutor: "0x320D8cfCA5d07FB88230626b12672708511B23D9",
    AxelarAdaptor: "0x2aC78FF75EC3E1349fcC2d2ea30cf56318f93f25",
    WormholeAdaptor: "0x8C6ed76011b7d5ddcf8dA88687C4B5A7a4b79165",
    AbacusAdaptor: "0xFb41e96053608669d3B2D976577237684C71df11",
    Diamond: "0x53B309Ff259e568309A19810E3bF1647B6922afd",
    sampleContract: "0xb145AF113BFa7bfe91E11F951d88d00B9127BBC9",

    wormholeBridgeAddress: "0x7bbcE28e64B3F8b84d876Ab298393c38ad7aac4C",
    emitterChain: "avalanche" as ChainName,

    hyphen: "0x07d2d1690D13f5fD9F9D51a96CEe211F6a845AC5",
    token: "0xC74dB45a7D3416249763c151c6324Ceb6B3217fd",
    decimals: 6,
  },
};

export const chains = {
  4002: {
    url: process.env.FANTOM_TESTNET_URL!,
  },
  97: {
    url: process.env.BSC_TESTNET_URL!,
  },
  80001: {
    url: process.env.MUMBAI_URL!,
  },
  43113: {
    url: process.env.FUJI_URL,
  },
};

export const toChainId = 80001;
export const fromChainId = 43113;

export const fromContracts = contracts[fromChainId];
export const toContracts = contracts[toChainId];

export const fromChain = chains[fromChainId];
export const toChain = chains[toChainId];

export const sourceGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(fromContracts.Diamond, wallet);
  return gateway;
};

export const exitGateway = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const gateway = ICCMPGateway__factory.connect(toContracts.Diamond, wallet);
  return gateway;
};

export const exitBatchHelper = () => {
  const provider = new ethers.providers.JsonRpcProvider(toChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const exitBatchHelper = new ethers.Contract(toContracts.batchHelper, batchHelperAbi, wallet);
  return exitBatchHelper;
};

export const sourceHyphen = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const hyphen = new ethers.Contract(fromContracts.hyphen, hyphenAbi, wallet);
  return hyphen;
};

export const sourceToken = () => {
  const provider = new ethers.providers.JsonRpcProvider(fromChain.url);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
  const token = ERC20Token__factory.connect(fromContracts.token, wallet);
  return token;
};

export const hyphenAbi = JSON.parse(
  `[{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"bytes","name":"depositHash","type":"bytes"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gasFee","type":"uint256"}],"name":"AssetSent","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"asset","type":"address"},{"indexed":true,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":true,"internalType":"uint256","name":"transferredAmount","type":"uint256"},{"indexed":false,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"uint256","name":"fromChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"lpFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"transferFee","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"gasFee","type":"uint256"}],"name":"AssetSentFromCCMP","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"Deposit","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"}],"name":"DepositAndCall","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"tokenAddress","type":"address"},{"indexed":true,"internalType":"address","name":"receiver","type":"address"},{"indexed":false,"internalType":"uint256","name":"toChainId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"reward","type":"uint256"},{"indexed":false,"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"indexed":false,"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"}],"name":"DepositAndSwap","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Paused","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousPauser","type":"address"},{"indexed":true,"internalType":"address","name":"newPauser","type":"address"}],"name":"PauserChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"_tf","type":"address"}],"name":"TrustedForwarderChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"account","type":"address"}],"name":"Unpaused","type":"event"},{"inputs":[],"name":"baseGas","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ccmpExecutor","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"ccmpGateway","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"","type":"uint256"}],"name":"chainIdToLiquidityPoolAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newPauser","type":"address"}],"name":"changePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"}],"name":"checkHashStatus","outputs":[{"internalType":"bytes32","name":"hashSendTransaction","type":"bytes32"},{"internalType":"bool","name":"status","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"to","type":"address"},{"internalType":"bytes","name":"_calldata","type":"bytes"}],"internalType":"struct ICCMPGateway.CCMPMessagePayload[]","name":"payloads","type":"tuple[]"},{"components":[{"internalType":"address","name":"feeTokenAddress","type":"address"},{"internalType":"uint256","name":"feeAmount","type":"uint256"},{"internalType":"address","name":"relayer","type":"address"}],"internalType":"struct ICCMPGateway.GasFeePaymentArgs","name":"gasFeePaymentArgs","type":"tuple"},{"internalType":"string","name":"adaptorName","type":"string"},{"internalType":"bytes","name":"routerArgs","type":"bytes"},{"internalType":"bytes[]","name":"hyphenArgs","type":"bytes[]"}],"internalType":"struct LiquidityPool.DepositAndCallArgs","name":"args","type":"tuple"}],"name":"depositAndCall","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositAndSwapErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositErc20","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"}],"name":"depositNative","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"toChainId","type":"uint256"},{"internalType":"string","name":"tag","type":"string"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequest","type":"tuple[]"}],"name":"depositNativeAndSwap","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"},{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulated","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"gasFeeAccumulatedByToken","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getCurrentLiquidity","outputs":[{"internalType":"uint256","name":"currentLiquidity","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getExecutorManager","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"getRewardAmount","outputs":[{"internalType":"uint256","name":"rewardAmount","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"getTransferFee","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"","type":"address"}],"name":"incentivePool","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"},{"internalType":"address","name":"_pauser","type":"address"},{"internalType":"address","name":"_trustedForwarder","type":"address"},{"internalType":"address","name":"_tokenManager","type":"address"},{"internalType":"address","name":"_liquidityProviders","type":"address"}],"name":"initialize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"pauser","type":"address"}],"name":"isPauser","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"forwarder","type":"address"}],"name":"isTrustedForwarder","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"liquidityProviders","outputs":[{"internalType":"contract ILiquidityProviders","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"pause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"paused","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"name":"processedHash","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"renouncePauser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"components":[{"internalType":"uint256","name":"tokenSymbol","type":"uint256"},{"internalType":"uint256","name":"sourceChainAmount","type":"uint256"},{"internalType":"uint256","name":"sourceChainDecimals","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes[]","name":"hyphenArgs","type":"bytes[]"}],"internalType":"struct LiquidityPool.SendFundsToUserFromCCMPArgs","name":"args","type":"tuple"}],"name":"sendFundsToUserFromCCMP","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"}],"name":"sendFundsToUserV2","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_newCCMPExecutor","type":"address"},{"internalType":"address","name":"_newCCMPGateway","type":"address"}],"name":"setCCMPContracts","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"_executorManagerAddress","type":"address"}],"name":"setExecutorManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256[]","name":"chainId","type":"uint256[]"},{"internalType":"address[]","name":"liquidityPoolAddress","type":"address[]"}],"name":"setLiquidityPoolAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"address","name":"_swapAdaptor","type":"address"}],"name":"setSwapAdaptor","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"","type":"string"}],"name":"swapAdaptorMap","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"address payable","name":"receiver","type":"address"},{"internalType":"bytes","name":"depositHash","type":"bytes"},{"internalType":"uint256","name":"nativeTokenPriceInTransferredToken","type":"uint256"},{"internalType":"uint256","name":"tokenGasBaseFee","type":"uint256"},{"internalType":"uint256","name":"fromChainId","type":"uint256"},{"internalType":"uint256","name":"swapGasOverhead","type":"uint256"},{"components":[{"internalType":"address","name":"tokenAddress","type":"address"},{"internalType":"uint256","name":"percentage","type":"uint256"},{"internalType":"uint256","name":"amount","type":"uint256"},{"internalType":"enum SwapOperation","name":"operation","type":"uint8"},{"internalType":"bytes","name":"path","type":"bytes"}],"internalType":"struct SwapRequest[]","name":"swapRequests","type":"tuple[]"},{"internalType":"string","name":"swapAdaptor","type":"string"}],"name":"swapAndSendFundsToUser","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"tokenManager","outputs":[{"internalType":"contract ITokenManager","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"_tokenAddress","type":"address"},{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"_tokenAmount","type":"uint256"}],"name":"transfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"unpause","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"tokenAddress","type":"address"}],"name":"withdrawErc20GasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"withdrawNativeGasFee","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}]`
);
export const batchHelperAbi = JSON.parse(
  `[{"inputs":[{"internalType":"contract IERC20","name":"token","type":"address"},{"internalType":"contract ILPToken","name":"lpToken","type":"address"},{"internalType":"contract ILiquidityProviders","name":"liquidityProviders","type":"address"},{"internalType":"contract IHyphenLiquidityFarmingV2","name":"farming","type":"address"},{"internalType":"address","name":"receiver","type":"address"}],"name":"execute","outputs":[],"stateMutability":"nonpayable","type":"function"}]`
);
