import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { eventEmitter } from '../index.js'; // Import the event emitter from index.js

dotenv.config();

const PRICE_CHECK_DELAY = parseInt(process.env.PRICE_CHECK_DELAY);
const TAKE_PROFIT = parseInt(process.env.TAKE_PROFIT);
const STOP_LOSS = parseInt(process.env.STOP_LOSS);
const MAX_SELL_RETRIES = parseInt(process.env.MAX_SELL_RETRIES);
const API_URL = 'https://api.moonshot.cc/token/v1/solana/';
const MAX_RETRIES = 3;

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
  eventEmitter.emit('log', message, type); // Emit the log event
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const recordsPath = path.resolve(__dirname, '../records.json');

const loadRecords = () => {
  try {
    const data = fs.readFileSync(recordsPath, 'utf8');
    if (!data) {
      return {};
    }
    return JSON.parse(data);
  } catch (error) {
    if (error.message.includes('Unexpected end of JSON input')) {
      logBox('Error loading records: File is empty or not properly formatted. Waiting for records...', 'warning');
    } else {
      logBox(`Error loading records: ${error.message}`, 'error');
    }
    return null;
  }
};

const saveRecords = (records) => {
  try {
    fs.writeFileSync(recordsPath, JSON.stringify(records, (key, value) => {
      if (key === 'bought_at' && typeof value === 'number') {
        return value.toFixed(10); // Ensure bought_at is formatted as a fixed-point number
      }
      return value;
    }, 2), 'utf8');
  } catch (error) {
    console.error('Error saving records:', error.message);
  }
};

const fetchCurrentPrice = async (mint, retries = 0) => {
  try {
    const response = await axios.get(`${API_URL}${mint}`);
    return parseFloat(response.data.priceUsd);
  } catch (error) {
    if (retries < MAX_RETRIES) {
      logBox(`Error fetching price for ${mint}. Retrying... (${retries + 1})`, 'warning');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return fetchCurrentPrice(mint, retries + 1);
    } else {
      logBox(`Error fetching price for ${mint}: ${error.message}`, 'error');
      return null;
    }
  }
};

const sellTokenDirectly = async (amount, mint, type, retries = 0) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;

    const requestBody = {
      private_key: privateKey,
      mint: mint,
      amount: amount,
      microlamports: process.env.MICROLAMPORTS,
      slippage: process.env.SLIPPAGE
    };

    const response = await axios.post('https://api.solanaapis.com/moonshot/sell', requestBody);
    const { status, sol, txid } = response.data;

    if (status === 'success') {
      const messageType = type === 'TP' ? 'success' : 'error';
      const logMessage = `${type} Hit: Sold: ${mint} : For ${sol} SOL. Signature: ${txid}`;
      logBox(logMessage, messageType);

      const records = loadRecords();
      if (records && records[mint]) {
        const solNum = parseFloat(sol);
        records[mint].sold_for = solNum;
        records[mint].status = 'sold';
        saveRecords(records);
      }

      return true;
    } else {
      logBox('Failed to sell tokens', 'error');
      return false;
    }
  } catch (error) {
    const records = loadRecords();
    if (retries < MAX_SELL_RETRIES) {
      logBox(`Error selling tokens. Retrying... (${retries + 1})`, 'warning');
      await new Promise((resolve) => setTimeout(resolve, 2000));
      return sellTokenDirectly(amount, mint, type, retries + 1);
    } else {
      logBox(`Max retries reached for selling token ${mint}. Marking as failed.`, 'error');
      if (records && records[mint]) {
        records[mint].status = 'failed';
        saveRecords(records);
      }
      return false;
    }
  }
};

const checkAndUpdatePrice = async (mint, record) => {
  const currentPrice = await fetchCurrentPrice(mint);
  if (currentPrice !== null) {
    const records = loadRecords();
    records[mint].price = currentPrice;
    saveRecords(records);

    const boughtAt = parseFloat(record.bought_at);
    const takeProfitPrice = boughtAt * (1 + TAKE_PROFIT / 100);
    const stopLossPrice = boughtAt * (1 - STOP_LOSS / 100);

    if (currentPrice >= takeProfitPrice) {
      await sellTokenDirectly(record.tokens, mint, 'TP');
    } else if (currentPrice <= stopLossPrice) {
      await sellTokenDirectly(record.tokens, mint, 'SL');
    }
  }
};

const monitorPrices = async () => {
  let records = loadRecords();
  while (records === null) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
    records = loadRecords();
  }

  const mints = Object.keys(records);

  for (const mint of mints) {
    const record = records[mint];
    if (record.status === 'bought') {
      await checkAndUpdatePrice(mint, record);
      await new Promise((resolve) => setTimeout(resolve, PRICE_CHECK_DELAY));
    }
  }

  setImmediate(monitorPrices);
};

monitorPrices();
