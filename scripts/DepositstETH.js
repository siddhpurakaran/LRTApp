const { ethers } = require("hardhat");
const stETH = "0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034";
const LRTMasterAdd = "0x5A32b5E4e1C1144f2A796827866C1CF88fa73236";
const mLRTAdd = "0xEF97046f1c8b46FFD595FDFbeDFBac907d4d540B";

async function DepositstETH() {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }

    const LRTMaster = await ethers.getContractAt("LRTMaster", LRTMasterAdd);
    const lrtMasterAdd = await LRTMaster.getAddress();
    console.log("lrtMaster connected : ", lrtMasterAdd);

    const stETHToken = await ethers.getContractAt("ERC20", stETH);
    await stETHToken.approve(lrtMasterAdd, ethers.parseEther("1000"), { "maxFeePerGas": 7752656615 });
    console.log("approved lrtMaster to spend stETH");

    // let balanceBefore = await stETHToken.balanceOf(accounts[0].address);
    const depositAmt = ethers.parseEther("0.1");
    await LRTMaster.deposit(accounts[0].address, depositAmt);

    // let balanceAfter = await stETHToken.balanceOf(accounts[0].address);
    console.log("stETH Deposited");

    const mLRT = await ethers.getContractAt("mLRT", mLRTAdd);
    let balanceMLRT = await mLRT.balanceOf(accounts[0].address);
    console.log(ethers.formatEther(balanceMLRT), "mLRT minted");
}

DepositstETH().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});