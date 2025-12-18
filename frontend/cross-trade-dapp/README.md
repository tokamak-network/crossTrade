# Cross Trade DApp - Reown AppKit with Wagmi

This is a Next.js-based decentralized application for cross-chain token trading, supporting both L2-to-L2 and L2-to-L1 bridge modes.

## Usage

1. Go to [Reown Cloud](https://cloud.reown.com) and create a new project.
2. Copy your `Project ID`
3. Rename `.env.example` to `.env` and paste your `Project ID` as the value for `NEXT_PUBLIC_PROJECT_ID`
4. Configure your chain settings (see [Chain Configuration](#chain-configuration) below)
5. Run `pnpm install` to install dependencies
6. Run `pnpm run dev` to start the development server

## Chain Configuration

The application supports two bridge modes that can be configured via environment variables:

- **L2_L2 Mode**: For Layer 2 to Layer 2 cross-chain trading
- **L2_L1 Mode**: For Layer 2 to Layer 1 cross-chain trading

### Environment Variables

Add the following to your `.env` file:

```env
# Reown Project ID (required)
NEXT_PUBLIC_PROJECT_ID=your_project_id_here

# L2 to L2 Configuration
NEXT_PUBLIC_CHAIN_CONFIG_L2_L2={"11155111":{...},"11155420":{...}}

# L2 to L1 Configuration
NEXT_PUBLIC_CHAIN_CONFIG_L2_L1={"11155111":{...},"111551174648":{...}}
```

### Configuration Structure

#### L2_L2 Configuration Format

The L2_L2 configuration uses a **new token format** with `destination_chains` arrays:

```json
{
  "11155111": {
    "name": "Ethereum Sepolia",
    "display_name": "Ethereum Sepolia",
    "contracts": {
      "l1_cross_trade": "0xfcc6563798274f074f7324a76f27d15c4534fc63"
    },
    "tokens": [
      {
        "name": "ETH",
        "address": "0x0000000000000000000000000000000000000000",
        "destination_chains": []
      }
    ],
    "rpc_url": "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    "native_token_name": "Ether",
    "native_token_symbol": "ETH"
  },
  "11155420": {
    "name": "Optimism-Sepolia",
    "display_name": "Optimism-Sepolia",
    "contracts": {
      "l2_cross_trade": "0xe0199d8b559e9babc6f9101f369eaefb498ba973"
    },
    "tokens": [
      {
        "name": "ETH",
        "address": "0x0000000000000000000000000000000000000000",
        "destination_chains": [84532]
      }
    ],
    "rpc_url": "https://sepolia.optimism.io",
    "native_token_name": "ETH",
    "native_token_symbol": "ETH"
  },
  "84532": {
    "name": "Base Sepolia",
    "display_name": "Base Sepolia",
    "contracts": {
      "l2_cross_trade": "0x014d0db1b720571a108fb669637ea97e3078464a"
    },
    "tokens": [
      {
        "name": "ETH",
        "address": "0x0000000000000000000000000000000000000000",
        "destination_chains": [11155420]
      }
    ],
    "rpc_url": "https://sepolia.base.org",
    "native_token_name": "ETH",
    "native_token_symbol": "ETH"
  }
}
```

**Key Features:**
- `tokens` is an **array** of token objects
- Each token has a `destination_chains` array specifying valid L2 target chains
- Used for L2-to-L2 cross-chain trading

#### L2_L1 Configuration Format

Tokens use the same array format, but without `destination_chains` (always traded to L1):

```json
{
  "11155111": {
    "name": "Ethereum Sepolia",
    "display_name": "Ethereum Sepolia",
    "contracts": {
      "l1_cross_trade": "0xb11716578fd41284b29d5493cb70232fb25f3e27"
    },
    "tokens": [
      {
        "name": "ETH",
        "address": "0x0000000000000000000000000000000000000000",
        "destination_chains": []
      },
      {
        "name": "USDC",
        "address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
        "destination_chains": []
      },
      {
        "name": "USDT",
        "address": "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
        "destination_chains": []
      }
    ],
    "rpc_url": "https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY",
    "native_token_name": "Ether",
    "native_token_symbol": "ETH"
  },
  "111551174648": {
    "name": "Custom L2",
    "display_name": "Custom L2",
    "contracts": {
      "l2_cross_trade": "0xcdd4f81ef2592af1123f391508b308a1cfb36d48"
    },
    "tokens": [
      {
        "name": "ETH",
        "address": "0x4200000000000000000000000000000000000486",
        "destination_chains": []
      },
      {
        "name": "USDC",
        "address": "0x4200000000000000000000000000000000000778",
        "destination_chains": []
      }
    ],
    "rpc_url": "http://your-rpc-url.com",
    "native_token_name": "Tokamak Network Token",
    "native_token_symbol": "TON"
  }
}
```

**Key Features:**
- `tokens` is an **array** of token objects (same format as L2_L2)
- `destination_chains` is typically empty `[]` since tokens are always traded to L1
- Used for L2-to-L1 cross-chain trading

### Configuration Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Internal chain name |
| `display_name` | string | Yes | User-facing chain name |
| `contracts.l1_cross_trade` | string | Conditional | L1 contract address (for L1 chains) |
| `contracts.l2_cross_trade` | string | Conditional | L2 contract address (for L2 chains) |
| `tokens` | array | Yes | Token configuration (array format for both modes) |
| `rpc_url` | string | Yes | RPC endpoint URL |
| `native_token_name` | string | No | Native token name (e.g., "Ether") |
| `native_token_symbol` | string | No | Native token symbol (e.g., "ETH") |

### Token Configuration Format

Both L2_L2 and L2_L1 use the same array format:

#### L2_L2 Token Format (with destination chains)
```json
"tokens": [
  {
    "name": "ETH",
    "address": "0x0000000000000000000000000000000000000000",
    "destination_chains": [84532, 11155420]
  },
  {
    "name": "USDC",
    "address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    "destination_chains": [84532]
  }
]
```

#### L2_L1 Token Format (destination is always L1)
```json
"tokens": [
  {
    "name": "ETH",
    "address": "0x0000000000000000000000000000000000000000",
    "destination_chains": []
  },
  {
    "name": "USDC",
    "address": "0x1c7d4b196cb0c7b01d743fbc6116a902379c7238",
    "destination_chains": []
  }
]
```

## Configuration Parsing

The application parses chain configurations in two stages:

### Stage 1: Contract Configuration (`src/config/contracts.ts`)

The `loadChainConfig` function:

1. **Loads** the environment variable (`NEXT_PUBLIC_CHAIN_CONFIG_L2_L2` or `NEXT_PUBLIC_CHAIN_CONFIG_L2_L1`)
2. **Parses** the JSON string into a `ChainConfigs` object
3. **Normalizes** token symbols to uppercase:
   - Converts `token.name` to uppercase (e.g., "eth" → "ETH")
   - Works with the token array format for both L2_L2 and L2_L1
4. **Returns** typed configuration objects

**Note**: The parsing logic supports both array and object token formats for backward compatibility, but both L2_L2 and L2_L1 should use the array format.


## Example Complete Configuration

Here's a complete example showing both modes:

```env
NEXT_PUBLIC_PROJECT_ID=your_reown_project_id

# L2 to L2 Mode (New Implementation)
NEXT_PUBLIC_CHAIN_CONFIG_L2_L2={"11155111":{"name":"Ethereum Sepolia","display_name":"Ethereum Sepolia","contracts":{"l1_cross_trade":"0xfcc6563798274f074f7324a76f27d15c4534fc63"},"tokens":[{"name":"ETH","address":"0x0000000000000000000000000000000000000000","destination_chains":[]}],"rpc_url":"https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY","native_token_name":"Ether","native_token_symbol":"ETH"},"11155420":{"name":"Optimism-Sepolia","display_name":"Optimism-Sepolia","contracts":{"l2_cross_trade":"0xe0199d8b559e9babc6f9101f369eaefb498ba973"},"tokens":[{"name":"ETH","address":"0x0000000000000000000000000000000000000000","destination_chains":[84532]}],"rpc_url":"https://sepolia.optimism.io","native_token_name":"ETH","native_token_symbol":"ETH"},"84532":{"name":"Base Sepolia","display_name":"Base Sepolia","contracts":{"l2_cross_trade":"0x014d0db1b720571a108fb669637ea97e3078464a"},"tokens":[{"name":"ETH","address":"0x0000000000000000000000000000000000000000","destination_chains":[11155420]}],"rpc_url":"https://sepolia.base.org","native_token_name":"ETH","native_token_symbol":"ETH"}}

# L2 to L1 Mode (tokens array with empty destination_chains)
# NEXT_PUBLIC_CHAIN_CONFIG_L2_L1={"11155111":{"name":"Ethereum Sepolia","display_name":"Ethereum Sepolia","contracts":{"l1_cross_trade":"0xb11716578fd41284b29d5493cb70232fb25f3e27"},"tokens":[{"name":"ETH","address":"0x0000000000000000000000000000000000000000","destination_chains":[]},{"name":"USDC","address":"0x1c7d4b196cb0c7b01d743fbc6116a902379c7238","destination_chains":[]},{"name":"USDT","address":"0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0","destination_chains":[]}],"rpc_url":"https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY","native_token_name":"Ether","native_token_symbol":"ETH"},"111551174648":{"name":"Custom L2","display_name":"Custom L2","contracts":{"l2_cross_trade":"0xcdd4f81ef2592af1123f391508b308a1cfb36d48"},"tokens":[{"name":"ETH","address":"0x4200000000000000000000000000000000000486","destination_chains":[]},{"name":"USDC","address":"0x4200000000000000000000000000000000000778","destination_chains":[]}],"rpc_url":"http://your-rpc-url.com","native_token_name":"Tokamak Network Token","native_token_symbol":"TON"}}
```

## Resources

- [Reown — Docs](https://docs.reown.com)
- [Next.js — Docs](https://nextjs.org/docs)
- [Wagmi — Docs](https://wagmi.sh)
