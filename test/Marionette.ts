import { ethers  } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as chai from "chai"
import chaiAsPromised from "chai-as-promised";
import { Marionette, Target, ImaMock } from "../typechain-types";

chai.should();
chai.use(chaiAsPromised);

describe("Marionette", () => {

    let owner: SignerWithAddress;
    let external: SignerWithAddress;
    let hacker: SignerWithAddress;
    let marionette: Marionette;
    let target: Target;
    let ima: ImaMock;
    const amount = ethers.utils.parseEther("5");

    beforeEach(async () => {
        [ owner, external, hacker ] = await ethers.getSigners();

        target = await (await ethers.getContractFactory("Target")).deploy();
        ima = await (await ethers.getContractFactory("ImaMock")).deploy();

        const marionetteFactory = await ethers.getContractFactory("Marionette");
        marionette = await marionetteFactory.deploy();
        await marionette.initialize(owner.address, ima.address);
    });

    describe("ETH transfers", () => {

        it ("should be able to send ETH to address", async () => {
            const balanceBefore = await ethers.provider.getBalance(external.address);
            await marionette.sendEth(external.address, amount, {value: amount})
                .should.emit(marionette, "EtherSent")
                .withArgs(external.address, amount)
                .emit(marionette, "EtherReceived")
                .withArgs(owner.address, amount);
            const balanceAfter = await ethers.provider.getBalance(external.address);
            balanceAfter.sub(balanceBefore).should.be.equal(amount);
            await external.sendTransaction({to: owner.address, value: amount});
        });

        it ("should be able to send ETH to contract", async () => {
            const balanceBefore = await ethers.provider.getBalance(target.address);
            await marionette.sendEth(target.address, amount, {value: amount})
                .should.emit(marionette, "EtherSent")
                .withArgs(target.address, amount)
                .emit(marionette, "EtherReceived")
                .withArgs(owner.address, amount);
            const balanceAfter = await ethers.provider.getBalance(target.address);
            balanceAfter.sub(balanceBefore).should.be.equal(amount);
            await target.sendEth(owner.address, amount);
        });

        it ("should not allow everyone to send ETH", async () => {
            await marionette.connect(hacker).sendEth(target.address, amount, {value: amount})
                .should.be.eventually.rejectedWith("Access violation");
        });

        describe("Calls from IMA", () => {
            it("Should transfer ETH using IMA", async () => {
                await owner.sendTransaction({to: marionette.address, value: amount})
                    .should.emit(marionette, "EtherReceived")
                    .withArgs(owner.address, amount);

                await ima.sendMessage(
                    owner.address,
                    marionette.address,
                    await marionette.encodeFunctionCall(
                        owner.address,
                        amount,
                        "0x"
                    )
                )
                    .should.emit(marionette, "EtherSent")
                    .withArgs(owner.address, amount);
            })
        });
    });

    describe("Contract calls", () => {

        const uintValue = 5;
        const stringValue = "Hello from D2";

        it ("should allow owner to call contract", async () => {
            const transaction = await marionette.execute(
                target.address,
                amount,
                target.interface.encodeFunctionData(
                    "targetFunction",
                    [uintValue, stringValue]
                ),
                {value: amount}
            );
            transaction.should.emit(marionette, "EtherReceived").withArgs(owner.address, amount);
            transaction.should.emit(marionette, "EtherSent").withArgs(target.address, amount);
            transaction.should.emit(target, "ExecutionResult").withArgs(uintValue, stringValue);
            transaction.should.emit(target, "EtherReceived").withArgs(marionette.address, amount);

            await target.sendEth(owner.address, amount);
        });

        it ("should not allow everyone to call contract", async () => {
            await marionette.connect(hacker).execute(target.address, 0, "0x")
                .should.be.eventually.rejectedWith("Access violation");
        });

        describe("Calls from IMA", () => {

            it ("should allow IMA to trigger function call", async () => {
                const transaction = await ima.sendMessage(
                    owner.address,
                    marionette.address,
                    await marionette.encodeFunctionCall(
                        target.address,
                        0,
                        target.interface.encodeFunctionData(
                            "targetFunction",
                            [uintValue, stringValue]
                        )
                    )
                );
                transaction.should.emit(target, "ExecutionResult").withArgs(uintValue, stringValue);
                transaction.should.emit(marionette, "FunctionCallResult").withArgs("0x");
            });

            it ("should not allow everyone to trigger function call through IMA", async () => {
                await ima.sendMessage(
                    hacker.address,
                    marionette.address,
                    await marionette.encodeFunctionCall(
                        target.address,
                        0,
                        target.interface.encodeFunctionData(
                            "targetFunction",
                            [uintValue, stringValue]
                        )
                    )
                ).should.be.eventually.rejectedWith("Access violation");
            });

            it ("should not allow any contract to call IMA callback", async () => {
                await target.sendMessage(
                    owner.address,
                    marionette.address,
                    "0x"
                ).should.be.eventually.rejectedWith("Sender is not IMA");
            });
        });
    });
});