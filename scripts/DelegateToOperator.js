const { ethers, upgrades } = require("hardhat");
const LRTMasterAdd = "0xdA98f2E8cB30A8174E0d8E5FDdAdEA46f8b84836";
const operator = "0x50a65aF6D5Ecb4C7Ae962F5B5478b466A728597D";

async function DelegateToOperator() {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }

    const LRTMaster = await ethers.getContractAt("LRTMaster", LRTMasterAdd);
    const lrtMasterAdd = await LRTMaster.getAddress();
    console.log("lrtMaster connected : ", lrtMasterAdd);

    await LRTMaster.delegate(operator);
    console.log("lrtMaster delegated to : ", operator);

    await LRTMaster.undelegate();
    console.log("lrtMaster Undelegated from : ", operator);
}

DelegateToOperator().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});