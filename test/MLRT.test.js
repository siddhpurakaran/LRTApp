const {
    time,
    loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MLRT", function () {
    async function deployMLRTFixture() {
        const [owner, otherAccount] = await ethers.getSigners();

        const MLRT = await ethers.getContractFactory("mLRT");
        const mLRT = await MLRT.deploy(owner);

        await mLRT.connect(owner).grantRole(await mLRT.MINTER_ROLE(), owner);
        await mLRT.connect(owner).grantRole(await mLRT.BURNER_ROLE(), owner);
        return { mLRT, owner, otherAccount };
    }

    describe("Deployment", function () {
        it("Should set initial values correctly", async function () {
            const { mLRT, owner } = await loadFixture(deployMLRTFixture);
            expect(await mLRT.totalSupply()).to.equal(0);
            expect(await mLRT.balanceOf(owner)).to.equal(0);
            expect(await mLRT.decimals()).to.equal(18);
            expect(await mLRT.name()).to.equal("mLRT");
            expect(await mLRT.symbol()).to.equal("mLRT");
        });

        it("Should set roles correctly", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployMLRTFixture);
            expect(await mLRT.hasRole(await mLRT.DEFAULT_ADMIN_ROLE(), owner)).to.equal(true);
            expect(await mLRT.hasRole(await mLRT.DEFAULT_ADMIN_ROLE(), otherAccount)).to.equal(false);
        });

        it("Should fail when passed zero address as admin", async function () {
            const MLRT = await ethers.getContractFactory("mLRT");
            await expect(MLRT.deploy("0x0000000000000000000000000000000000000000")).to.be.revertedWithCustomError(MLRT, "ZeroAddress");
        });
    });

    describe("Mint", function () {
        it("Should mint tokens correctly", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployMLRTFixture);
            expect(await mLRT.totalSupply()).to.equal(0);
            expect(await mLRT.balanceOf(otherAccount)).to.equal(0);

            let mintAmount = ethers.parseEther("1").toString();
            await mLRT.connect(owner).mint(otherAccount, mintAmount);

            expect(await mLRT.totalSupply()).to.equal(mintAmount);
            expect(await mLRT.balanceOf(otherAccount)).to.equal(mintAmount);
        });

        it("Should revert when non-minter try to mint tokens", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployMLRTFixture);
            await expect(mLRT.connect(otherAccount).mint(owner, "100000")).to.be.revertedWithCustomError(mLRT, "AccessControlUnauthorizedAccount");
        });
    });

    describe("Burn", function () {
        it("Should burn tokens correctly", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployMLRTFixture);
            let initialAmount = ethers.parseEther("100").toString();
            await mLRT.connect(owner).mint(otherAccount, initialAmount);
            expect(await mLRT.totalSupply()).to.equal(initialAmount);
            expect(await mLRT.balanceOf(otherAccount)).to.equal(initialAmount);

            let burnAmount = ethers.parseEther("25").toString();
            await mLRT.connect(owner).burn(otherAccount, burnAmount);

            expect(await mLRT.totalSupply()).to.equal(ethers.parseEther("75").toString());
            expect(await mLRT.balanceOf(otherAccount)).to.equal(ethers.parseEther("75").toString());
        });

        it("Should revert when non-burner try to burn tokens", async function () {
            const { mLRT, owner, otherAccount } = await loadFixture(deployMLRTFixture);
            await expect(mLRT.connect(otherAccount).burn(owner.address, "100000")).to.be.revertedWithCustomError(mLRT, "AccessControlUnauthorizedAccount");
        });
    });
});  