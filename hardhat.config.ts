import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
import { resolve } from "path";

// Load environment variables from .env.local
dotenv.config({ path: resolve(__dirname, ".env.local") });

// Get private key from environment or use a default (for hardhat local development)
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000";

const config: HardhatUserConfig = {
  solidity: "0.8.22",
  networks: {
    // Configuration for Sepolia testnet
    sepolia: {
      url: process.env.NEXT_PUBLIC_RPC_URL || "https://eth-sepolia.g.alchemy.com/v2/DxkZhIv-5PdWbuxadMveZF9VCysJxPlq",
      accounts: [ADMIN_PRIVATE_KEY],
    },
    matic: {
      url: process.env.NEXT_PUBLIC_RPC_URL,
      accounts: [ADMIN_PRIVATE_KEY],
      chainId: 137,
    },
    // Local development network
    hardhat: {
      chainId: 1337,
    },
  },
  paths: {
    artifacts: "./artifacts",
    sources: "./contracts",
    cache: "./cache",
    tests: "./test",
  },
  etherscan: {
    apiKey:  process.env.ETHERSCAN_API_KEY || '',
  }
};

export default config;
