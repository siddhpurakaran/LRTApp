const { ethers } = require("hardhat");
const LRTMasterAdd = "0x5A32b5E4e1C1144f2A796827866C1CF88fa73236";
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