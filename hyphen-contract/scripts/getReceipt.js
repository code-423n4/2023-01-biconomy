const {ethers} = require("ethers");

const getReciept = async () => {
    let receipt;
    let hash = "0x212f5ef54bb4899e9b3fb3fb8bbe61990f9ccbaa89aaaa31b90444d6a31af766";
    let toChainRpcUrlProvider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.g.alchemy.com/v2/WiqjrNTGTMzyY83J4jiTg1XGTw2tBNxk");
    try {
        receipt = await toChainRpcUrlProvider.getTransactionReceipt(hash);
    } catch (e) {
        throw new Error('Cannot get transaction');
    }

    if (!receipt.logs) throw new Error('No error logs');

    let lpManagerInterface = new ethers.utils.Interface(lpmanagerABI);

    let tokenReceipt = receipt.logs.find(
        receiptLog => receiptLog.topics[0] === "0x6bfd5ee5792d66b151a3fab9f56ee828a0f1c3216d4b752e267cd5590326b15c",
    );
    try {
        if (!tokenReceipt) {
        throw new Error('No valid receipt log data');
        }
        const data = lpManagerInterface.parseLog(tokenReceipt);
        // console.log(data);
        if (!data.args.lpFee) throw new Error('Invalid log data');

        let lpFee = data.args.lpFee;
        console.log(`LP FEE ${ethers.utils.formatUnits(lpFee.toString(), 18)}`);
        console.log(`Transfer FEE ${ethers.utils.formatUnits(data.args.transferFee.toString(), 18)}`);
        console.log(`Gas FEE ${ethers.utils.formatUnits(data.args.gasFee.toString(), 18)}`);
        // let processedAmount = ethers.utils.formatUnits(
        // amount,
        // 18,
        // );
        // processedAmount = toFixed(
        // processedAmount,
        // 3,
        // );
        // return processedAmount;
    } catch (error) {
        console.log(error);
        throw new Error('Error while filtering and parsing logs');
    }
}

const getDeposit = async () => {
    let receipt;
    let hash = "0xb0a904cdb41d6c2dacb18ff4e78d7005a67be534dade259745aa596783231b98";
    let toChainRpcUrlProvider = new ethers.providers.JsonRpcProvider("https://polygon-mainnet.g.alchemy.com/v2/WiqjrNTGTMzyY83J4jiTg1XGTw2tBNxk");
    try {
        receipt = await toChainRpcUrlProvider.getTransactionReceipt(hash);
    } catch (e) {
        throw new Error('Cannot get transaction');
    }

    if (!receipt.logs) throw new Error('No error logs');

    let lpManagerInterface = new ethers.utils.Interface(lpmanagerABI);

    let tokenReceipt = receipt.logs.find(
        receiptLog => receiptLog.topics[0] === "0x522e11fa05593b306c8df10d2b0b8e01eec48f9d0a9427a7a93f21ff90d66fb1",
    );
    try {
        if (!tokenReceipt) {
        throw new Error('No valid receipt log data');
        }
        const data = lpManagerInterface.parseLog(tokenReceipt);
        // console.log(data);
        if (!data.args.reward) throw new Error('Invalid log data');

        let reward = data.args.reward;
        console.log(`REWARD AMOUNT: ${ethers.utils.formatUnits(reward.toString(), 18)}`)
        // console.log(`LP FEE ${ethers.utils.formatUnits(lpFee.toString(), 18)}`);
        // console.log(`Transfer FEE ${ethers.utils.formatUnits(data.args.transferFee.toString(), 18)}`);
        // console.log(`Gas FEE ${ethers.utils.formatUnits(data.args.gasFee.toString(), 18)}`);
        // let processedAmount = ethers.utils.formatUnits(
        // amount,
        // 18,
        // );
        // processedAmount = toFixed(
        // processedAmount,
        // 3,
        // );
        // return processedAmount;
    } catch (error) {
        console.log(error);
        throw new Error('Error while filtering and parsing logs');
    }
}

const toFixed = (num, fixed) => {
    let numParts = num.split(".");
  
    if (numParts.length === 1) {
      return numParts[0];
    } else {
      return `${numParts[0]}.${numParts[1].substring(0, fixed)}`;
    }
  }

