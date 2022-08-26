import { ethers } from "hardhat";
import chalk from "chalk";
import { upgrade, SkaleABIFile, getContractKeyInAbiFile, encodeTransaction } from "@skalenetwork/upgrade-tools"


async function getMarionette(abi: SkaleABIFile) {
    return ((await ethers.getContractFactory("Marionette")).attach(
        abi[getContractKeyInAbiFile("Marionette") + "_address"] as string
    ));
}

export async function getDeployedVersion(abi: SkaleABIFile) {
    const marionette = await getMarionette(abi);
    try {
        return await marionette.version();
    } catch {
        console.log(chalk.red("Can't read deployed version"));
    }
}

export async function setNewVersion(safeTransactions: string[], abi: SkaleABIFile, newVersion: string) {
    const marionette = await getMarionette(abi);
    const encodedSetVersion = marionette.interface.encodeFunctionData("setVersion", [newVersion]);
    safeTransactions.push(encodeTransaction(
        0,
        marionette.address,
        0,
        marionette.interface.encodeFunctionData("execute", [marionette.address, 0, encodedSetVersion]),
    ));
}

async function main() {
    await upgrade(
        "marionette",
        "1.0.0",
        getDeployedVersion,
        setNewVersion,
        [],
        ["Marionette"],
        // async (safeTransactions, abi, contractManager) => {
        async () => {
            // deploy new contracts
        },
        // async (safeTransactions, abi, contractManager) => {
        async () => {
            // initialize
        },
        async (safeMockAddress, abi) => {
            const marionette = await getMarionette(abi);
            const PUPPETEER_ROLE = await marionette.PUPPETEER_ROLE();
            const encodedSetVersion = marionette.interface.encodeFunctionData("grantRole", [PUPPETEER_ROLE, safeMockAddress]);
            await marionette.execute(marionette.address, 0, encodedSetVersion);
        }
    );
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
