const readline = require('readline');
const fs = require('fs');
const path = require('path');

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
        const microlamports = await askQuestion('Enter Fee lamports example 50000 or 500000: ');
        const slippage = await askQuestion('Enter slippage tolerance example 100 for 1%: ');

        const envContent = `PRIVATE_KEY=${privateKey}\nMICROLAMPORTS=${microlamports}\nSLIPPAGE=${slippage}\n`;

        writeEnvFile(envContent);

        console.log('.ENV is now configured');
    } catch (error) {
        console.error('An error occurred:', error);
    } finally {
        rl.close();
    }
})();