import * as ethers from 'ethers';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';

export interface WalletInfo {
  wallet: ethers.Wallet;
  address: string;
  balance: string;
}

export async function loadWallets(
  keyFilePath: string,
  provider: ethers.providers.JsonRpcProvider
): Promise<WalletInfo[]> {
  try {
    const fullPath = path.resolve(keyFilePath);
    const content = fs.readFileSync(fullPath, 'utf8');
    const privateKeys = content
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (privateKeys.length === 0) {
      throw new Error('No private keys found in the file');
    }

    console.log(chalk.cyan(`Loading ${privateKeys.length} wallets...`));
    
    const walletPromises = privateKeys.map(async (privateKey) => {
      const wallet = new ethers.Wallet(privateKey, provider);
      const address = wallet.address;
      const balanceWei = await provider.getBalance(address);
      const balance = ethers.utils.formatEther(balanceWei);
      
      return { wallet, address, balance };
    });

    return await Promise.all(walletPromises);
  } catch (error) {
    console.error(chalk.red(`Error loading wallets: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}

export function displayWalletInfo(wallets: WalletInfo[]): void {
  console.log(chalk.cyan('\nWallet Information:'));
  console.log(chalk.cyan('-------------------'));
  
  wallets.forEach((info, index) => {
    const hasBalance = parseFloat(info.balance) > 0;
    const balanceColor = hasBalance ? chalk.green : chalk.red;
    
    console.log(`${index + 1}. ${info.address} - Balance: ${balanceColor(info.balance)} ETH`);
  });
  
  console.log(); // Empty line for better readability
}
