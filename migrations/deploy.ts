// tslint:disable:no-console

import { promises as fs } from 'fs';
import { ethers, upgrades, network } from "hardhat";
import { getAbi } from './tools/abi';
import { verifyProxy } from './tools/verification';
import { getVersion } from './tools/version';


export function getContractKeyInAbiFile(contract: string) {
    return contract.replace(/([a-zA-Z])(?=[A-Z])/g, '$1_').toLowerCase();
}

async function main() {
    const [ deployer,] = await ethers.getSigners();

    const version = await getVersion();

    // Usage information:
    //
    //     Optional variables:
    //     IMA_ADDRESS
    //
    //     For custom network do not forget to set:
    //     ENDPOINT - rpc endpoint
    //     PRIVATE_KEY - deployer private key
    //     GASPRICE - optional - desired gas price
    //
    //     Usage example:
    //     IMA_ADDRESS=0xd2AAa00100000000000000000000000000000000 npx hardhat run migrations/deploy.ts --network custom

    const ownerAddress = deployer.address;
    const imaAddress = process.env.IMA_ADDRESS ? process.env.IMA_ADDRESS : ethers.constants.AddressZero;
    if (imaAddress === ethers.constants.AddressZero) {
        console.log("IMA MessageProxy was not passed. Zero address will be used.");
    }

    console.log("Deploy Marionette");
    const marionetteUpgradeableFactory = await ethers.getContractFactory("Marionette");
    const marionette = await upgrades.deployProxy(marionetteUpgradeableFactory, [ownerAddress, imaAddress]);
    await marionette.deployTransaction.wait();
    const marionetteAddress = marionette.address;
    const marionetteInterface = marionette.interface;
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
