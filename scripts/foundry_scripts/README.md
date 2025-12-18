# Foundry Deployment Scripts

This directory contains Foundry scripts for deploying and configuring the CrossTrade smart contracts for both L2-to-L2 and L2-to-L1 bridge modes.

## Directory Structure

```
scripts/foundry_scripts/
├── DeployL1CrossTrade_L2L2.s.sol    # Deploy L1 contract for L2-to-L2 mode
├── DeployL2CrossTrade_L2L2.s.sol    # Deploy L2 contract for L2-to-L2 mode
├── RegisterToken_L2L2.sol           # Register tokens for L2-to-L2 trading
├── SetChainInfoL1_L2L2.sol          # Configure L1 chain info for L2-to-L2
├── SetChainInfoL2_L2L2.sol          # Configure L2 chain info for L2-to-L2
└── L2L1/                            # L2-to-L1 mode scripts
    ├── DeployL1CrossTrade_L2L1.s.sol
    ├── DeployL2CrossTrade_L2L1.s.sol
    ├── RegisterToken_L2L1.sol
    ├── SetChainInfoL1_L2L1.sol
    └── SetChainInfoL2_L2L1.sol
```

## Bridge Modes

### L2-to-L2 Mode (Root Directory)
Scripts for deploying and configuring the **new L2-to-L2 cross-chain trading** system, which enables direct token swaps between different Layer 2 networks.

**Contracts Deployed:**
- **L1**: `L2toL2CrossTradeL1` with `L2toL2CrossTradeProxyL1`
- **L2**: `L2toL2CrossTradeL2` with `L2toL2CrossTradeProxy`

### L2-to-L1 Mode (`L2L1/` Directory)
Scripts for deploying and configuring the **L2-to-L1 cross-chain trading** system, which enables token swaps between Layer 2 and Layer 1 networks.

**Contracts Deployed:**
- **L1**: `L1CrossTrade` with `L1CrossTradeProxy`
- **L2**: `L2CrossTrade` with `L2CrossTradeProxy`

## Deployment Workflow

### L2-to-L2 Deployment

#### Step 1: Deploy L1 Contract

Deploy the L1 CrossTrade contract on Ethereum (or L1 testnet):

```bash
PRIVATE_KEY=0x... \
forge script scripts/foundry_scripts/DeployL1CrossTrade_L2L2.s.sol:DeployL1CrossTrade_L2L2 \
  --rpc-url https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY \
  --broadcast \
  --chain sepolia
```

**Environment Variables:**
- `PRIVATE_KEY` - Deployer's private key

**Actions Performed:**
1. Deploys `L2toL2CrossTradeProxyL1` proxy contract
2. Deploys `L2toL2CrossTradeL1` logic contract
3. Upgrades proxy to point to logic contract
4. Initializes proxy with USDC and USDT addresses (hardcoded in script)

**Outputs:**
- L1 Proxy address
- L1 Logic implementation address

#### Step 2: Deploy L2 Contract(s)

Deploy the L2 CrossTrade contract on each L2 network you want to support:

```bash
PRIVATE_KEY=0x... \
L2_CROSS_DOMAIN_MESSENGER=0x... \
forge script scripts/foundry_scripts/DeployL2CrossTrade_L2L2.s.sol:DeployL2CrossTrade_L2L2 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

**Environment Variables:**
- `PRIVATE_KEY` - Deployer's private key
- `L2_CROSS_DOMAIN_MESSENGER` - L2 CrossDomainMessenger address

**Actions Performed:**
1. Deploys `L2toL2CrossTradeProxy` proxy contract
2. Deploys `L2toL2CrossTradeL2` logic contract
3. Upgrades proxy to point to logic contract
4. Initializes proxy with CrossDomainMessenger address

**Outputs:**
- L2 Proxy address
- L2 Logic implementation address

#### Step 3: Configure L1 Chain Info

Set chain information on the L1 contract for each L2 you deployed:

```bash
PRIVATE_KEY=0x... \
L1_CROSS_TRADE_PROXY=0x... \
L1_CROSS_DOMAIN_MESSENGER=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L2_NATIVE_TOKEN_ADDRESS_ON_L1=0x... \
L1_STANDARD_BRIDGE=0x... \
L1_USDC_BRIDGE=0x... \
L2_CHAIN_ID=111551119090 \
USE_CUSTOM_BRIDGE=false \
forge script scripts/foundry_scripts/SetChainInfoL1_L2L2.sol:SetChainInfoL1_L2L2 \
  --rpc-url https://eth-sepolia.public.blastapi.io \
  --broadcast \
  --chain sepolia
