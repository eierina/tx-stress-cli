import * as ethers from 'ethers';
import ora from 'ora';
import chalk from 'chalk';
import { TransactionTracker, sendTransaction } from '../utils/transaction';
import { loadWallets, displayWalletInfo, WalletInfo } from '../utils/wallet';

interface SlowCommandOptions {
  node: string;
  keys: string;
  count: string;
  to: string;
  value: string;
  manualNonce: boolean;
  gasLimit: string;
}

export async function slowCommand(options: SlowCommandOptions): Promise<void> {
  console.log(chalk.cyan('\n== Running in SLOW mode ==\n'));
  console.log(chalk.gray(`Node URL: ${options.node}`));
  console.log(chalk.gray(`Target count: ${options.count} transactions`));
  console.log(chalk.gray(`Recipient: ${options.to}`));
  console.log(chalk.gray(`Value per tx: ${options.value} ETH`));
  console.log(chalk.gray(`Gas limit: ${options.gasLimit}`));
  console.log(chalk.gray(`Manual nonce management: ${options.manualNonce ? 'Enabled' : 'Disabled'}`));

  try {
    // Connect to the provider
    const provider = new ethers.providers.JsonRpcProvider(options.node);
    await provider.getNetwork(); // Check connection
    
    // Load wallets
    const wallets = await loadWallets(options.keys, provider);
    displayWalletInfo(wallets);
    
    // Check if any wallet has balance
    const hasBalance = wallets.some(w => parseFloat(w.balance) > 0);
    if (!hasBalance) {
      console.error(chalk.red('Error: None of the wallets have balance. Please fund at least one wallet.'));
      process.exit(1);
    }
    
    // Create transaction tracker
    const txTracker = new TransactionTracker(provider);
    
    const txCount = parseInt(options.count, 10);
    console.log(chalk.cyan(`\nStarting slow mode: sending ${txCount} transactions sequentially\n`));
    
    // Run slow mode (one tx at a time, waiting for confirmation)
    for (let i = 0; i < txCount; i++) {
      // Use round-robin for wallets with balance
      const walletIndex = i % wallets.length;
      const wallet = wallets[walletIndex];
      
      if (parseFloat(wallet.balance) <= 0.001) { // Skip if balance too low
        console.log(chalk.yellow(`Skipping wallet ${wallet.address} due to low balance`));
        continue;
      }
      
      const spinner = ora(`Sending transaction ${i + 1}/${txCount}`).start();
      
      try {
        const txHash = await sendTransaction(
          provider,
          wallet.wallet,
          options.to,
          options.value,
          txTracker,
          options.manualNonce,
          parseInt(options.gasLimit, 10)
        );
        
        spinner.succeed(`Transaction ${i + 1}/${txCount} sent: ${txHash.substring(0, 8)}...`);
        
        // Wait for this transaction to be confirmed before sending the next
        spinner.text = 'Waiting for confirmation';
        spinner.start();
        
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (txTracker.getPendingCount() === 0) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 1000);
        });
        
        spinner.succeed(`Transaction confirmed. Moving to next transaction.`);
      } catch (error) {
        spinner.fail(`Failed to send transaction: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Wait for any remaining transactions
    await txTracker.waitForConfirmations();
    
    // Display results
    const stats = txTracker.getStats();
    console.log(chalk.green(`\n\nTest completed successfully!`));
    console.log(chalk.cyan(`Completed transactions: ${stats.completed}`));
    console.log(chalk.cyan(`Pending transactions: ${stats.pending}`));
    console.log(chalk.cyan(`Average confirmation time: ${stats.avgConfirmationTime.toFixed(2)} seconds`));
    
    // Cleanup and exit
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Error in slow mode: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
