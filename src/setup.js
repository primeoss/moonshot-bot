import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get the current directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const askQuestion = (question) => {
    return new Promise((resolve) => rl.question(question, resolve));
};

const writeEnvFile = (content) => {
    const envPath = path.resolve(__dirname, '../.env');
    fs.writeFileSync(envPath, content);
};

(async () => {
    try {
        const privateKey = await askQuestion('Enter your private key: ');
        const microlamports = await askQuestion('Enter fee lamports (e.g., 50000 or 500000): ');
        const slippage = await askQuestion('Enter slippage tolerance (e.g., 100 for 1%): ');
        const priceCheckDelay = await askQuestion('Enter delay for price check in milliseconds (1000 = 1 second): ');
        const takeProfit = await askQuestion('Enter take profit (just the number, e.g., 10 or 20): ');
        const stopLoss = await askQuestion('Enter stop loss (just the number, e.g., 10 or 20): ');
        const maxSellRetries = await askQuestion('Enter the number of retry attempts for failed sell operations (e.g., 5 for default): ');

        const envContent = `
PRIVATE_KEY=${privateKey}
MICROLAMPORTS=${microlamports}
SLIPPAGE=${slippage}
PRICE_CHECK_DELAY=${priceCheckDelay}
TAKE_PROFIT=${takeProfit}
STOP_LOSS=${stopLoss}
MAX_SELL_RETRIES=${maxSellRetries}
`;

        writeEnvFile(envContent.trim());

        console.log('.env is now configured');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        rl.close();
    }
})();