```

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `L1_CROSS_TRADE_PROXY` | L1 CrossTrade proxy address (from Step 1) |
| `L1_CROSS_DOMAIN_MESSENGER` | L1 CrossDomainMessenger contract address |
| `L2_CROSS_TRADE_PROXY` | L2 CrossTrade proxy address (from Step 2) |
| `L2_NATIVE_TOKEN_ADDRESS_ON_L1` | L2's native token address on L1 (e.g., TON) |
| `L1_STANDARD_BRIDGE` | L1StandardBridge contract address |
| `L1_USDC_BRIDGE` | L1 USDC bridge contract address |
| `L2_CHAIN_ID` | L2 chain ID |
| `USE_CUSTOM_BRIDGE` | Whether to use custom bridge (true/false) |

**Note:** This script must be executed **once per L2 network** you want to support.

#### Step 4: Configure L2 Chain Info

Set chain information on each L2 contract:

```bash
PRIVATE_KEY=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L1_CROSS_TRADE_PROXY=0x... \
L1_CHAIN_ID=11155111 \
forge script scripts/foundry_scripts/SetChainInfoL2_L2L2.sol:SetChainInfoL2_L2L2 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `L2_CROSS_TRADE_PROXY` | L2 CrossTrade proxy address (from Step 2) |
| `L1_CROSS_TRADE_PROXY` | L1 CrossTrade proxy address (from Step 1) |
| `L1_CHAIN_ID` | L1 chain ID (e.g., 11155111 for Sepolia) |

#### Step 5: Register Tokens

Register token mappings between L1 and L2s:

```bash
PRIVATE_KEY=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L1_TOKEN=0x... \
L2_SOURCE_TOKEN=0x... \
L2_DESTINATION_TOKEN=0x... \
L1_CHAIN_ID=11155111 \
L2_SOURCE_CHAIN_ID=111551119090 \
L2_DESTINATION_CHAIN_ID=11155420 \
forge script scripts/foundry_scripts/RegisterToken_L2L2.sol:RegisterToken_L2L2 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `L2_CROSS_TRADE_PROXY` | L2 CrossTrade proxy address |
| `L1_TOKEN` | Token address on L1 |
| `L2_SOURCE_TOKEN` | Token address on source L2 |
| `L2_DESTINATION_TOKEN` | Token address on destination L2 |
| `L1_CHAIN_ID` | L1 chain ID |
| `L2_SOURCE_CHAIN_ID` | Source L2 chain ID |
| `L2_DESTINATION_CHAIN_ID` | Destination L2 chain ID |

**Note:** Register tokens on the **source L2** where users will initiate trades.

---

### L2-to-L1 Deployment

The L2-to-L1 deployment follows a similar workflow but with simpler configuration:

#### Step 1: Deploy L1 Contract

```bash
PRIVATE_KEY=0x... \
forge script scripts/foundry_scripts/L2L1/DeployL1CrossTrade_L2L1.s.sol:DeployL1CrossTrade_L2L1 \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast \
  --chain sepolia
```

**Actions:**
1. Deploys `L1CrossTradeProxy`
2. Deploys `L1CrossTrade` logic
3. Upgrades proxy to logic

#### Step 2: Deploy L2 Contract

```bash
PRIVATE_KEY=0x... \
L2_CROSS_DOMAIN_MESSENGER=0x... \
forge script scripts/foundry_scripts/L2L1/DeployL2CrossTrade_L2L1.s.sol:DeployL2CrossTrade_L2L1 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

