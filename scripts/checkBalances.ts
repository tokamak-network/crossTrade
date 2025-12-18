import { ethers } from "hardhat";

// Token ABIs (minimal for balanceOf)
const ERC20_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

// Network Configuration
const NETWORKS = {
  L1: {
    name: "Ethereum Sepolia",
    rpc: "https://sepolia.rpc.tokamak.network/",
    usdc: "0xd718826bbc28e61dc93aacae04711c8e755b4915",
    usdt: "0xaa8e23fb1079ea71e0a56f48a2aa51851d8433d0",
    nativeTON: "0xa30fe40285b8f5c0457dbc3b7c8a280373c40044"
  },
  L2: {
    name: "Nam SDK Sepolia",
    rpc: "http://k8s-opgeth-f342208321-431946750.ap-northeast-1.elb.amazonaws.com",
    eth: "0x4200000000000000000000000000000000000486",
  }
};

async function checkBalance(
  provider: ethers.JsonRpcProvider,
  address: string,
  tokenAddress: string | null = null
) {
  try {
    if (!tokenAddress) {
      // Check ETH/Native balance
      const balance = await provider.getBalance(address);
      return ethers.formatEther(balance);
    } else {
      // Check ERC20 balance
      const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
      const balance = await token.balanceOf(address);
      const decimals = await token.decimals();
      const symbol = await token.symbol();
      return {
        balance: ethers.formatUnits(balance, decimals),
        symbol
      };
    }
  } catch (error) {
    console.error(`Error checking balance for ${tokenAddress || 'native token'}:`, error);
    return "Error";
  }
}

async function main() {
  // Get the signer's address
  const [signer] = await ethers.getSigners();
  const address = "0x21a82A114d65DB20d5db33f5c9DBb54f1a8AcF4e"
  console.log(`Checking balances for address: ${address}\n`);

  // L1 Sepolia Provider
  const l1Provider = new ethers.JsonRpcProvider(NETWORKS.L1.rpc);
  
  // L2 Nam SDK Provider
  const l2Provider = new ethers.JsonRpcProvider(NETWORKS.L2.rpc);

  console.log("L1 Balances (Sepolia):");
  console.log("-----------------------");
  
  // Check L1 ETH
  const l1EthBalance = await checkBalance(l1Provider, address);
  console.log(`ETH: ${l1EthBalance}`);
  
  // Check L1 TON
  const l1TonBalance = await checkBalance(l1Provider, address, NETWORKS.L1.nativeTON);
  console.log(`TON: ${l1TonBalance.balance} ${l1TonBalance.symbol}`);
  
  // Check L1 USDC
  const l1UsdcBalance = await checkBalance(l1Provider, address, NETWORKS.L1.usdc);
  console.log(`USDC: ${l1UsdcBalance.balance} ${l1UsdcBalance.symbol}`);
  
  // Check L1 USDT
  const l1UsdtBalance = await checkBalance(l1Provider, address, NETWORKS.L1.usdt);
  console.log(`USDT: ${l1UsdtBalance.balance} ${l1UsdtBalance.symbol}`);

  console.log("\nL2 Balances (Nam SDK Chain):");
  console.log("------------------------------");
  
  // Check L2 Native TON
  const l2TonBalance = await checkBalance(l2Provider, address);
  console.log(`TON: ${l2TonBalance}`);

  // Check L2 USDT if address is available
  if (NETWORKS.L2.eth) {
    const l2EthBalance = await checkBalance(l2Provider, address, NETWORKS.L2.eth);
    console.log(`ETH: ${l2EthBalance.balance} ${l2EthBalance.symbol}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 