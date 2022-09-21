import { ethers } from "hardhat";
import chalk from "chalk";
import hre from "hardhat";
import { SkaleABIFile, getContractKeyInAbiFile, encodeTransaction, concatTransactions, upgrade } from "@skalenetwork/upgrade-tools";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { ProxyAdmin } from "@skalenetwork/upgrade-tools/dist/typechain-types";


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
    safeTransactions.push(encodeTransaction(
        0,
        marionette.address,
        0,
        marionette.interface.encodeFunctionData("setVersion", [newVersion])
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
        async (safeTransactions, abi, _, safeMockAddress) => {
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const marionette = await getMarionette(abi);
            const schainName = process.env.SKALE_CHAIN_NAME;
            const messageProxyForMainnetAddress = process.env.MESSAGE_PROXY_FOR_MAINNET_ADDRESS;

            if (!schainName) {
                console.log(chalk.red("Set SKALE chain name to environment"));
                return;
            }
            if (!messageProxyForMainnetAddress) {
                console.log(chalk.red("Set address of MessageProxyForMainnet to environment"));
                return;
            }

            // transfer ownership of the ProxyAdmin back to SafeMock
            if (safeMockAddress !== undefined) {
                safeTransactions.push(encodeTransaction(
                    0,
                    proxyAdmin.address,
                    0,
                    proxyAdmin.interface.encodeFunctionData("transferOwnership", [safeMockAddress])
                ));
            }
 
            const multiSendFactory = await ethers.getContractFactory("MultiSend");
            const multiSend = await multiSendFactory.deploy();
            await multiSend.deployTransaction.wait();
            const schainHash = ethers.utils.solidityKeccak256(["string"], [schainName]);
            const encodedData = (await ethers.getContractFactory("ImaMock")).interface.encodeFunctionData(
                "postOutgoingMessage",
                [
                    schainHash,
                    marionette.address,
                    ethers.utils.defaultAbiCoder.encode(["address", "uint", "bytes"], [
                        multiSend.address,
                        0,
                        multiSendFactory.interface.encodeFunctionData("multiSend", [ concatTransactions(safeTransactions) ])
                    ])
                ]
            );
               
            safeTransactions.length = 0;
            safeTransactions.push(encodeTransaction(
                0,
                messageProxyForMainnetAddress,
                0,
                encodedData
            ));

        },
        async (safeMock, abi) => {
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const marionette = await getMarionette(abi);
            const PUPPETEER_ROLE = await marionette.PUPPETEER_ROLE();
            const encodedGrantRole = marionette.interface.encodeFunctionData("grantRole", [PUPPETEER_ROLE, safeMock.address]);
            await marionette.execute(marionette.address, 0, encodedGrantRole);

            await safeMock.transferProxyAdminOwnership(proxyAdmin.address, marionette.address);
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
