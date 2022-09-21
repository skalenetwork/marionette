import { ethers } from "hardhat";

async function main() {
    const imaMockFactory = await ethers.getContractFactory("ImaMock");
    const imaMock = await imaMockFactory.deploy();
    await imaMock.deployTransaction.wait();
    console.log("IMA " + imaMock.address);
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}
