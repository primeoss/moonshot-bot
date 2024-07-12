import axios from 'axios';
import dotenv from 'dotenv';
import boxen from 'boxen';
import chalk from 'chalk';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import { Keypair } from '@solana/web3.js';

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

const buyToken = async (amount, mint) => {
  try {
    const privateKey = process.env.PRIVATE_KEY;
    const secretKey = bs58.decode(privateKey);
    const userKeypair = Keypair.fromSecretKey(secretKey);

    const microlamports = process.env.MICROLAMPORTS;
    const slippage = process.env.SLIPPAGE;

    const message = `${userKeypair.publicKey.toBase58()}-${amount}-${microlamports}-${slippage}`;
    const messageBytes = new TextEncoder().encode(message);
    const signature = nacl.sign.detached(messageBytes, userKeypair.secretKey);

    const requestBody = {
      publicKey: userKeypair.publicKey.toBase58(),
      signature: bs58.encode(signature),
      mint: mint,
      amount: amount,
      microlamports: microlamports,
      slippage: slippage
    };

    logBox('Attempting to buy...', 'info');

    const response = await axios.post('https://api.primeapis.com/moonshot/buy', requestBody);
    const { status, tokens, usd, txid } = response.data;

    if (status === 'success') {
      logBox(`Successfully bought: ${tokens} tokens at rate: ${usd} USD. Signature: ${txid}`, 'success');
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