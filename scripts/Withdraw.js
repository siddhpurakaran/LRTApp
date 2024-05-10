const { ethers } = require("hardhat");
const LRTMasterAdd = "0x5A32b5E4e1C1144f2A796827866C1CF88fa73236";

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
  const tx = await LRTMaster.queueWithdrawal(shareToBeWithdrawn, { "maxFeePerGas": 7752656615 });
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