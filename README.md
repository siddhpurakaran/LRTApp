# LRT Hardhat Project
This is project for managing restacking, and withdrawing of LRT tokens as well as delegating and undelegating of shares in eigenlayer

# Steps to use

1. Clone this repo 
```shell
git clone git@github.com:siddhpurakaran/LRTApp.git
```

2. install dependencies 
```shell
npm install
```

3. create .env file with keys of .env.sample file(2 keys are there the .env.sample file of repo)
```shell
ENCRYPTED_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ENCRYPTED_KEY2=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

4. Compile contracts 
```shell
npx hardhat compile
```

5. Start local fork node of holesky testnet 
 - Note : use good RPC instead of public once for avoiding RPC related errors
```shell
npx hardhat node --fork https://ethereum-holesky.blockpi.network/v1/rpc/public		
```

6. Deplot MLRT and LRTMaster contract
```shell
npx hardhat run ./scripts/DeployLRTMaster.js --network lholesky
```

7. Deposit stETH into eigenlayer with this app
- Note : accounts imported in step-3 already have few stETH on holesky testnet
- Make sure Addresses of LRTMaster & mLRT in all scripts are same as addresses printed on previous step
- If timeout error occurs then run this command again
```shell
npx hardhat run ./scripts/DepositstETH.js --network lholesky
```

8. Withdraw restaked tokens from eigenlayer
- Note : Given script will do 2 transactions 1. initiates/queue withdrawal and 2. complete withdrawal
- Withdrawal can only done once deposited stETH thorugh above step-6 
```shell
npx hardhat run ./scripts/Withdraw.js --network lholesky
```

9. Delegate & Undelegating to any operators
- Note : Here in this script we are delegating to operator node of Galxe
- This script will first delegate and then undelegate to Galxe operator node
```shell
npx hardhat run ./scripts/DelegateToOperator.js --network lholesky
```


10. Run tests for contracts 
```shell
npx hardhat test
```
