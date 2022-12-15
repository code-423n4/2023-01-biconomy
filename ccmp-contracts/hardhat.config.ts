import * as dotenv from 'dotenv';

import hardhat from 'hardhat';
import { HardhatUserConfig } from 'hardhat/config';
import '@nomicfoundation/hardhat-toolbox';
import 'solidity-coverage';
import 'hardhat-gas-reporter';
import '@openzeppelin/hardhat-upgrades';
import 'hardhat-contract-sizer';

dotenv.config();

const disableViaIr = !!process.env.DISABLE_VIA_IR;

if (!disableViaIr) {
  console.log(`Via-ir enabled for compilation`);
} else {
  console.log(`Via-ir disabled for compilation`);
}

const config: HardhatUserConfig = {
  mocha: {
    timeout: 500000,
  },
  solidity: {
    compilers: [
      {
        version: '0.8.2',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
          optimizer: {
            enabled: true,
            runs: 2000,
          },
          viaIR: !disableViaIr,
        },
      },
      {
        version: '0.8.16',
        settings: {
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
          optimizer: {
            enabled: true,
            runs: 2000,
          },
          viaIR: !disableViaIr,
        },
      },
    ],
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: false,
      gas: 6000000,
      // forking: {
      //   url: `https://mainnet.infura.io/v3/${process.env.INFURA_KEY}`,
      // },
    },
    ropsten: {
      url: process.env.ROPSTEN_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    rinkeby: {
      url: process.env.RINKEBY_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygonMumbai: {
      url: process.env.MUMBAI_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    fuji: {
      url: process.env.FUJI_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: process.env.POLYGON_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bscTestnet: {
      url: process.env.BSC_TESTNET_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
    bsc: {
      url: process.env.BSC_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 10000000000,
    },
    avalanche: {
      url: process.env.AVALANCHE_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 70000000000,
    },
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 50000000000,
    },
    arbitrumOne: {
      url: process.env.ARBITRUM_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 1000000,
    },
    arbitrumTestnet: {
      url: process.env.ARBITRUM_RINKEBY_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gas: 250000000,
    },
    fantom: {
      url: process.env.FANTOM_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 4000000000,
    },
    fantomTestnet: {
      url: process.env.FANTOM_TESTNET_URL || '',
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      gasPrice: 2000000000,
    },
  },
  gasReporter: {
    enabled: !!process.env.REPORT_GAS,
    currency: 'USD',
  },
  etherscan: {
    apiKey: {
      goerli: process.env.ETHERSCAN_API_KEY || '',
      polygonMumbai: process.env.POLYGONSCAN_API_KEY || '',
      avalancheFujiTestnet: process.env.SNOWTRACE_API_KEY || '',
      mainnet: process.env.ETHERSCAN_API_KEY || '',
      polygon: process.env.POLYGONSCAN_API_KEY || '',
      avalanche: process.env.SNOWTRACE_API_KEY || '',
      bsc: process.env.BSCSCAN_API_KEY || '',
      bscTestnet: process.env.BSCSCAN_API_KEY || '',
      optimisticEthereum: process.env.OPTIMISM_ETHERSCAN_API_KEY || '',
      optimisticKovan: process.env.OPTIMISM_KOVAN_ETHERSCAN_API_KEY || '',
      arbitrumOne: process.env.ARBITRUM_ETHERSCAN_API_KEY || '',
      arbitrumTestnet: process.env.ARBITRUM_RINKEBY_ETHERSCAN_API_KEY || '',
      opera: process.env.FTMSCAN_API_KEY || '',
      ftmTestnet: process.env.FTMSCAN_API_KEY || '',
    },
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
  },
};
export default config;
