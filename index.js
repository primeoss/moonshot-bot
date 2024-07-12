// Suppress specific warnings
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && typeof data === 'object' && data.message.includes('bigint')) {
    return;
  }
  return originalEmit.apply(process, arguments);
};

import readline from 'readline';
import boxen from 'boxen';
import chalk from 'chalk';
import { buyToken } from './src/buy.js';
import { sellToken } from './src/sell.js';
import { checkBalance } from './src/balance.js';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const boxenOptions = {
  padding: 1,
  margin: 1,
  borderStyle: 'round',
  borderColor: 'green',
  backgroundColor: '#555555'
};

const logBox = (message, type = 'info') => {
  let colorFunc = chalk.white;
  switch(type) {
    case 'success':
      colorFunc = chalk.green;
      break;
    case 'error':
      colorFunc = chalk.red;
      break;
    case 'warning':
      colorFunc = chalk.yellow;
      break;
    default:
      colorFunc = chalk.white;
  }
  console.log(boxen(colorFunc(message), boxenOptions));
};

const listenForCommands = () => {
  rl.question(chalk.yellowBright('Enter command: '), async (command) => {
    const [action, amountOrMint, mint] = command.split(' ');

    try {
      if (action === 'buy' && amountOrMint && mint) {
        const success = await buyToken(amountOrMint, mint);
      } else if (action === 'sell' && amountOrMint && mint) {
        const success = await sellToken(amountOrMint, mint);
      } else if (action === 'balance' && amountOrMint) {
        logBox('Checking token balance...', 'info');
        const balance = await checkBalance(amountOrMint);
        if (balance !== null) {
          logBox(`Checked balance for ${amountOrMint}\nYour Balance is: ${balance}`, 'success');
        } else {
          logBox('Failed to check balance', 'error');
        }
      } else {
        logBox('Invalid command. Usage: buy <amount> <mint>, sell <amount> <mint>, or balance <mint>', 'warning');
      }
    } catch (error) {
      logBox(`Error: ${error.message}`, 'error');
    }

    listenForCommands(); // Continue listening for commands
  });
};

listenForCommands();