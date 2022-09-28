import { concatTransactions, deployLibraries, getContractKeyInAbiFile, getLinkedContractFactory, getManifestFile } from "@skalenetwork/upgrade-tools";
import { SkaleABIFile, SkaleManifestData } from "@skalenetwork/upgrade-tools";
import { promises as fs } from "fs";
import { artifacts, ethers, network, upgrades } from "hardhat";
import hre from "hardhat";
import { getImplementationAddress, hashBytecode } from "@openzeppelin/upgrades-core";
import { Contract, ContractFactory } from "ethers";
import chalk from "chalk";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { AccessControlUpgradeable, OwnableUpgradeable, ProxyAdmin, SafeMock } from "@skalenetwork/upgrade-tools/dist/typechain-types";
import { getVersion } from "@skalenetwork/upgrade-tools";
import { getAbi } from "@skalenetwork/upgrade-tools";
import { verify } from "@skalenetwork/upgrade-tools";
import { encodeTransaction } from "@skalenetwork/upgrade-tools";
import { createMultiSendTransaction, sendSafeTransaction } from "@skalenetwork/upgrade-tools";

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
        marionette.interface.encodeFunctionData(
            "execute", 
            [
                marionette.address,
                0,
                marionette.interface.encodeFunctionData("setVersion", [newVersion])            ]
        )
    ));
}

export async function getContractFactoryAndUpdateManifest(contract: string) {
    const manifest = JSON.parse(await fs.readFile(await getManifestFile(), "utf-8")) as SkaleManifestData;
    const { linkReferences } = await artifacts.readArtifact(contract);
    if (!Object.keys(linkReferences).length)
        return await ethers.getContractFactory(contract);

    const librariesToUpgrade = [];
    const oldLibraries: {[k: string]: string} = {};
    if (manifest.libraries === undefined) {
        Object.assign(manifest, {libraries: {}});
    }
    for (const key of Object.keys(linkReferences)) {
        const libraryName = Object.keys(linkReferences[key])[0];
        const { bytecode } = await artifacts.readArtifact(libraryName);
        if (manifest.libraries[libraryName] === undefined) {
            librariesToUpgrade.push(libraryName);
            continue;
        }
        const libraryBytecodeHash = manifest.libraries[libraryName].bytecodeHash;
        if (hashBytecode(bytecode) !== libraryBytecodeHash) {
            librariesToUpgrade.push(libraryName);
        } else {
            oldLibraries[libraryName] = manifest.libraries[libraryName].address;
        }
    }
    const libraries = await deployLibraries(librariesToUpgrade);
    for (const [libraryName, libraryAddress] of libraries.entries()) {
        const { bytecode } = await artifacts.readArtifact(libraryName);
        manifest.libraries[libraryName] = {"address": libraryAddress, "bytecodeHash": hashBytecode(bytecode)};
    }
    Object.assign(libraries, oldLibraries);
    await fs.writeFile(await getManifestFile(), JSON.stringify(manifest, null, 4));
    return await getLinkedContractFactory(contract, libraries);
}

function getContractNameForAbi(contractName: string, abi: SkaleABIFile) {
    let _contract = contractName;
    if (!abi[getContractKeyInAbiFile(contractName) + "_address"]) {
        if (contractName === "BountyV2") {
            _contract = "Bounty";
        } else if (contractName === "EtherbaseUpgradeable") {
            _contract = "Etherbase"
        }
    }
    return _contract;
}

type DeploymentAction<ContractManagerType extends Contract> = (safeTransactions: string[], abi: SkaleABIFile, contractManager: ContractManagerType | undefined) => Promise<string[]>;
type MultiTransactionAction<ContractManagerType extends Contract> = (abi: SkaleABIFile, contractManager: ContractManagerType | undefined, safeMockAddress: string | undefined, safeTransactions: string[]) => Promise<string[][]>;
type SafeMockAction = (safe: SafeMock, abi: SkaleABIFile) => Promise<void>;

