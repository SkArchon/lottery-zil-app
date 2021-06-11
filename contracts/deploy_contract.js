// Unfortunately had issues, so deployed using Scilla IDE

// const fs = require('fs');
// const { BN, Long, bytes, units } = require('@zilliqa-js/util');
// const { Zilliqa } = require('@zilliqa-js/zilliqa');
// const {
//   toBech32Address,
//   getAddressFromPrivateKey,
// } = require('@zilliqa-js/crypto');
// const process = require('process');

// async function deployContract(fileName) {
//   try {
//     const code = fs.readFileSync(fileName, 'utf8');

//     const init = JSON.parse(fs.readFileSync(`${fileName}.init.json`, 'utf8'));

//     console.log("===========================");
//     console.log("CODE DEPLOYED");
//     console.log("===========================");
//     console.log(code);

//     console.log("===========================");
//     console.log("INIT PARAMS");
//     console.log("===========================");
//     console.log(init);

//     // Instance of class Contract
//     const contract = zilliqa.contracts.new(code, init);

//     const myGasPrice = units.toQa('25000', units.Units.Li); // Gas Price that will be used by all transactions

//     const [deployTx, deployedContract] = await contract.deploy(
//       {
//         version: VERSION,
//         gasPrice: myGasPrice,
//         gasLimit: Long.fromNumber(25000),
//       },
//       2,
//       1000,
//       false,
//     );

//     // Introspect the state of the underlying transaction
//     console.log(`Deployment Transaction ID: ${deployTx.id}`);
//     console.log(`Deployment Transaction Receipt:`);
//     console.log(deployTx.txParams.receipt);

//     // Get the deployed contract address
//     console.log('The contract address is:');
//     console.log(deployedContract.address);

//     //Following line added to fix issue https://github.com/Zilliqa/Zilliqa-JavaScript-Library/issues/168
//     // const deployedContract = zilliqa.contracts.at(preDeployedContract.address);
//   }
//   catch(e) {
//     console.log("ERROR");
//     console.log(e);
//     console.error(e);
//   }

// }

// const fileName = process.argv.slice(2)[0];

// if(!fileName) { throw "File name is invalid"; }

// const zilliqa = new Zilliqa('https://dev-api.zilliqa.com');

// const chainId = 333; // chainId of the developer testnet
// const msgVersion = 1; // current msgVersion
// const VERSION = bytes.pack(chainId, msgVersion);

// // Populate the wallet with an account
// const privateKey = 'e7bc233b0994d188379d7c4c9053375938a8a7a32d4c0c284da9820d34f298e8';

// zilliqa.wallet.addByPrivateKey(privateKey);

// const address = getAddressFromPrivateKey(privateKey);
// console.log(`My account address is: ${address}`);
// console.log(`My account bech32 address is: ${toBech32Address(address)}`);

// deployContract(fileName);
