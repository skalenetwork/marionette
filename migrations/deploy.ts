// tslint:disable:no-console

import { promises as fs } from 'fs';
import { Interface } from "ethers/lib/utils";
import { ethers, upgrades, network, artifacts } from "hardhat";
import { Marionette } from "../typechain-types";
import { getAbi } from './tools/abi';
import { verify, verifyProxy } from './tools/verification';
import { getVersion } from './tools/version';


export function getContractKeyInAbiFile(contract: string) {
    return contract.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
}

async function main() {
    const [ deployer,] = await ethers.getSigners();

    const version = await getVersion();

    // if ( ... ) {
    //     console.log("Optional variables:");
    //     console.log("IMA_ADDRESS");
    //     console.log("");
    //     console.log("For custom network do not forget to set:");
    //     console.log("ENDPOINT - rpc endpoint");
    //     console.log("PRIVATE_KEY - deployer private key");
    //     console.log("GASPRICE - optional - desired gas price");
    //     console.log("");
    //     console.log("Usage example:");
    //     console.log("IMA_ADDRESS=0xd2AAa00100000000000000000000000000000000 npx hardhat run migrations/deploy.ts --network custom")
    //     process.exit(1);
    // }

    const ownerAddress = deployer.address;
    const imaAddress = process.env.IMA_ADDRESS ? process.env.IMA_ADDRESS : ethers.constants.AddressZero;
    let marionetteAddress: string;
    let marionetteInterface: Interface;

    console.log("Deploy Marionette");
    const marionetteUpgradeableFactory = await ethers.getContractFactory("Marionette");
    const marionette = (await upgrades.deployProxy(marionetteUpgradeableFactory, [ownerAddress, imaAddress]));
    await marionette.deployTransaction.wait();
    marionetteAddress = marionette.address;
    marionetteInterface = marionette.interface;
    await verifyProxy("Marionette", marionette.address, []);


    console.log("Store ABIs");

    const abiAndAddresses: {[key: string]: string | []} = {};
    abiAndAddresses[getContractKeyInAbiFile("Marionette") + "_address"] = marionetteAddress;
    abiAndAddresses[getContractKeyInAbiFile("Marionette") + "_abi"] = getAbi(marionetteInterface);

    await fs.writeFile(`data/marionette-${version}-${network.name}-abi-and-addresses.json`, JSON.stringify(abiAndAddresses, null, 4));

    console.log("Done");
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
