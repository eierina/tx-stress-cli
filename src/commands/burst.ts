import * as ethers from 'ethers';
import ora from 'ora';
import chalk from 'chalk';
import { TransactionTracker, sendTransaction } from '../utils/transaction';
import { loadWallets, displayWalletInfo } from '../utils/wallet';

interface BurstCommandOptions {
  node: string;
  keys: string;
  count: string;
  to: string;
  value: string;
  delay: string;
  batchSize: string;
}

export async function burstCommand(options: BurstCommandOptions): Promise<void> {
  console.log(chalk.cyan('\n== Running in BURST mode ==\n'));
  console.log(chalk.gray(`Node URL: ${options.node}`));
  console.log(chalk.gray(`Target count: ${options.count} transactions`));
  console.log(chalk.gray(`Recipient: ${options.to}`));
  console.log(chalk.gray(`Value per tx: ${options.value} ETH`));
  console.log(chalk.gray(`Batch size: ${options.batchSize}`));
  console.log(chalk.gray(`Delay between batches: ${options.delay}ms`));

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
    const batchSize = parseInt(options.batchSize, 10);
    const delayMs = parseInt(options.delay, 10);
    
    console.log(chalk.cyan(`\nStarting burst mode: sending ${txCount} transactions in batches of ${batchSize}\n`));
    
    let txSent = 0;
    let batch = 1;
    
    // Keep sending batches until we reach the target count
    while (txSent < txCount) {
      const currentBatchSize = Math.min(batchSize, txCount - txSent);
      const spinner = ora(`Sending batch ${batch} (${currentBatchSize} transactions)`).start();
      
      const txPromises = [];
      
      for (let i = 0; i < currentBatchSize; i++) {
        // Use round-robin for wallets with balance
        const walletIndex = txSent % wallets.length;
        const wallet = wallets[walletIndex];
        
        if (parseFloat(wallet.balance) <= 0.001) {
          spinner.text = `Skipping wallet ${wallet.address.substring(0, 8)}... due to low balance`;
          continue;
        }
        
        txPromises.push(
          sendTransaction(
            provider, 
            wallet.wallet, 
            options.to, 
            options.value,
            txTracker
          ).catch(err => {
            console.error(chalk.red(`Error sending tx: ${err.message}`));
            return null;
          })
        );
        
        txSent++;
      }
      
      if (txPromises.length > 0) {
        const results = await Promise.all(txPromises);
        const successCount = results.filter(Boolean).length;
        
        spinner.succeed(`Batch ${batch}: Sent ${successCount}/${txPromises.length} transactions successfully`);
        console.log(chalk.cyan(`Progress: ${txSent}/${txCount} transactions sent`));
      } else {
        spinner.fail(`Batch ${batch}: No transactions sent due to low balances`);
      }
      
      batch++;
      
      // Apply delay between batches if specified
      if (delayMs > 0 && txSent < txCount) {
        const delaySpinner = ora(`Waiting ${delayMs}ms before next batch...`).start();
        await new Promise(resolve => setTimeout(resolve, delayMs));
        delaySpinner.succeed('Delay complete');
      }
    }
    
    console.log(chalk.green('\nAll transactions have been sent!'));
    console.log(chalk.yellow('Waiting for confirmations...'));
    
    // Wait for confirmations
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
    console.error(chalk.red(`Error in burst mode: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
