# Transaction Stress Test CLI

A command-line tool for stress testing blockchain nodes with different transaction sending patterns.

## Features

- **Slow Mode**: Send transactions one at a time, waiting for each to be confirmed
- **Timed Mode**: Send transactions timed with mining (after each block)
- **Burst Mode**: Send transactions in batches or bursts at a high rate

## Installation

### Local Installation

```bash
# Clone the repository
git clone https://your-repo/txstress.git
cd txstress

# Install dependencies
npm install

# Build the project
npm run build

# Link the package (makes 'txstress' available globally)
npm link
```

### Global Installation (from npm)

```bash
npm pack
npm install -g .
```

## Usage

### Creating a Key File

Create a text file with Ethereum private keys, one per line. For example `keys.txt`:

```
0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890
```

Ensure these accounts have sufficient funds for the transactions you plan to send.

### Command Line Options

```bash
# Display help
txstress --help

# Slow Mode (one at a time)
txstress slow --node <RPC_URL> --keys <KEY_FILE> --count 10 --value 0.001

# Timed Mode (send after each block)
txstress timed --node <RPC_URL> --keys <KEY_FILE> --count 20 --value 0.001

# Burst Mode (batches of transactions)
txstress burst --node <RPC_URL> --keys <KEY_FILE> --count 50 --batch-size 5 --delay 500

# Fund accounts in key file from a primary account (90% of balance)
txstress fund --node <RPC_URL> --keys <KEY_FILE> --from-pk <PRIVATE_KEY> --percent 90

# Refund all balances to a target address
txstress refund --node <RPC_URL> --keys <KEY_FILE> --to <TARGET_ADDRESS>
```

### Options for All Commands

- `--node <url>`: Blockchain node URL (required)
- `--keys <path>`: Path to file containing private keys (required)
- `--count <number>`: Number of transactions to send (default: 10)
- `--to <address>`: Recipient address (default: zero address)
- `--value <amount>`: Amount of native token to send per transaction (default: 0.001)
- `--gas-limit <number>`, `-g`: Gas limit for transactions (default: 21000)
- `--manual-nonce`, `-m`: Enable manual nonce management for high-throughput scenarios (default: false)

### Additional Options for Burst Mode

- `--batch-size <number>`, `-b`: Number of transactions in each batch (default: 5)
- `--delay <ms>`, `-d`: Delay between batches in milliseconds (default: 0)

### Options for Fund Command

- `--from-pk <privateKey>`: Private key of the funding account (required)
- `--percent <number>`, `-p`: Percentage of funding account's balance to distribute (default: 90)

### Options for Refund Command

- `--to <address>`: Address to send all funds to (required)
- `--percent <number>`, `-p`: Percentage of each account's balance to transfer (default: 100)

## Example Usage

### Slow Mode

```bash
txstress slow --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --count 5 --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --value 0.0001
```

### Timed Mode

```bash
txstress timed --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --count 10 --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --value 0.0001
```

### Burst Mode

```bash
txstress burst --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --count 20 --batch-size 5 --delay 100 --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --value 0.0001 --manual-nonce
```

### Fund Accounts

```bash
txstress fund --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --from-pk 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef --percent 90 --gas-limit 21000
```

### Refund Balances

```bash
txstress refund --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --percent 100 --gas-limit 21000
```

### Using Manual Nonce Management

For high-throughput scenarios, especially when sending many transactions in burst mode, enable manual nonce management to avoid "nonce too low" errors:

```bash
txstress burst --node <RPC_URL> --keys <KEY_FILE> --count 50 --batch-size 10 --manual-nonce
```

This feature maintains a local nonce counter for each wallet address, ensuring each transaction uses the correct nonce even when sending transactions rapidly.

### Funding Accounts for Testing

Before running stress tests, you can distribute funds from a primary account to all the accounts in your keys file:

```bash
txstress fund --node <RPC_URL> --keys <KEY_FILE> --from-pk <PRIMARY_PRIVATE_KEY> --percent 90
```

This distributes 90% of the primary account's balance equally among all accounts in the keys file, reserving some for gas fees.

### Collecting Funds After Testing

After testing is complete, you can collect remaining funds back to a single address:

```bash
txstress refund --node <RPC_URL> --keys <KEY_FILE> --to <DESTINATION_ADDRESS> --percent 100
```

This sends all balances (minus gas fees) from each account in the keys file to the specified destination address.

## Development

```bash
# Run in development mode
npm run dev -- slow --node <RPC_URL> --keys <KEY_FILE>
```

## License

MIT