export async function upgrade<ContractManagerType extends OwnableUpgradeable>(
    projectName: string,
    targetVersion: string,
    getDeployedVersion: (abi: SkaleABIFile) => Promise<string | undefined>,
    setVersion: (safeTransaction: string[], abi: SkaleABIFile, newVersion: string) => Promise<void>,
    safeMockAccessRequirements: string[],
    contractNamesToUpgrade: string[],
    firstBatch: DeploymentAction<ContractManagerType>,
    beforeUpgrade?: SafeMockAction,
    afterUpgrade?: MultiTransactionAction<ContractManagerType>)
{
    if (!process.env.ABI) {
        console.log(chalk.red("Set path to file with ABI and addresses to ABI environment variables"));
        return;
    }

    const abiFilename = process.env.ABI;
    const abi = JSON.parse(await fs.readFile(abiFilename, "utf-8")) as SkaleABIFile;

    const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;

    let contractManager: ContractManagerType | undefined;
    try {
        const contractManagerName = "ContractManager";
        const contractManagerFactory = await ethers.getContractFactory(contractManagerName);
        contractManager = (contractManagerFactory.attach(abi[getContractKeyInAbiFile(contractManagerName) + "_address"] as string)) as ContractManagerType;
    } catch (e) {
        console.log(chalk.yellow("ContractManager is undefined"));
        
    }

    const deployedVersion = await getDeployedVersion(abi);
    const version = await getVersion();
    if (deployedVersion) {
        if (deployedVersion !== targetVersion) {
            console.log(chalk.red(`This script can't upgrade version ${deployedVersion} to ${version}`));
            process.exit(1);
        }
    } else {
        console.log(chalk.yellow(`Can't check currently deployed version of ${projectName}`));
    }
    console.log(`Will mark updated version as ${version}`);

    const [ deployer ] = await ethers.getSigners();
    let safe = await proxyAdmin.owner();
    const safeTransactions: string[] = [];
    let safeMock: SafeMock | undefined = undefined;
    if (await ethers.provider.getCode(safe) === "0x") {
        console.log("Owner is not a contract");
        if (deployer.address !== safe) {
            console.log(chalk.red(`Used address does not have permissions to upgrade ${projectName}`));
            process.exit(1);
        }
        console.log(chalk.blue("Deploy SafeMock to simulate upgrade via multisig"));
        const safeMockFactory = await ethers.getContractFactory("SafeMock");
        safeMock = await safeMockFactory.deploy();
        await safeMock.deployTransaction.wait();
        safe = safeMock.address;
        await (await proxyAdmin.transferOwnership(safe)).wait();
        if (beforeUpgrade !== undefined) {
            console.log(chalk.blue("Run beforeUpgrade callback"));
            await beforeUpgrade(safeMock, abi);
        }
        console.log(chalk.blue("Transfer ownership to SafeMock"));
        if (contractManager !== undefined) {
            await (await contractManager.transferOwnership(safe)).wait();
        }
        for (const contractName of safeMockAccessRequirements) {
            const contractFactory = await getContractFactoryAndUpdateManifest(contractName);
            const contractAddress = abi[getContractKeyInAbiFile(contractName) + "_address"] as string;
            const contract = contractFactory.attach(contractAddress) as AccessControlUpgradeable;
            console.log(chalk.blue(`Grant access to ${contractName}`));
            await (await contract.grantRole(await contract.DEFAULT_ADMIN_ROLE(), safe)).wait();
        }
    } else {
        try {
            const safeMockFactory = await ethers.getContractFactory("SafeMock");
            const checkSafeMock = safeMockFactory.attach(safe);
            if (await checkSafeMock.IS_SAFE_MOCK()) {
                safeMock = checkSafeMock;
            }
        } catch (e) {
            console.log(chalk.yellow("Owner is not SafeMock"));
        }
    }

    // Deploy new contracts
    // await deployNewContracts(safeTransactions, abi, contractManager);

    // deploy new implementations
    const contractsToUpgrade: {proxyAddress: string, implementationAddress: string, name: string, abi: []}[] = [];
    for (const contract of contractNamesToUpgrade) {
        const contractFactory = await getContractFactoryAndUpdateManifest(contract);
        const contractName = getContractNameForAbi(contract, abi);
        const proxyAddress = abi[getContractKeyInAbiFile(contractName) + "_address"] as string;

        console.log(`Prepare upgrade of ${contract}`);
        const newImplementationAddress = await upgrades.prepareUpgrade(
            proxyAddress,
            contractFactory,
            {
                unsafeAllowLinkedLibraries: true,
                unsafeAllowRenames: true,
                unsafeAllow: ['delegatecall']
            }
        ) as string;
        const currentImplementationAddress = await getImplementationAddress(network.provider, proxyAddress);
        if (newImplementationAddress !== currentImplementationAddress)
        {
            contractsToUpgrade.push({
                proxyAddress,
                implementationAddress: newImplementationAddress,
                name: contract,
                abi: getAbi(contractFactory.interface)
            });
            await verify(contract, newImplementationAddress, []);
        } else {
            console.log(chalk.gray(`Contract ${contract} is up to date`));
        }
    }

    // Switch proxies to new implementations
    for (const contract of contractsToUpgrade) {
        console.log(chalk.yellowBright(`Prepare transaction to upgrade ${contract.name} at ${contract.proxyAddress} to ${contract.implementationAddress}`));
        safeTransactions.push(encodeTransaction(
            0,
            proxyAdmin.address,
            0,
            proxyAdmin.interface.encodeFunctionData("upgrade", [contract.proxyAddress, contract.implementationAddress])));
        abi[getContractKeyInAbiFile(contract.name) + "_abi"] = contract.abi;
    }

    // write version
    await setVersion(safeTransactions, abi, version);

    const firstBatchOfUpgrade = await firstBatch(safeTransactions, abi, contractManager);
    await fs.writeFile(`data/transactions-${version}-${network.name}.json`, JSON.stringify(firstBatchOfUpgrade, null, 4));

    let privateKey = (network.config.accounts as string[])[0];
    if (network.config.accounts === "remote") {
        // Don't have an information about private key
        // Use random one because we most probable run tests
        privateKey = ethers.Wallet.createRandom().privateKey;
    }

    const safeTx = await createMultiSendTransaction(ethers, safe, privateKey, firstBatchOfUpgrade, safeMock !== undefined ? 0 : undefined);
    let transactionsBatches: string[][] | undefined;
    if (afterUpgrade !== undefined) {
        transactionsBatches = await afterUpgrade(abi, contractManager, safeMock?.address, safeTransactions);
        for (const { index, batch } of transactionsBatches.map((batch, index) => ({index, batch}))) {
            await fs.writeFile(`data/after-transactions-${index}-${version}-${network.name}.json`, JSON.stringify(batch, null, 4));
        }
    }
    if (!safeMock) {
        const chainId = (await ethers.provider.getNetwork()).chainId;
        await sendSafeTransaction(safe, chainId, safeTx);
        if (transactionsBatches !== undefined) {
            for (const { batch, index } of transactionsBatches.map((batch, index) => ({batch, index}))) {
                const multiSendTransaction = await createMultiSendTransaction(ethers, safe, privateKey, batch, safeTx.nonce + index + 1);
                await sendSafeTransaction(safe, chainId, multiSendTransaction);
            }
        }
    } else {
        console.log(chalk.blue("Send upgrade transactions to safe mock"));
        try {
            await (await deployer.sendTransaction({
                to: safeMock.address,
                value: safeTx.value,
                data: safeTx.data,
            })).wait();
            if (transactionsBatches !== undefined) {
                for (const batch of transactionsBatches) {
                    const multiSendTransaction = await createMultiSendTransaction(ethers, safe, privateKey, batch, 0);
                    await (await deployer.sendTransaction({
                        to: safeMock.address,
                        value: multiSendTransaction.value,
                        data: multiSendTransaction.data,
                    })).wait();
                }
            }
            console.log(chalk.blue("Transactions have been sent"));
        } catch (exception) {
            console.log(chalk.red("Error during upgrade"));
            console.log(exception);
            process.exitCode = 13;
        } finally {
            console.log(chalk.blue("Return ownership to wallet"));
            if (contractManager !== undefined) {
                await (await safeMock.transferProxyAdminOwnership(contractManager.address, deployer.address)).wait();
            }
            await (await safeMock.transferProxyAdminOwnership(proxyAdmin.address, deployer.address)).wait();
            if (await proxyAdmin.owner() !== deployer.address) {
                console.log(chalk.blue("Something went wrong with ownership transfer"));
                process.exit(1);
            }
        }
    }

    await fs.writeFile(`data/${projectName}-${version}-${network.name}-abi.json`, JSON.stringify(abi, null, 4));

    console.log("Done");
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
        async (safeTransactions, abi): Promise<string[]> => {
            const schainName = process.env.SKALE_CHAIN_NAME;
            const messageProxyForMainnetAddress = process.env.MESSAGE_PROXY_FOR_MAINNET_ADDRESS;
            const schainHash = ethers.utils.solidityKeccak256(["string"], [schainName]);
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const marionette = await getMarionette(abi);
            const multiSendFactory = await ethers.getContractFactory("MultiSend");
            const multiSend = await multiSendFactory.deploy(marionette.address);
            await multiSend.deployTransaction.wait();
            abi[getContractKeyInAbiFile("MultiSend") + "_address"] = multiSend.address;

            if (!schainName) {
                console.log(chalk.red("Set SKALE chain name to environment"));
                process.exit(1);
            }
            if (!messageProxyForMainnetAddress) {
                console.log(chalk.red("Set address of MessageProxyForMainnet to environment"));
                process.exit(1);
            }

            const _safeTransactions: string[] = [];

            let encodedData = (await ethers.getContractFactory("ImaMock")).interface.encodeFunctionData(
                "postOutgoingMessage",
                [
                    schainHash,
                    marionette.address,
                    ethers.utils.defaultAbiCoder.encode(["address", "uint", "bytes"], [
                        marionette.address,
                        0,
                        marionette.interface.encodeFunctionData("grantRole", [await marionette.PUPPETEER_ROLE(), multiSend.address])
                    ])
                ]
            );
            // 1. grant PUPPETEER_ROLE to MultiSend (for execute permissions)
            _safeTransactions.push(encodeTransaction(
                0,
                messageProxyForMainnetAddress,
                0,
                encodedData
            ));

            encodedData = (await ethers.getContractFactory("ImaMock")).interface.encodeFunctionData(
                "postOutgoingMessage",
                [
                    schainHash,
                    marionette.address,
                    ethers.utils.defaultAbiCoder.encode(["address", "uint", "bytes"], [
                        proxyAdmin.address,
                        0,
                        proxyAdmin.interface.encodeFunctionData("transferOwnership", [multiSend.address])
                    ])
                ]
            );

            // 2. transferOwnership from Marionette to MultiSend (for upgrade permissions)
            _safeTransactions.push(encodeTransaction(
                0,
                messageProxyForMainnetAddress,
                0,
                encodedData
            ));

            return _safeTransactions;

        },
        async (safeMock, abi) => {
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const marionette = await getMarionette(abi);
            const PUPPETEER_ROLE = await marionette.PUPPETEER_ROLE();
            const encodedGrantRole = marionette.interface.encodeFunctionData("grantRole", [PUPPETEER_ROLE, safeMock.address]);
            await marionette.execute(marionette.address, 0, encodedGrantRole);

            await safeMock.transferProxyAdminOwnership(proxyAdmin.address, marionette.address);
        },
        async (abi, _, safeMockAddress, safeTransactions): Promise<string[][]> => {
            const schainName = process.env.SKALE_CHAIN_NAME;
            const messageProxyForMainnetAddress = process.env.MESSAGE_PROXY_FOR_MAINNET_ADDRESS;
            const schainHash = ethers.utils.solidityKeccak256(["string"], [schainName]);
            const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
            const marionette = await getMarionette(abi);
            const multiSendFactory = await ethers.getContractFactory("MultiSend");
            const multiSend = multiSendFactory.attach(abi[getContractKeyInAbiFile("MultiSend") + "_address"] as string);

            if (!schainName) {
                console.log(chalk.red("Set SKALE chain name to environment"));
                process.exit(1);
            }
            if (!messageProxyForMainnetAddress) {
                console.log(chalk.red("Set address of MessageProxyForMainnet to environment"));
                process.exit(1);
            }

            let transactionsBatches: string[][] = [[]];

            safeTransactions.push(encodeTransaction(
                0,
                marionette.address,
                0,
                marionette.interface.encodeFunctionData(
                    "execute", 
                    [
                        marionette.address,
                        0,
                        marionette.interface.encodeFunctionData("revokeRole", [await marionette.PUPPETEER_ROLE(), multiSend.address])
                    ]
                )
            ));

            if (safeMockAddress !== undefined) {
                safeTransactions.push(encodeTransaction(
                    0,
                    proxyAdmin.address,
                    0,
                    proxyAdmin.interface.encodeFunctionData("transferOwnership", [safeMockAddress])
                ));
            } else {
                safeTransactions.push(encodeTransaction(
                    0,
                    proxyAdmin.address,
                    0,
                    proxyAdmin.interface.encodeFunctionData("transferOwnership", [marionette.address])
                ));
            }
 
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

            // 3.1. upgrade Marionette
            // 3.2. setVersion
            // 3.3. revoke PUPPETEER_ROLE from MultiSend
            // 3.4. transferOwnership from MultiSend to Marionette
            // or
            // 3.5. transferOwnership from Marionette to SafeMock
            transactionsBatches.push([
                encodeTransaction(
                    0,
                    messageProxyForMainnetAddress,
                    0,
                    encodedData
                )
            ]);

          return transactionsBatches;
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
