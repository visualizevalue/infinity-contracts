import * as dotenv from "dotenv";

import "@nomicfoundation/hardhat-toolbox";
import "hardhat-contract-sizer";
import "hardhat-deploy";

import { type HardhatUserConfig } from "hardhat/config";
import { type HardhatNetworkUserConfig } from "hardhat/types";

import "./tasks/refunds";

dotenv.config();

const HARDHAT_NETWORK_CONFIG: HardhatNetworkUserConfig = {
  chainId: 1337,
  forking: {
    enabled: !!process.env.MAINNET_URL,
    url: process.env.MAINNET_URL || "",
    blockNumber: 17593000,
  },
  allowUnlimitedContractSize: true,
  autoImpersonate: true,
};

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
      metadata: {
        bytecodeHash: "none",
      },
      viaIR: true,
    },
  },
  namedAccounts: {
    deployer: {
      default: 0, // first account as deployer
    },
  },
  networks: {
    mainnet: {
      url: process.env.MAINNET_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: process.env.GOERLI_URL || "",
      accounts: process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    localhost: {
      ...HARDHAT_NETWORK_CONFIG,
    },
    hardhat: HARDHAT_NETWORK_CONFIG,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    currency: "USD",
    excludeContracts: [
      "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol:ERC721Upgradeable",
    ],
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  mocha: {
    timeout: 0,
  },
};

export default config;
