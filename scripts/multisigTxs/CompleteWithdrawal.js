const { ethers } = require("hardhat");
const { EthersAdapter } = require("@safe-global/protocol-kit");
const Safe = require("@safe-global/protocol-kit")

async function DepositstETH() {
    const provider = new ethers.JsonRpcProvider(process.env.HOLESKY_RPC)
    const signer1 = new ethers.Wallet(process.env.ENCRYPTED_KEY, provider)

    const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer1 })

    const safeAddress = process.env.SAFE_ADDRESS;
    const safeSdk = await Safe.default.create({ ethAdapter, safeAddress })
    console.log("Safe Connected")

    const LRTMaster = await ethers.getContractAt("LRTMaster", process.env.LRTMASTER_HOLESKY);
    console.log("Copy shares, blocknumber, nonce from initiated Tranaction");
    const shareToBeWithdrawn = ethers.parseEther("0.099883646321213808");
    const blocknumber = 1516136;
    const nonce = 2;

    const calldata = LRTMaster.interface.encodeFunctionData('completeWithdrawal',[shareToBeWithdrawn, blocknumber, true, 1])
    const txData = {
        to: process.env.LRTMASTER_HOLESKY,
        value: 0,
        data: calldata
    }

    const safeTransaction = await safeSdk.createTransaction({ transactions: [txData] })
    const executeTxResponse = await safeSdk.executeTransaction(safeTransaction)
    await executeTxResponse.transactionResponse?.wait()
    console.log("Executed Transaction")
}

DepositstETH().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});