**Actions:**
1. Deploys `L2CrossTradeProxy`
2. Deploys `L2CrossTrade` logic
3. Upgrades proxy to logic
4. Initializes with CrossDomainMessenger

#### Step 3: Configure L1 Chain Info

```bash
PRIVATE_KEY=0x... \
L1_CROSS_TRADE_PROXY=0x... \
L1_CROSS_DOMAIN_MESSENGER=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L2_CHAIN_ID=111551119090 \
forge script scripts/foundry_scripts/L2L1/SetChainInfoL1_L2L1.sol:SetChainInfoL1_L2L1 \
  --rpc-url https://eth-sepolia.public.blastapi.io \
  --broadcast \
  --chain sepolia
```

#### Step 4: Configure L2 Chain Info

```bash
PRIVATE_KEY=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L1_CROSS_TRADE_PROXY=0x... \
L1_CHAIN_ID=11155111 \
forge script scripts/foundry_scripts/L2L1/SetChainInfoL2_L2L1.sol:SetChainInfoL2_L2L1 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

#### Step 5: Register Tokens

```bash
PRIVATE_KEY=0x... \
L2_CROSS_TRADE_PROXY=0x... \
L1_TOKEN=0x... \
L2_TOKEN=0x... \
L1_CHAIN_ID=11155111 \
forge script scripts/foundry_scripts/L2L1/RegisterToken_L2L1.sol:RegisterToken_L2L1 \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  --broadcast
```

**Environment Variables:**
| Variable | Description |
|----------|-------------|
| `L2_CROSS_TRADE_PROXY` | L2 CrossTrade proxy address |
| `L1_TOKEN` | Token address on L1 |
| `L2_TOKEN` | Token address on L2 |
| `L1_CHAIN_ID` | L1 chain ID |

---

## Contract Verification

After deployment, verify your contracts on block explorers:

### Etherscan Verification

```bash
# Verify L1 contracts (Sepolia example)
forge verify-contract \
  0xYOUR_LOGIC_ADDRESS \
  contracts/L1/L2toL2CrossTradeL1.sol:L2toL2CrossTradeL1 \
  --etherscan-api-key YOUR_API_KEY \
  --chain sepolia

forge verify-contract \
  0xYOUR_PROXY_ADDRESS \
  contracts/L1/L2toL2CrossTradeProxyL1.sol:L2toL2CrossTradeProxyL1 \
  --etherscan-api-key YOUR_API_KEY \
  --chain sepolia
```

### Optimism Sepolia Verification

```bash
forge verify-contract \
  --etherscan-api-key YOUR_API_KEY \
  --chain optimism-sepolia \
  --compiler-version 0.8.24 \
  --optimizer-runs 200 \
  --via-ir \
  0xYOUR_CONTRACT_ADDRESS \
  contracts/L2/L2toL2CrossTradeL2.sol:L2toL2CrossTradeL2
```

### Blockscout Verification (Custom L2s)

```bash
forge verify-contract \
  --rpc-url https://rpc.thanos-sepolia.tokamak.network \
  0xYOUR_CONTRACT_ADDRESS \
  contracts/L2/L2toL2CrossTradeL2.sol:L2toL2CrossTradeL2 \
  --verifier blockscout \
  --verifier-url https://explorer.thanos-sepolia.tokamak.network/api
