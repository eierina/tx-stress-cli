import * as ethers from 'ethers';
import ora from 'ora';
import chalk from 'chalk';
import { loadWallets, displayWalletInfo } from '../utils/wallet';

interface RefundCommandOptions {
  node: string;
  keys: string;
  to: string;
  percent: string;
  gasLimit: string;
}

export async function refundCommand(options: RefundCommandOptions): Promise<void> {
  console.log(chalk.cyan('\n== Running REFUND operation ==\n'));
  console.log(chalk.gray(`Node URL: ${options.node}`));
  console.log(chalk.gray(`Target address: ${options.to}`));
  console.log(chalk.gray(`Percent to refund: ${options.percent}%`));
  console.log(chalk.gray(`Gas limit: ${options.gasLimit}`));

  try {
    // Connect to the provider
    const provider = new ethers.providers.JsonRpcProvider(options.node);
    await provider.getNetwork(); // Check connection
    
    // Validate target address
    if (!ethers.utils.isAddress(options.to)) {
      console.error(chalk.red(`Error: Invalid target address: ${options.to}`));
      process.exit(1);
    }
    
    // Load wallets from key file
    const wallets = await loadWallets(options.keys, provider);
    
    if (wallets.length === 0) {
      console.error(chalk.red('Error: No valid wallets found in key file.'));
      process.exit(1);
    }
    
    // Display initial balances
    console.log(chalk.cyan(`\nFound ${wallets.length} wallets:`));
    displayWalletInfo(wallets);
    
    // Filter out wallets with no balance
    const walletsWithBalance = wallets.filter(w => parseFloat(w.balance) > 0);
    
    if (walletsWithBalance.length === 0) {
      console.error(chalk.red('Error: None of the wallets have any balance to refund.'));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`\nFound ${walletsWithBalance.length} wallets with balance:`));
    displayWalletInfo(walletsWithBalance);
    
    // Parse percentage
    const percentToRefund = Math.min(Math.max(parseInt(options.percent, 10), 1), 100);
    const gasLimit = ethers.BigNumber.from(options.gasLimit);
    
    // Confirm with user
    console.log(chalk.yellow(`\nReady to refund ${percentToRefund}% of balance from ${walletsWithBalance.length} wallets to ${options.to}.`));
    console.log(chalk.yellow(`Press Ctrl+C to cancel or wait 5 seconds to continue...`));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Send transactions to refund each wallet
    const spinner = ora('Refunding from wallets...').start();
    let totalRefundedWei = ethers.BigNumber.from(0);
    let successCount = 0;
    
    for (let i = 0; i < walletsWithBalance.length; i++) {
      const walletInfo = walletsWithBalance[i];
      spinner.text = `Refunding from wallet ${i + 1}/${walletsWithBalance.length}: ${walletInfo.address}`;
      
      try {
        // Calculate amount to refund
        const balanceWei = await provider.getBalance(walletInfo.address);
        const gasPrice = await provider.getGasPrice();
        const gasFeeWei = gasPrice.mul(gasLimit);
        
        // Skip if balance is too low to cover gas
        if (balanceWei.lte(gasFeeWei)) {
          spinner.warn(`Skipping wallet ${walletInfo.address}: Balance too low to cover gas fees`);
          continue;
        }
        
        // Calculate refund amount
        let refundAmountWei;
        if (percentToRefund === 100) {
          // Send max amount (all balance minus gas fee)
          refundAmountWei = balanceWei.sub(gasFeeWei);
        } else {
          // Send percentage of balance
          refundAmountWei = balanceWei.mul(percentToRefund).div(100);
          
          // Make sure we have enough left for gas (adjust if needed)
          if (balanceWei.sub(refundAmountWei).lt(gasFeeWei)) {
            refundAmountWei = balanceWei.sub(gasFeeWei);
          }
        }
        
        // Skip if amount too small
        if (refundAmountWei.lte(0)) {
          spinner.warn(`Skipping wallet ${walletInfo.address}: Refund amount too small`);
          continue;
        }
        
        // Send transaction
        const tx = await walletInfo.wallet.sendTransaction({
          to: options.to,
          value: refundAmountWei,
          gasLimit: gasLimit,
        });
        
        spinner.text = `Waiting for transaction to be mined...`;
        await tx.wait(1); // Wait for 1 confirmation
        
        // Add to total
        totalRefundedWei = totalRefundedWei.add(refundAmountWei);
        successCount++;
        
        spinner.succeed(`Refunded ${ethers.utils.formatEther(refundAmountWei)} ETH from wallet ${i + 1}/${walletsWithBalance.length}: ${walletInfo.address}`);
      } catch (error) {
        spinner.fail(`Failed to refund from wallet ${walletInfo.address}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Check target address balance
    const targetBalanceWei = await provider.getBalance(options.to);
    const targetBalance = ethers.utils.formatEther(targetBalanceWei);
    
    // Display summary
    console.log(chalk.green(`\nRefund operation completed!`));
    console.log(chalk.cyan(`Successfully refunded from ${successCount}/${walletsWithBalance.length} wallets`));
    console.log(chalk.cyan(`Total amount refunded: ${ethers.utils.formatEther(totalRefundedWei)} ETH`));
    console.log(chalk.cyan(`Target address balance: ${targetBalance} ETH`));
    
    // Check final balances of source wallets
    spinner.text = 'Updating wallet balances...';
    spinner.start();
    
    const updatedWallets = await loadWallets(options.keys, provider);
    spinner.succeed('All done!');
    
    console.log(chalk.cyan('\nUpdated wallet balances:'));
    displayWalletInfo(updatedWallets);
    
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Error in refund command: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}