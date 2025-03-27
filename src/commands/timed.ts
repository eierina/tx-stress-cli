import * as ethers from 'ethers';
import ora from 'ora';
import chalk from 'chalk';
import { TransactionTracker, sendTransaction } from '../utils/transaction';
import { loadWallets, displayWalletInfo } from '../utils/wallet';

interface TimedCommandOptions {
  node: string;
  keys: string;
  count: string;
  to: string;
  value: string;
  manualNonce: boolean;
  gasLimit: string;
}

export async function timedCommand(options: TimedCommandOptions): Promise<void> {
  console.log(chalk.cyan('\n== Running in TIMED WITH MINING mode ==\n'));
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
    let txSent = 0;
    
    console.log(chalk.cyan(`\nStarting timed with mining mode: sending ${txCount} transactions after blocks are mined\n`));
    console.log(chalk.yellow('Waiting for new blocks...'));
    
    // Setup block listener to send transactions after each new block
    const blockSubscription = provider.on('block', async (blockNumber: number) => {
      if (txSent >= txCount) {
        provider.removeAllListeners('block');
        return;
      }
      
      console.log(chalk.cyan(`\nNew block detected: ${blockNumber}. Sending transactions...`));
      
      // Send one transaction from each wallet with balance
      const txPromises = [];
      
      for (const wallet of wallets) {
        if (txSent >= txCount) break;
        
        if (parseFloat(wallet.balance) <= 0.001) {
          console.log(chalk.yellow(`Skipping wallet ${wallet.address} due to low balance`));
          continue;
        }
        
        txPromises.push(
          sendTransaction(
            provider, 
            wallet.wallet, 
            options.to, 
            options.value,
            txTracker,
            options.manualNonce,
            parseInt(options.gasLimit, 10)
          ).catch(err => {
            console.error(chalk.red(`Error sending tx: ${err.message}`));
            return null;
          })
        );
        
        txSent++;
      }
      
      if (txPromises.length > 0) {
        await Promise.all(txPromises);
        console.log(chalk.green(`Sent ${txPromises.length} transactions after block ${blockNumber}`));
        console.log(chalk.cyan(`Progress: ${txSent}/${txCount} transactions sent`));
      }
      
      if (txSent >= txCount) {
        console.log(chalk.green('\nAll transactions have been sent!'));
        console.log(chalk.yellow('Waiting for confirmations...'));
        provider.removeAllListeners('block');
        
        // Wait for confirmations then display results
        await txTracker.waitForConfirmations();
        
        const stats = txTracker.getStats();
        console.log(chalk.green(`\n\nTest completed successfully!`));
        console.log(chalk.cyan(`Completed transactions: ${stats.completed}`));
        console.log(chalk.cyan(`Pending transactions: ${stats.pending}`));
        console.log(chalk.cyan(`Average confirmation time: ${stats.avgConfirmationTime.toFixed(2)} seconds`));
        
        // Cleanup and exit
        process.exit(0);
      }
    });
    
    // Set a timeout to exit if no blocks are produced in a reasonable time
    setTimeout(() => {
      if (txSent < txCount) {
        console.log(chalk.red('\nTimeout: No new blocks detected for too long.'));
        provider.removeAllListeners('block');
        process.exit(1);
      }
    }, 600000); // 10 minutes
  } catch (error) {
    console.error(chalk.red(`Error in timed mode: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}