```

---

## Script Details

### Deployment Scripts

#### `DeployL1CrossTrade_L2L2.s.sol`
Deploys the L1 CrossTrade contract for L2-to-L2 mode with proxy pattern and initializes with USDC/USDT addresses.

#### `DeployL2CrossTrade_L2L2.s.sol`
Deploys the L2 CrossTrade contract for L2-to-L2 mode with proxy pattern and initializes with CrossDomainMessenger.

#### `DeployL1CrossTrade_L2L1.s.sol` (L2L1/)
Deploys the L1 CrossTrade contract for L2-to-L1 mode with proxy pattern (no initialization).

#### `DeployL2CrossTrade_L2L1.s.sol` (L2L1/)
Deploys the L2 CrossTrade contract for L2-to-L1 mode with proxy pattern and initializes with CrossDomainMessenger.

### Configuration Scripts

#### `SetChainInfoL1_L2L2.sol`
Configures L1 contract with information about an L2 network (messenger, bridge, native token, etc.). Must be run once per L2 network.

#### `SetChainInfoL2_L2L2.sol`
Configures L2 contract with L1 contract address and chain ID.

#### `SetChainInfoL1_L2L1.sol` (L2L1/)
Configures L1 contract with L2 information (simpler than L2L2 version).

#### `SetChainInfoL2_L2L1.sol` (L2L1/)
Configures L2 contract with L1 contract address and chain ID.

### Token Registration Scripts

#### `RegisterToken_L2L2.sol`
Registers a token mapping for L2-to-L2 trading, specifying L1 token, source L2 token, destination L2 token, and all chain IDs.

#### `RegisterToken_L2L1.sol` (L2L1/)
Registers a token mapping for L2-to-L1 trading, specifying L1 token, L2 token, and L1 chain ID.

---

## Common Network Parameters

### Sepolia (L1 Testnet)
- **Chain ID**: `11155111`
- **RPC URL**: `https://eth-sepolia.g.alchemy.com/v2/YOUR_API_KEY`
- **Block Explorer**: `https://sepolia.etherscan.io`

### Optimism Sepolia
- **Chain ID**: `11155420`
- **RPC URL**: `https://sepolia.optimism.io`
- **Block Explorer**: `https://sepolia-optimism.etherscan.io`

### Base Sepolia
- **Chain ID**: `84532`
- **RPC URL**: `https://sepolia.base.org`
- **Block Explorer**: `https://sepolia.basescan.org`

### Thanos Sepolia (Tokamak)
- **Chain ID**: `111551119090`
- **RPC URL**: `https://rpc.thanos-sepolia.tokamak.network`
- **Block Explorer**: `https://explorer.thanos-sepolia.tokamak.network`

---

## Important Notes

1. **Private Keys**: Never commit private keys to version control. Use environment variables or `.env` files (ensure `.env` is in `.gitignore`).

2. **Deployment Order**: Always deploy in the correct order:
   - L1 contract first
   - L2 contracts second
   - Configure L1 with L2 info
   - Configure L2 with L1 info
   - Register tokens last

3. **Multiple L2s**: For L2-to-L2 mode:
   - Deploy the L1 contract once
   - Deploy L2 contracts on each L2 network
   - Run `SetChainInfoL1_L2L2` once per L2 network
   - Run `SetChainInfoL2_L2L2` on each L2 network
   - Register tokens on the source L2 where trades originate

4. **Gas Estimation**: Some operations may require significant gas. Ensure your deployer account has sufficient funds.

5. **Verification**: Contract verification is optional but highly recommended for transparency and easier interaction via block explorers.

6. **Testing**: Always test deployments on testnets before deploying to mainnet.

---

## Troubleshooting

### "Upgrade failed - implementation mismatch"
The proxy upgrade verification failed. Check that the logic contract deployed successfully and the upgrade transaction completed.

### "Invalid JSON in NEXT_PUBLIC_CHAIN_CONFIG"
Ensure your environment variables are properly formatted JSON strings. Check for escaping issues in your shell.

### Contract verification fails
- Ensure compiler version matches (0.8.24)
- Check that optimizer settings match (`--optimizer-runs 200 --via-ir`)
- Verify you're using the correct block explorer API

### Transaction reverts during initialization
- Check that addresses are correct (not zero addresses)
- Ensure the contract hasn't been initialized already (can only initialize once)

---

## Additional Resources

- [Foundry Book](https://book.getfoundry.sh/)
- [Optimism Developer Docs](https://docs.optimism.io/)
- [Base Developer Docs](https://docs.base.org/)
- [Tokamak Network Docs](https://docs.tokamak.network/)
