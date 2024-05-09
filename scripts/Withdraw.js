const { ethers, upgrades } = require("hardhat");
const LRTMasterAdd = "0xdA98f2E8cB30A8174E0d8E5FDdAdEA46f8b84836";

async function mineNBlocks(n) {
    for (let index = 0; index < n; index++) {
      await ethers.provider.send('evm_mine');
    }
  }

  async function Withdraw() {
    const accounts = await hre.ethers.getSigners();
    for (const account of accounts) {
        console.log(account.address);
    }

    const LRTMaster = await ethers.getContractAt("LRTMaster", LRTMasterAdd);
    const lrtMasterAdd = await LRTMaster.getAddress();
    console.log("lrtMaster connected : ", lrtMasterAdd);

    const shareToBeWithdrawn = await LRTMaster.availableShareToWithdraw();
    const tx = await LRTMaster.queueWithdrawal(shareToBeWithdrawn);
    console.log("Withdraw Request Added to Queue");

    await mineNBlocks(20);
    console.log("Skipped 20 blocks for passing withdrawal delay");

    //Note : nonce parameter will be incremented for every queuedWithdrawal
    await LRTMaster.completeWithdrawal(shareToBeWithdrawn, tx?.blockNumber, true, 0);
    // await LRTMaster.completeWithdrawal(ethers.parseEther("0.099891191804517298"), 1508932, true, 0);
    console.log("Withdrawal successful");
}

Withdraw().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});