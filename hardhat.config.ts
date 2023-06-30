import * as dotenv from 'dotenv'

import { HardhatUserConfig } from 'hardhat/config'
import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-waffle'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'hardhat-gas-reporter'
import 'solidity-coverage'

import './tasks/accounts'

dotenv.config()

const HARDHAT_NETWORK_CONFIG = {
  chainId: 1337,
  forking: {
    url: process.env.MAINNET_URL || '',
    blockNumber: 17593000,
  },
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    // mainnet: {
    //   url: process.env.MAINNET_URL || '',
    //   accounts:
    //     process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    // },
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
}

export default config
