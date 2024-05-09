const { ethers, upgrades } = require("hardhat");
const stETH = "0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034";
const LRTMasterAdd = "0xdA98f2E8cB30A8174E0d8E5FDdAdEA46f8b84836";
const mLRTAdd = "0x8ADb1774C6B6d5b2516502D24e65823c2afAaaE9";

async function DepositstETH() {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }

    const LRTMaster = await ethers.getContractAt("LRTMaster", LRTMasterAdd);
    const lrtMasterAdd = await LRTMaster.getAddress();
    console.log("lrtMaster connected : ", lrtMasterAdd);

    const stETHToken = await ethers.getContractAt("ERC20", stETH);
    await stETHToken.approve(lrtMasterAdd, ethers.parseEther("1000"));
    console.log("approved lrtMaster to spend stETH");

    // let balanceBefore = await stETHToken.balanceOf(accounts[0].address);
    const depositAmt = ethers.parseEther("0.1");
    await LRTMaster.deposit(accounts[0].address, depositAmt);

    // let balanceAfter = await stETHToken.balanceOf(accounts[0].address);
    console.log("stETH Deposited");

    const mLRT = await ethers.getContractAt("mLRT", mLRTAdd);
    let balanceMLRT = await mLRT.balanceOf(accounts[0].address);
    console.log(ethers.formatEther(balanceMLRT),"mLRT minted");
}

DepositstETH().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});