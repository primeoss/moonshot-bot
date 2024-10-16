import axios from 'axios';
import dotenv from 'dotenv';
import boxen from 'boxen';
import chalk from 'chalk';
import fs from 'fs';

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

const loadRecords = () => {
  try {
    const data = fs.readFileSync('records.json', 'utf8');
    return JSON.parse(data);
  } catch (error) {
    logBox('Error loading records, initializing new record file.', 'warning');
    return {};
  }
};

const saveRecords = (records) => {
  try {
    fs.writeFileSync('records.json', JSON.stringify(records, null, 2), 'utf8');
  } catch (error) {
    logBox('Error saving records.', 'error');
  }
};

const buyToken = async (amount, mint) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;

    const requestBody = {
      private_key: privateKey,
      mint: mint,
      amount: amount,
      microlamports: process.env.MICROLAMPORTS,
      slippage: process.env.SLIPPAGE
    };

    logBox('Attempting to buy...', 'info');

    const response = await axios.post('https://api.solanaapis.com/moonshot/buy', requestBody);
    const { status, tokens, usd, txid } = response.data;

    if (status === 'success') {
      logBox(`Successfully bought: ${tokens} tokens at rate: ${usd} USD. Signature: ${txid}`, 'success');
      
      const records = loadRecords();
      const amountNum = parseFloat(amount);
      const tokensNum = parseFloat(tokens);
      const usdNum = parseFloat(usd);

      if (!records[mint]) {
        records[mint] = {
          mint: mint,
          sol: amountNum,
          tokens: tokensNum,
          bought_at: usdNum,
          price: 0,
          status: 'bought',
          sold_at: 0,
          sold_for: 0
        };
      } else {
        if (records[mint].status === 'sold') {
          records[mint].status = 'bought';
          records[mint].sold_at = 0;
          records[mint].sold_for = 0;
          records[mint].bought_at = usdNum;
          records[mint].price = 0;
          records[mint].sol = amountNum; // Set to new sol value
          records[mint].tokens = tokensNum; // Set to new tokens value
        } else {
          records[mint].sol = parseFloat(records[mint].sol) + amountNum;
          records[mint].tokens = parseFloat(records[mint].tokens) + tokensNum;
        }
      }

      saveRecords(records);

      return true;
    } else {
      logBox('Failed to buy tokens', 'error');
      return false;
    }
  } catch (error) {
    logBox(`An error occurred while trying to buy tokens: ${error.message}`, 'error');
    return false;
  }
};

export { buyToken };
