const { ethers, upgrades } = require("hardhat");
const stETH = "0x3F1c547b21f65e10480dE3ad8E19fAAC46C95034";
const delegationManager = "0xA44151489861Fe9e3055d95adC98FbD462B948e7";
const strategyManager = "0xdfB5f6CE42aAA7830E94ECFCcAd411beF4d4D5b6";
const stETHStrategy = "0x7D704507b76571a51d9caE8AdDAbBFd0ba0e63d3";

async function DeployLRTMaster() {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }

  const MLRT = await ethers.getContractFactory("mLRT");
  const mLRT = await MLRT.deploy(accounts[0].address, {"gas_price": 100000000000});
  console.log("mLRT deployed : ", mLRT.target);

  const LRTMasterImpl = await ethers.getContractFactory("LRTMaster");
  const LRTMaster = await upgrades.deployProxy(LRTMasterImpl, [stETH, mLRT.target, accounts[0].address, delegationManager, strategyManager, stETHStrategy]);
  await LRTMaster.waitForDeployment();
  const lrtMasterAdd = await LRTMaster.getAddress();
  console.log("lrtMaster Deployed : ", lrtMasterAdd);

  mLRT.grantRole(await mLRT.MINTER_ROLE(), lrtMasterAdd)
  mLRT.grantRole(await mLRT.BURNER_ROLE(), lrtMasterAdd)
  console.log("roles assigned for mLRT");
}

DeployLRTMaster().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});