const lpmanagerABI = [
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "asset",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "transferredAmount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address",
          "name": "target",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bytes",
          "name": "depositHash",
          "type": "bytes"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "fromChainId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "lpFee",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "transferFee",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "gasFee",
          "type": "uint256"
        }
      ],
      "name": "AssetSent",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "toChainId",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "reward",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "Deposit",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "name": "EthReceived",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "owner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "GasFeeWithdraw",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "liquidityProvidersAddress",
          "type": "address"
        }
      ],
      "name": "LiquidityProvidersChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Paused",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousPauser",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newPauser",
          "type": "address"
        }
      ],
      "name": "PauserChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "from",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "Received",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "tokenManagerAddress",
          "type": "address"
        }
      ],
      "name": "TokenManagerChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "forwarderAddress",
          "type": "address"
        }
      ],
      "name": "TrustedForwarderChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "Unpaused",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "baseGas",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newPauser",
          "type": "address"
        }
      ],
      "name": "changePauser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "depositHash",
          "type": "bytes"
        }
      ],
      "name": "checkHashStatus",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "hashSendTransaction",
          "type": "bytes32"
        },
        {
          "internalType": "bool",
          "name": "status",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "toChainId",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "depositErc20",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "toChainId",
          "type": "uint256"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "depositNative",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "gasFeeAccumulated",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "gasFeeAccumulatedByToken",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "getCurrentLiquidity",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "currentLiquidity",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getExecutorManager",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "getRewardAmount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "rewardAmount",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "name": "getTransferFee",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "name": "incentivePool",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_executorManagerAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_pauser",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_trustedForwarder",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_tokenManager",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_liquidityProviders",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "pauser",
          "type": "address"
        }
      ],
      "name": "isPauser",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "forwarder",
          "type": "address"
        }
      ],
      "name": "isTrustedForwarder",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "liquidityProviders",
      "outputs": [
        {
          "internalType": "contract ILiquidityProviders",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "paused",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "toChainId",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "expiry",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "allowed",
              "type": "bool"
            },
            {
              "internalType": "uint8",
              "name": "v",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "r",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "internalType": "struct LiquidityPool.PermitRequest",
          "name": "permitOptions",
          "type": "tuple"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "permitAndDepositErc20",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "toChainId",
          "type": "uint256"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "nonce",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "expiry",
              "type": "uint256"
            },
            {
              "internalType": "bool",
              "name": "allowed",
              "type": "bool"
            },
            {
              "internalType": "uint8",
              "name": "v",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "r",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "s",
              "type": "bytes32"
            }
          ],
          "internalType": "struct LiquidityPool.PermitRequest",
          "name": "permitOptions",
          "type": "tuple"
        },
        {
          "internalType": "string",
          "name": "tag",
          "type": "string"
        }
      ],
      "name": "permitEIP2612AndDepositErc20",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "name": "processedHash",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renouncePauser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        },
        {
          "internalType": "address payable",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "depositHash",
          "type": "bytes"
        },
        {
          "internalType": "uint256",
          "name": "tokenGasPrice",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "fromChainId",
          "type": "uint256"
        }
      ],
      "name": "sendFundsToUser",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "uint128",
          "name": "gas",
          "type": "uint128"
        }
      ],
      "name": "setBaseGas",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_executorManagerAddress",
          "type": "address"
        }
      ],
      "name": "setExecutorManager",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_liquidityProviders",
          "type": "address"
        }
      ],
      "name": "setLiquidityProviders",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenManager",
          "type": "address"
        }
      ],
      "name": "setTokenManager",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "trustedForwarder",
          "type": "address"
        }
      ],
      "name": "setTrustedForwarder",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "tokenManager",
      "outputs": [
        {
          "internalType": "contract ITokenManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_tokenAddress",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "receiver",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_tokenAmount",
          "type": "uint256"
        }
      ],
      "name": "transfer",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "unpause",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "tokenAddress",
          "type": "address"
        }
      ],
      "name": "withdrawErc20GasFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "withdrawNativeGasFee",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ]
// getReciept();
getDeposit();