import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

import "hardhat-gas-reporter";
import dotenv from "dotenv" ;

dotenv.config();

const config: HardhatUserConfig = {
  // solidity: "0.8.20",
  solidity: {
    compilers: [
      {
        version: '0.8.24',
        settings: {
          viaIR: true,
          optimizer: {
              enabled: true,
              runs: 100000000, //4294967295,
              details: {
                  yul: true,
              },
          },
        }
      },
      {
        version: '0.4.17'
      }
    ],
    settings: {
      // evmVersion: "cancun",
      viaIR: true,
      optimizer: {
          enabled: true,
          runs: 100000000, //4294967295,
          details: {
              yul: true,
          },
      },
      // optimizer: {
      //   enabled: true,
      //   runs: 100,
      // },
    },
  },
  networks: {
    // hardhat: {
    //   evmVersion: "Dencun",
    // },
    mainnet: {
      url: process.env.L1_RPC || 'https://mainnet-l1-rehearsal.optimism.io',
      accounts: [
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
      ],
    },
    arbitrumSepolia: {
      url: `https://endpoints.omniatech.io/v1/arbitrum/sepolia/public`,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    sepolia: {
      url: `https://ethereum-sepolia-rpc.publicnode.com`,
      accounts: [`${process.env.PRIVATE_KEY}`],
      gasPrice:"auto"
    },
    titanSepolia: {
      url: 'https://rpc.titan-sepolia.tokamak.network',
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    thanosSepolia:{
      url: 'https://rpc.thanos-sepolia.tokamak.network',
      accounts: [`${process.env.PRIVATE_KEY}`]
    },
    optimismSepolia: {
      url: `https://sepolia.optimism.io`,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    ge1SDKSepolia: {
      url: "http://k8s-opgeth-fa4be1305f-660621805.eu-central-1.elb.amazonaws.com",
      chainId: 111551160480,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    ge2SDKSepolia: {
      url: "http://k8s-opgeth-46cbb62707-660540118.eu-central-1.elb.amazonaws.com",
      chainId: 111551219854,
      accounts: [`${process.env.PRIVATE_KEY}`],
    },
    devnetL1: {
      url: 'http://localhost:9545',
      accounts: [
        // warning: keys 0 - 12 (incl) are used by the system
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // 0
        '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // 1
        '5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // 2
        '7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // 3
        '47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // 4
        '8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // 5
        '92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // 6
        '4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // 7
        'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // 8
        '2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6', // 9
        'f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897', // 10
        '701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', // 11
        'a267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1', // 12
        '47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd', // 13
        'c526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa', // 14
        '8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61', // 15
        'ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0', // 16
        '689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd', // 17
        'de9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0', // 18
        'df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', // 19
      ],
    },
    devnetL2: {
      url: 'http://localhost:8545',
      accounts: [
        // warning: keys 0 - 12 (incl) are used by the system
        'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80', // 0
        '59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d', // 1
        '5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a', // 2
        '7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6', // 3
        '47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a', // 4
        '8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba', // 5
        '92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e', // 6
        '4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356', // 7
        'dbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97', // 8
        '2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6', // 9
        'f214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897', // 10
        '701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82', // 11
        'a267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1', // 12
        '47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd', // 13
        'c526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa', // 14
        '8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61', // 15
        'ea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0', // 16
        '689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd', // 17
        'de9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0', // 18
        'df57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e', // 19
      ],
    },
   

  },
  gasReporter: {
    // enabled: true,
    // currency: 'USD',
    // gasPrice: 21,
    // optimismHardfork: 'ecotone',
    // coinmarketcap: `${process.env.COINMARKETCAP_API_KEY}`
    // includeIntrinsicGas: false,
    offline: true,
    L2: "optimism",
    gasPrice: .00325,      // gwei (L2)
    baseFee: 35,           // gwei (L1)
    blobBaseFee: 20,       // gwei (L1)
    tokenPrice: "1",       // ETH per ETH
    token: "ETH"
  },

  etherscan: {

    apiKey: { 
      optimismSepolia: `${process.env.OP_SEPOLIA_APY_KEY}`,
      titanSepolia: "abcde",
      thanosSepolia: "abcde",
      bscTestnet: "abcd",
      sepolia: `${process.env.SEPOLIA_APY_KEY}`,
      namSDKSepolia: "abcde",
      ge1SDKSepolia: "abcde",
      ge2SDKSepolia: "abcde",
    },
    customChains: [
      {
        network: "optimismSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimistic.etherscan.io"
        },
      },
      {
        network: "thanosSepolia",
        chainId: 111551119090,
        urls: {
            apiURL: "https://explorer.thanos-sepolia.tokamak.network/api",
            browserURL: "https://explorer.thanos-sepolia.tokamak.network/",
        },
      },
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
            apiURL: "https://api-sepolia.etherscan.io/api",
            browserURL: "https://sepolia.etherscan.io/",
        },
      },
      {
        network: "ge1SDKSepolia",
        chainId: 111551160480,
        urls: {
          apiURL: "http://k8s-blockscout-a272abe4d7-175640193.eu-central-1.elb.amazonaws.com/api",  // Add if there's an explorer API
          browserURL: "http://k8s-blockscout-a272abe4d7-175640193.eu-central-1.elb.amazonaws.com/"  // Add if there's an explorer
        }
      },
      {
        network: "ge2SDKSepolia",
        chainId: 111551219854,
        urls: {
          apiURL: "http://k8s-blockscout-04de1fc64b-302139023.eu-central-1.elb.amazonaws.com/api",  // Add if there's an explorer API
          browserURL: "http://k8s-blockscout-04de1fc64b-302139023.eu-central-1.elb.amazonaws.com"  // Add if there's an explorer
        }
      }
    ]
  }
};

export default config;
