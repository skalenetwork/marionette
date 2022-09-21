import { HardhatUserConfig, subtask } from "hardhat/config";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@nomicfoundation/hardhat-chai-matchers";
import "@typechain/hardhat";
import "solidity-coverage";
import { utils, Wallet } from "ethers";
import { HardhatNetworkAccountUserConfig } from "hardhat/types/config";
import path from "path";
import { TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS } from "hardhat/builtin-tasks/task-names";

function getAccounts() {
  const accounts: HardhatNetworkAccountUserConfig[] = [];
  const defaultBalance = utils.parseEther("2000000").toString();

  const n = 10;
  for (let i = 0; i < n; ++i) {
    accounts.push({
      privateKey: Wallet.createRandom().privateKey,
      balance: defaultBalance
    })
  }

  return accounts;
}

function getCustomUrl(url: string | undefined) {
  if (url) {
    return url;
  } else {
    return "http://127.0.0.1:8545"
  }
}

function getCustomPrivateKey(privateKey: string | undefined) {
  if (privateKey) {
    return [privateKey];
  } else {
    return [];
  }
}

function getGasPrice(gasPrice: string | undefined) {
  if (gasPrice) {
    return parseInt(gasPrice, 10);
  } else {
    return "auto";
  }
}

subtask(
  TASK_COMPILE_SOLIDITY_GET_SOURCE_PATHS,
  async (_, { config }, runSuper) => {
    const paths = await runSuper() as Array<string>;

    return paths
      .filter((solidityFilePath: string) => {
        const relativePath = path.relative(config.paths.sources, solidityFilePath)

        return relativePath !== "test/MarionetteOld.sol";
      })
  }
);

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  solidity: {
    version: '0.8.11',
    settings: {
      optimizer:{
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      accounts: getAccounts(),
      blockGasLimit: 12000000
    },
    custom: {
      url: getCustomUrl(process.env.ENDPOINT),
      accounts: getCustomPrivateKey(process.env.PRIVATE_KEY),
      gasPrice: getGasPrice(process.env.GASPRICE)
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN
  }
};

export default config;
