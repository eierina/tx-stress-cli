import * as ethers from 'ethers';
import ora from 'ora';
import chalk from 'chalk';
import { loadWallets, displayWalletInfo } from '../utils/wallet';

interface FundCommandOptions {
  node: string;
  keys: string;
  fromPk: string;
  percent: string;
  gasLimit: string;
}

export async function fundCommand(options: FundCommandOptions): Promise<void> {
  console.log(chalk.cyan('\n== Running FUND operation ==\n'));
  console.log(chalk.gray(`Node URL: ${options.node}`));
  
  // Hide private key from logs for security
  const pkPrefix = options.fromPk.substring(0, 6);
  const pkSuffix = options.fromPk.substring(options.fromPk.length - 4);
  console.log(chalk.gray(`Source private key: ${pkPrefix}...${pkSuffix}`));
  
  console.log(chalk.gray(`Percent to distribute: ${options.percent}%`));
  console.log(chalk.gray(`Gas limit: ${options.gasLimit}`));

  try {
    // Connect to the provider
    const provider = new ethers.providers.JsonRpcProvider(options.node);
    await provider.getNetwork(); // Check connection
    
    // Create wallet from private key
    const sourceWallet = new ethers.Wallet(options.fromPk, provider);
    
    // Get source wallet balance
    const sourceBalanceWei = await provider.getBalance(sourceWallet.address);
    const sourceBalance = ethers.utils.formatEther(sourceBalanceWei);
    
    console.log(chalk.cyan(`\nSource account: ${sourceWallet.address}`));
    console.log(chalk.cyan(`Source balance: ${sourceBalance} ETH`));
    
    if (sourceBalanceWei.isZero()) {
      console.error(chalk.red('Error: Source account has no balance. Cannot fund other accounts.'));
      process.exit(1);
    }
    
    // Load target wallets from key file
    const targetWallets = await loadWallets(options.keys, provider);
    
    // Filter out the source wallet from the target list if it happens to be there
    const filteredWallets = targetWallets.filter(w => w.address !== sourceWallet.address);
    
    if (filteredWallets.length === 0) {
      console.error(chalk.red('Error: No valid target wallets found in key file.'));
      process.exit(1);
    }
    
    console.log(chalk.cyan(`\nFound ${filteredWallets.length} wallets to fund:`));
    displayWalletInfo(filteredWallets);
    
    // Calculate amount to distribute
    const percentToDistribute = Math.min(Math.max(parseInt(options.percent, 10), 1), 100);
    const amountToDistributeWei = sourceBalanceWei.mul(percentToDistribute).div(100);
    
    // Reserve gas for transactions
    const gasLimit = ethers.BigNumber.from(options.gasLimit);
    const gasPrice = await provider.getGasPrice();
    const gasFeesPerTx = gasPrice.mul(gasLimit);
    const totalGasFees = gasFeesPerTx.mul(filteredWallets.length);
    
    // Make sure we have enough balance to cover transactions
    if (amountToDistributeWei.lt(totalGasFees)) {
      console.error(chalk.red(`Error: Not enough balance to cover gas fees for ${filteredWallets.length} transactions.`));
      console.error(chalk.red(`Required for gas: ${ethers.utils.formatEther(totalGasFees)} ETH`));
      console.error(chalk.red(`Available to distribute: ${ethers.utils.formatEther(amountToDistributeWei)} ETH`));
      process.exit(1);
    }
    
    // Calculate amount per wallet
    const amountPerWalletWei = amountToDistributeWei.sub(totalGasFees).div(filteredWallets.length);
    const amountPerWallet = ethers.utils.formatEther(amountPerWalletWei);
    
    console.log(chalk.cyan(`\nDistributing ${percentToDistribute}% of balance:`));
    console.log(chalk.cyan(`- Total to distribute: ${ethers.utils.formatEther(amountToDistributeWei)} ETH`));
    console.log(chalk.cyan(`- Gas fees reserved: ${ethers.utils.formatEther(totalGasFees)} ETH`));
    console.log(chalk.cyan(`- Amount per wallet: ${amountPerWallet} ETH`));
    
    // Confirm with user
    console.log(chalk.yellow(`\nReady to fund ${filteredWallets.length} wallets with ${amountPerWallet} ETH each.`));
    console.log(chalk.yellow(`Press Ctrl+C to cancel or wait 5 seconds to continue...`));
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Send transactions to fund each wallet
    const spinner = ora('Funding wallets...').start();
    
    for (let i = 0; i < filteredWallets.length; i++) {
      spinner.text = `Funding wallet ${i + 1}/${filteredWallets.length}: ${filteredWallets[i].address}`;
      
      try {
        const tx = await sourceWallet.sendTransaction({
          to: filteredWallets[i].address,
          value: amountPerWalletWei,
          gasLimit: gasLimit,
        });
        
        spinner.text = `Waiting for transaction to be mined...`;
        await tx.wait(1); // Wait for 1 confirmation
        
        spinner.succeed(`Funded wallet ${i + 1}/${filteredWallets.length}: ${filteredWallets[i].address} with ${amountPerWallet} ETH`);
      } catch (error) {
        spinner.fail(`Failed to fund wallet ${filteredWallets[i].address}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    
    // Check final balances
    spinner.text = 'Updating wallet balances...';
    spinner.start();
    
    const updatedWallets = await loadWallets(options.keys, provider);
    spinner.succeed('Funding complete!');
    
    console.log(chalk.cyan('\nUpdated wallet balances:'));
    displayWalletInfo(updatedWallets);
    
    // Check source wallet final balance
    const finalSourceBalanceWei = await provider.getBalance(sourceWallet.address);
    const finalSourceBalance = ethers.utils.formatEther(finalSourceBalanceWei);
    console.log(chalk.cyan(`\nSource account final balance: ${finalSourceBalance} ETH`));
    
    console.log(chalk.green('\nFunding operation completed successfully!'));
    process.exit(0);
  } catch (error) {
    console.error(chalk.red(`Error in fund command: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}