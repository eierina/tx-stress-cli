# txstress

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
npm install -g txstress
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
```

### Options for All Commands

- `--node <url>`: Blockchain node URL (required)
- `--keys <path>`: Path to file containing private keys (required)
- `--count <number>`: Number of transactions to send (default: 10)
- `--to <address>`: Recipient address (default: zero address)
- `--value <amount>`: Amount of native token to send per transaction (default: 0.001)

### Additional Options for Burst Mode

- `--batch-size <number>`: Number of transactions in each batch (default: 5)
- `--delay <ms>`: Delay between batches in milliseconds (default: 0)

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
txstress burst --node https://sepolia.infura.io/v3/YOUR_API_KEY --keys ./keys.txt --count 20 --batch-size 5 --delay 100 --to 0x742d35Cc6634C0532925a3b844Bc454e4438f44e --value 0.0001
```

## Development

```bash
# Run in development mode
npm run dev -- slow --node <RPC_URL> --keys <KEY_FILE>
```

## License

MIT
