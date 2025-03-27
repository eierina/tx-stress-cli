import * as ethers from 'ethers';
import chalk from 'chalk';

export interface TxDetails {
  hash: string;
  timestamp: number;
  blockNumber?: number;
  confirmationTime?: number;
}

export class TransactionTracker {
  private pendingTxs = new Map<string, TxDetails>();
  private completedTxs = new Map<string, TxDetails>();
  private provider: ethers.providers.JsonRpcProvider;

  constructor(provider: ethers.providers.JsonRpcProvider) {
    this.provider = provider;
    this.setupBlockListener();
  }

  private setupBlockListener() {
    this.provider.on('block', async (blockNumber: number) => {
      const block = await this.provider.getBlockWithTransactions(blockNumber);
      if (!block || !block.transactions) return;

      for (const tx of block.transactions) {
        // Handle both string and TransactionResponse types
        const hash = typeof tx === 'string' ? tx : (tx as any).hash;
        if (this.pendingTxs.has(hash)) {
          const txDetails = this.pendingTxs.get(hash)!;
          const now = Date.now();
          txDetails.blockNumber = blockNumber;
          txDetails.confirmationTime = (now - txDetails.timestamp) / 1000;
          
          this.completedTxs.set(hash, txDetails);
          this.pendingTxs.delete(hash);
          
          console.log(chalk.green(`✓ Transaction ${hash.substring(0, 8)}... confirmed in block ${blockNumber} (${txDetails.confirmationTime.toFixed(2)}s)`));
        }
      }
    });
  }

  public addTransaction(txHash: string): void {
    this.pendingTxs.set(txHash, {
      hash: txHash,
      timestamp: Date.now()
    });
    console.log(chalk.yellow(`↑ Sent transaction ${txHash.substring(0, 8)}...`));
  }

  public getPendingCount(): number {
    return this.pendingTxs.size;
  }

  public getCompletedCount(): number {
    return this.completedTxs.size;
  }

  public async waitForConfirmations(timeout: number = 300000): Promise<void> {
    if (this.pendingTxs.size === 0) return;
    
    console.log(chalk.cyan(`Waiting for ${this.pendingTxs.size} pending transactions to be confirmed (timeout: ${timeout/1000}s)...`));
    
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.pendingTxs.size === 0) {
          clearInterval(checkInterval);
          clearTimeout(timeoutId);
          resolve();
        }
      }, 1000);
      
      const timeoutId = setTimeout(() => {
        clearInterval(checkInterval);
        console.log(chalk.red(`Timeout waiting for ${this.pendingTxs.size} transactions`));
        for (const [hash, tx] of this.pendingTxs.entries()) {
          console.log(chalk.red(`  - ${hash.substring(0, 8)}... (sent ${(Date.now() - tx.timestamp) / 1000}s ago)`));
        }
        resolve();
      }, timeout);
    });
  }

  public getStats(): { completed: number, pending: number, avgConfirmationTime: number } {
    let totalTime = 0;
    let count = 0;
    
    for (const tx of this.completedTxs.values()) {
      if (tx.confirmationTime) {
        totalTime += tx.confirmationTime;
        count++;
      }
    }
    
    return {
      completed: this.completedTxs.size,
      pending: this.pendingTxs.size,
      avgConfirmationTime: count > 0 ? totalTime / count : 0
    };
  }
}

export async function sendTransaction(
  provider: ethers.providers.JsonRpcProvider,
  wallet: ethers.Wallet,
  to: string,
  value: string,
  tracker: TransactionTracker
): Promise<string> {
  try {
    // For JsonRpcProvider, we can get the gas price
    const gasPrice = await provider.getFeeData().then((fees: any) => fees.gasPrice);
    
    const tx = await wallet.sendTransaction({
      to,
      value: ethers.utils.parseEther(value),
      gasPrice,
      gasLimit: 21000, // Simple ETH transfer
    });
    
    tracker.addTransaction(tx.hash);
    return tx.hash;
  } catch (error) {
    console.error(chalk.red(`Error sending transaction: ${error instanceof Error ? error.message : String(error)}`));
    throw error;
  }
}