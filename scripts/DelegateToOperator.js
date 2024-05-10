const { ethers, upgrades } = require("hardhat");
const LRTMasterAdd = "0x6E0230A8B6783a5E3f52C83A39301F9BB2657075";
const operator = "0x50a65aF6D5Ecb4C7Ae962F5B5478b466A728597D";

async function DelegateToOperator() {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }

    const LRTMaster = await ethers.getContractAt("LRTMaster", LRTMasterAdd);
    const lrtMasterAdd = await LRTMaster.getAddress();
    console.log("lrtMaster connected : ", lrtMasterAdd);

    await LRTMaster.delegate(operator, { "maxFeePerGas": 7752656615 });
    console.log("lrtMaster delegated to : ", operator);

    await LRTMaster.undelegate();
    console.log("lrtMaster Undelegated from : ", operator);
}

DelegateToOperator().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});