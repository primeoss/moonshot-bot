// Suppress specific warnings
const originalEmit = process.emit;
process.emit = function (name, data, ...args) {
  if (name === 'warning' && typeof data === 'object' && data.message.includes('bigint')) {
    return;
  }
  return originalEmit.apply(process, [name, data, ...args]);
};

import readline from 'readline';
import boxen from 'boxen';
import chalk from 'chalk';
import { buyToken } from './src/buy.js';
import { sellToken } from './src/sell.js';
import { checkBalance } from './src/balance.js';
import './src/tpsl.js'; // Import the tpsl script to start monitoring prices
import { EventEmitter } from 'events';

const eventEmitter = new EventEmitter();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: chalk.yellowBright('Enter command: ')
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
  switch (type) {
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

const handleCommand = async (command) => {
  const [action, amountOrMint, mint] = command.split(' ');

  try {
    if (action === 'buy' && amountOrMint && mint) {
      await buyToken(amountOrMint, mint);
    } else if (action === 'sell' && amountOrMint && mint) {
      await sellToken(amountOrMint, mint);
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
};

rl.prompt();

rl.on('line', async (line) => {
  await handleCommand(line.trim());
  rl.prompt();
}).on('close', () => {
  console.log('Have a great day!');
  process.exit(0);
});

eventEmitter.on('log', (message, type) => {
  logBox(message, type);
  rl.prompt(); // Ensure the prompt is shown after logging from tpsl.js
});

export { eventEmitter }; // Export the event emitter to be used in tpsl.js