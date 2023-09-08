import * as dotenv from 'dotenv'

import "@nomicfoundation/hardhat-toolbox"
import "hardhat-contract-sizer"
import 'hardhat-deploy'

import './tasks/refunds'
import './tasks/airdrop'
import './tasks/find-seed'

dotenv.config()

const HARDHAT_NETWORK_CONFIG = {
  chainId: 1337,
  forking: {
    url: process.env.MAINNET_URL || '',
    blockNumber: 17593000,
  },
  allowUnlimitedContractSize: true,
}

const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // first account as deployer
    },
    vv: {
      default: '0xc8f8e2F59Dd95fF67c3d39109ecA2e2A017D4c8a'
    },
  },
  networks: {
    mainnet: {
      url: process.env.MAINNET_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_URL || '',
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    localhost: {
      ...HARDHAT_NETWORK_CONFIG,
    },
    hardhat: HARDHAT_NETWORK_CONFIG,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: 'USD',
    excludeContracts: [
      '@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol:ERC721Upgradeable',
    ]
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 120_000_000,
  },
}

export default config
