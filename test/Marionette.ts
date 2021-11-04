import { ethers  } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as chai from "chai"
import chaiAsPromised from "chai-as-promised";
import { Marionette } from "../typechain-types";
import { Target } from "../typechain-types/Target";

chai.should();
chai.use(chaiAsPromised);

describe("Marionette", () => {

    let owner: SignerWithAddress;
    let external: SignerWithAddress;
    let hacker: SignerWithAddress;
    let marionette: Marionette;
    let target: Target;
    const amount = ethers.utils.parseEther("5");

    beforeEach(async () => {
        [ owner, external, hacker ] = await ethers.getSigners();
        const marionetteFactory = await ethers.getContractFactory("Marionette");
        marionette = await marionetteFactory.deploy();
        await marionette.initialize(owner.address, ethers.constants.AddressZero);
        target = await (await ethers.getContractFactory("Target")).deploy();
    });

    it ("should be able to send ETH to address", async () => {
        const balanceBefore = await ethers.provider.getBalance(external.address);
        await marionette.sendEth(external.address, amount, {value: amount});
        const balanceAfter = await ethers.provider.getBalance(external.address);
        balanceAfter.sub(balanceBefore).should.be.equal(amount);
        await external.sendTransaction({to: owner.address, value: amount});
    });

    it ("should be able to send ETH to contract", async () => {
        const balanceBefore = await ethers.provider.getBalance(target.address);
        await marionette.sendEth(target.address, amount, {value: amount});
        const balanceAfter = await ethers.provider.getBalance(target.address);
        balanceAfter.sub(balanceBefore).should.be.equal(amount);
        await target.sendEth(owner.address, amount);
    });
});