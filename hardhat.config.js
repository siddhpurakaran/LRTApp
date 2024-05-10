require('dotenv').config()
require("@nomicfoundation/hardhat-toolbox");
require('@openzeppelin/hardhat-upgrades');

const ENCRYPTED_KEY = process.env.ENCRYPTED_KEY;
const ENCRYPTED_KEY2 = process.env.ENCRYPTED_KEY2;

module.exports = {
  solidity: "0.8.24",
  networks: {
    hardhat: {
      accounts: [{ privateKey: ENCRYPTED_KEY, balance: "1000000000000000000000" }, { privateKey: ENCRYPTED_KEY2, balance: "1000000000000000000000" }],
    },
    holesky: {
      url: `https://1rpc.io/holesky`,
      accounts: [ENCRYPTED_KEY],
    },
    tenderly: {
      url: `https://rpc.vnet.tenderly.co/devnet/holesky1/xxxxxxxxxxxxx`,
      accounts: [ENCRYPTED_KEY]
    },
    lholesky: {
      url: `http://127.0.0.1:8545/`,
      accounts: [ENCRYPTED_KEY],
    },
  },
};
