import { ethers } from "hardhat";
import { Upgrader } from "@skalenetwork/upgrade-tools";
import { SkaleABIFile } from "@skalenetwork/upgrade-tools/dist/src/types/SkaleABIFile";
import { promises as fs } from "fs";

const marionette_address = "0xD2c0DeFACe000000000000000000000000000000";

class MarionetteUpgrader extends Upgrader {

    getDeployedVersion = async () => {
        return await (await this.getMarionette()).version();
    };

    setVersion = async (newVersion: string) => {
        const marionette = await this.getMarionette();
        this.transactions.push({
            to: marionette.address,
            data: marionette.interface.encodeFunctionData("setVersion", [newVersion])
        });
    }

    async getMarionette() {
        return await ethers.getContractAt("Marionette", this.abi["marionette_address"] as string);
    }
}

async function main() {

    let abi: SkaleABIFile;
    if (process.env.ABI) {
        // a file with marionette address is provided
        abi = JSON.parse(await fs.readFile(process.env.ABI, "utf-8")) as SkaleABIFile;
    } else {
        // use default one
        abi = {
            "marionette_address": marionette_address
        }
    }

    const upgrader = new MarionetteUpgrader(
        "Marionette",
        "1.0.0",
        abi,
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
