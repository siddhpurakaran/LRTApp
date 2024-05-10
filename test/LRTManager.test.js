const {
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("LRTManager", function () {
    async function deployLRTManager() {
        const [owner, otherAccount] = await ethers.getSigners();

        const MLRT = await ethers.getContractFactory("mLRT");
        const mLRT = await MLRT.deploy(owner);

        const LRTMasterImpl = await ethers.getContractFactory("LRTMaster");
        const LRTMaster = await upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, mLRT.target, owner.address, otherAccount.address, otherAccount.address, otherAccount.address]);
        await LRTMaster.waitForDeployment();
        const lrtMasterAdd = await LRTMaster.getAddress();

        await mLRT.connect(owner).grantRole(await mLRT.MINTER_ROLE(), owner);
        await mLRT.connect(owner).grantRole(await mLRT.BURNER_ROLE(), owner);
        return { mLRT, LRTMaster, lrtMasterAdd, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set initial values correctly", async function () {
            const { mLRT, LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            expect(await LRTMaster.stETH()).to.equal(otherAccount);
            expect(await LRTMaster.ynLRT()).to.equal(mLRT);
            expect(await LRTMaster.delegationManager()).to.equal(otherAccount);
            expect(await LRTMaster.strategyManager()).to.equal(otherAccount);
            expect(await LRTMaster.stETHStrategy()).to.equal(otherAccount);
        });

        it("Should set roles correctly", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            expect(await LRTMaster.hasRole(await LRTMaster.DEFAULT_ADMIN_ROLE(), owner)).to.equal(true);
            expect(await LRTMaster.hasRole(await LRTMaster.DEFAULT_ADMIN_ROLE(), otherAccount)).to.equal(false);

            expect(await LRTMaster.hasRole(await LRTMaster.ADMIN_ROLE(), owner)).to.equal(true);
            expect(await LRTMaster.hasRole(await LRTMaster.ADMIN_ROLE(), otherAccount)).to.equal(false);
        });

        it("Should Revert when passed zero address as any parameter", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployLRTManager);
            const LRTMasterImpl = await ethers.getContractFactory("LRTMaster");
            await expect(upgrades.deployProxy(LRTMasterImpl, ["0x0000000000000000000000000000000000000000", mLRT.target, owner.address, otherAccount.address, otherAccount.address, otherAccount.address])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
            await expect(upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, "0x0000000000000000000000000000000000000000", owner.address, otherAccount.address, otherAccount.address, otherAccount.address])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
            await expect(upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, mLRT.target, "0x0000000000000000000000000000000000000000", otherAccount.address, otherAccount.address, otherAccount.address])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
            await expect(upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, mLRT.target, owner.address, "0x0000000000000000000000000000000000000000", otherAccount.address, otherAccount.address])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
            await expect(upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, mLRT.target, owner.address, otherAccount.address, "0x0000000000000000000000000000000000000000", otherAccount.address])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
            await expect(upgrades.deployProxy(LRTMasterImpl, [otherAccount.address, mLRT.target, owner.address, otherAccount.address, otherAccount.address, "0x0000000000000000000000000000000000000000"])).to.be.revertedWithCustomError(LRTMasterImpl, "ZeroAddress");
        });
    });

    describe("Deposit", function () {
        it("Should Revert when passed zero address as any parameter", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.deposit("0x0000000000000000000000000000000000000000", 10000)).to.be.revertedWithCustomError(LRTMaster, "ZeroAddress");
            await expect(LRTMaster.deposit(otherAccount.address, 0)).to.be.revertedWithCustomError(LRTMaster, "ZeroAmount");
        });

        it("Should Revert when deposits are paused", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await LRTMaster.updateDepositsPaused(true);
            await expect(LRTMaster.deposit(otherAccount.address, 100000)).to.be.revertedWithCustomError(LRTMaster, "Paused");
        });
    });

    describe("UpdateDepositsPaused", function () {
        it("UpdateDepositsPaused should work correctly", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            expect(await LRTMaster.depositsPaused()).to.equal(false);

            await LRTMaster.updateDepositsPaused(true);
            expect(await LRTMaster.depositsPaused()).to.equal(true);

            await LRTMaster.updateDepositsPaused(false);
            expect(await LRTMaster.depositsPaused()).to.equal(false);
        });

        it("Should Revert when called by nonAdmin user", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.connect(otherAccount).updateDepositsPaused(true)).to.be.revertedWithCustomError(LRTMaster, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Delegate", function () {
        it("Should Revert when passed zero address as operator value", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.delegate("0x0000000000000000000000000000000000000000")).to.be.revertedWithCustomError(LRTMaster, "ZeroAddress");
        });

        it("Should Revert when called by nonAdmin user", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.connect(otherAccount).delegate(otherAccount.address)).to.be.revertedWithCustomError(LRTMaster, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Undelegate", function () {
        it("Should Revert when called by nonAdmin user", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.connect(otherAccount).undelegate()).to.be.revertedWithCustomError(LRTMaster, "AccessControlUnauthorizedAccount");
        });
    });

    describe("QueueWithdrawal", function () {
        it("Should Revert when called by nonAdmin user", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.connect(otherAccount).queueWithdrawal(10000)).to.be.revertedWithCustomError(LRTMaster, "AccessControlUnauthorizedAccount");
        });
    });

    describe("CompleteWithdrawal", function () {
        it("Should Revert when called by nonAdmin user", async function () {
            const { LRTMaster, owner, otherAccount } = await loadFixture(deployLRTManager);
            await expect(LRTMaster.connect(otherAccount).completeWithdrawal(10000, 2, true, 0)).to.be.revertedWithCustomError(LRTMaster, "AccessControlUnauthorizedAccount");
        });
    });
});