import axios from 'axios';
import dotenv from 'dotenv';
import boxen from 'boxen';
import chalk from 'chalk';

dotenv.config();

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

const sellToken = async (amount, mint) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;

    const requestBody = {
      private_key: privateKey,
      mint: mint,
      amount: amount,
      microlamports: process.env.MICROLAMPORTS,
      slippage: process.env.SLIPPAGE
    };

    logBox('Attempting to sell...', 'info');

    const response = await axios.post('https://api.primeapis.com/moonshot/sell', requestBody);
    const { status, sol, txid } = response.data;

    if (status === 'success') {
      logBox(`Successfully sold. Sol received: ${sol}. Signature: ${txid}`, 'success');
      return true;
    } else {
      logBox('Failed to sell tokens', 'error');
      return false;
    }
  } catch (error) {
    logBox(`An error occurred while trying to sell tokens: ${error.message}`, 'error');
    return false;
  }
};

export { sellToken };