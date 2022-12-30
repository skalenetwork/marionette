import { ethers } from "hardhat";
import chalk from "chalk";
import { SafeImaLegacyMarionetteSubmitter, Upgrader } from "@skalenetwork/upgrade-tools";
import { SkaleABIFile } from "@skalenetwork/upgrade-tools/dist/src/types/SkaleABIFile";
import { promises as fs } from 'fs';

const marionette_address = "0xD2c0DeFACe000000000000000000000000000000";

async function getMarionette() {
    return await ethers.getContractAt("Marionette", marionette_address);
}

class MarionetteUpgrader extends Upgrader {

    getDeployedVersion = async () => {
        return await (await getMarionette()).version();
    };

    setVersion = async (newVersion: string) => {
        const marionette = await getMarionette();
        this.transactions.push({
            to: marionette.address,
            data: marionette.interface.encodeFunctionData("setVersion", [newVersion])
        });
    }
}

async function main() {
    if (!process.env.IMA_ABI) {
        console.log(chalk.red("Set path to ima abi to IMA_ABI environment variable"));
        process.exit(1);
    }
    if (!process.env.SAFE_ADDRESS) {
        console.log(chalk.red("Set Gnosis Safe owner address to SAFE_ADDRESS environment variable"));
        process.exit(1);
    }
    let schainHash;
    if (!process.env.SCHAIN_HASH) {
        if (!process.env.SCHAIN_NAME) {
            console.log(chalk.red("Set schain name to SCHAIN_NAME environment variable"));
            console.log(chalk.red("or schain hash to SCHAIN_HASH environment variable"));
            process.exit(1);
        } else {
            schainHash = ethers.utils.solidityKeccak256(["string"], [process.env.SCHAIN_NAME]);
        }
    } else {
        schainHash = process.env.SCHAIN_HASH;
    }
    let mainnetChainId: number;
    if (!process.env.MAINNET_CHAIN_ID) {
        console.log(chalk.red("Set chainId of mainnet to MAINNET_CHAIN_ID environment variable"));
        console.log(chalk.red("Use 1 for Ethereum mainnet or 5 for Goerli"));
        process.exit(1);
    } else {
        mainnetChainId = Number.parseInt(process.env.MAINNET_CHAIN_ID);
    }

    const imaAbi = JSON.parse(await fs.readFile(process.env.IMA_ABI, "utf-8")) as SkaleABIFile;

    const upgrader = new MarionetteUpgrader(
        "Marionette",
        "1.0.0",
        {
            "marionette_address": marionette_address
        },
        ["Marionette"],
        new SafeImaLegacyMarionetteSubmitter(
            process.env.SAFE_ADDRESS,
            imaAbi,
            schainHash,
            mainnetChainId
        )
    );

    await upgrader.upgrade();
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
