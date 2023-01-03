import { ethers } from "hardhat";
import { Upgrader } from "@skalenetwork/upgrade-tools";

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

    const upgrader = new MarionetteUpgrader(
        "Marionette",
        "1.0.0",
        {
            "marionette_address": marionette_address
        },
        ["Marionette"]
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
