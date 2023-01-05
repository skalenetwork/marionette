import { ethers } from "hardhat";
import { Upgrader } from "@skalenetwork/upgrade-tools";
import { SkaleABIFile } from "@skalenetwork/upgrade-tools/dist/src/types/SkaleABIFile";
import { promises as fs } from "fs";
import { getManifestAdmin } from "@openzeppelin/hardhat-upgrades/dist/admin";
import { ProxyAdmin } from "@skalenetwork/upgrade-tools/dist/typechain-types";
import hre from "hardhat";

const marionette_address = "0xD2c0DeFACe000000000000000000000000000000";

class MarionetteUpgrader extends Upgrader {

    getDeployedVersion = async () => {
        try {
            return await (await this.getMarionette()).version();
        } catch {
            // if there is no version() function
            // it means there is a version 1.0.0
            return "1.0.0";
        }
    };

    setVersion = async (newVersion: string) => {
        const marionette = await this.getMarionette();
        const setVersionTransaction = {
            to: marionette.address,
            data: marionette.interface.encodeFunctionData("setVersion", [newVersion])
        };

        const proxyAdmin = await getManifestAdmin(hre) as ProxyAdmin;
        const owner = await proxyAdmin.owner();

        if (await hre.ethers.provider.getCode(owner) === "0x" &&
            !await marionette.hasRole(await marionette.DEFAULT_ADMIN_ROLE(), (await ethers.getSigners())[0].address)) {
                // setVersion will be called by EOA without DEFAULT_ADMIN_ROLE
                console.log("Using execute function of Marionette to set new version");
                this.transactions.push({
                    to:marionette.address,
                    data: marionette.interface.encodeFunctionData("execute", [
                        setVersionTransaction.to,
                        0,
                        setVersionTransaction.data])
                });
        } else {
            // setVersion will be called via Marionette
            this.transactions.push(setVersionTransaction);
        }
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
