const path = require('path');
const fs = require('fs');
const solc = require('solc');

// Specify the path to your Solidity contract
const ticketSalePath = path.resolve(__dirname, 'contracts', 'TicketSale.sol');
const source = fs.readFileSync(ticketSalePath, 'utf8');

// Prepare input for the Solidity compiler
let input = {
    language: "Solidity",
    sources: {
        "TicketSale.sol": {
            content: source,
        },
    },
    settings: {
        outputSelection: {
            "*": {
                "*": ["abi", "evm.bytecode"],
            },
        },
    },
};

const stringInput = JSON.stringify(input);

// Compile the contract
const compiledCode = solc.compile(stringInput);

// Parse the output
const output = JSON.parse(compiledCode);

// Extract contract output
const contractOutput = output.contracts;

// Access the specific contract
const ticketSaleOutput = contractOutput["TicketSale.sol"]; 

// Extract ABI and Bytecode
const ticketSaleABI = ticketSaleOutput.TicketSale.abi; 
const ticketSaleBytecode = ticketSaleOutput.TicketSale.evm.bytecode.object;

// Log the ABI and Bytecode (if we want to see it in the console)
console.log('ABI:', JSON.stringify(ticketSaleABI, null, 2));
console.log('Bytecode:', ticketSaleBytecode);

// Export ABI and Bytecode
module.exports = {
    abi: ticketSaleABI,
    bytecode: ticketSaleBytecode,
};
