# CrossTrade Deployment Guide

L2-L1 flow와 L2-L2 flow 각각에 대한 컨트랙트 배포 및 체인 등록 순서를 정리한 가이드입니다.

---

## 목차

- [L2-L1 Flow](#l2-l1-flow)
- [L2-L2 Flow](#l2-l2-flow)
- [새 L2 추가 체크리스트](#새-l2-추가-체크리스트)
- [현재 Testnet 배포 주소](#현재-testnet-배포-주소)

---

## L2-L1 Flow

L1 ↔ L2 간 CrossTrade. L1에 `L1CrossTradeProxy` 하나, 각 L2마다 `L2CrossTradeProxy` 하나.

```
[L2 User] --> L2CrossTradeProxy --> (CDM) --> L1CrossTradeProxy --> [L1 Provider]
```

### Step 1 — L1CrossTradeProxy 배포 (최초 1회)

> 이미 배포된 L1CrossTradeProxy가 있으면 건너뜁니다.

스크립트: `scripts/foundry_scripts/L2L1/DeployL1CrossTrade_L2L1.s.sol`

```bash
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/L2L1/DeployL1CrossTrade_L2L1.s.sol \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast --chain sepolia
```

**결과**: `L1CrossTradeProxy` + `L1CrossTrade` logic 배포 → `upgradeTo` 완료

---

### Step 2 — L2CrossTradeProxy 배포 (각 L2마다)

스크립트: `scripts/foundry_scripts/L2L1/DeployL2CrossTrade_L2L1.s.sol`

| 환경변수 | 값 |
|---------|-----|
| `L2_CROSS_DOMAIN_MESSENGER` | `0x4200000000000000000000000000000000000007` (OP Stack 표준) |

```bash
L2_CROSS_DOMAIN_MESSENGER=0x4200000000000000000000000000000000000007 \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/L2L1/DeployL2CrossTrade_L2L1.s.sol \
  --rpc-url <L2_RPC_URL> \
  --broadcast
```

**결과**: `L2CrossTradeProxy` + `L2CrossTrade` logic 배포 → `upgradeTo` + `initialize(CDM)` 완료

---

### Step 3 — L1CrossTradeProxy에 L2 등록

L1에서 실행. 등록하려는 L2마다 반복합니다.

스크립트: `scripts/foundry_scripts/L2L1/SetChainInfoL1_L2L1.sol`

| 환경변수 | 설명 |
|---------|------|
| `L1_CROSS_TRADE_PROXY` | L1CrossTradeProxy 주소 |
| `L1_CROSS_DOMAIN_MESSENGER` | 해당 L2의 CrossDomainMessenger **L1 주소** |
| `L2_CROSS_TRADE_PROXY` | Step 2에서 배포한 L2CrossTradeProxy 주소 |
| `L2_CHAIN_ID` | 등록할 L2 chain ID |

```bash
L1_CROSS_TRADE_PROXY=<L1_PROXY> \
L1_CROSS_DOMAIN_MESSENGER=<L2_CDM_L1_ADDR> \
L2_CROSS_TRADE_PROXY=<L2_PROXY> \
L2_CHAIN_ID=<L2_CHAIN_ID> \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/L2L1/SetChainInfoL1_L2L1.sol \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast --chain sepolia
```

---

### Step 4 — L2CrossTradeProxy에 L1 등록

L2에서 실행.

스크립트: `scripts/foundry_scripts/L2L1/SetChainInfoL2_L2L1.sol`

| 환경변수 | 설명 |
|---------|------|
| `L2_CROSS_TRADE_PROXY` | L2CrossTradeProxy 주소 |
| `L1_CROSS_TRADE_PROXY` | L1CrossTradeProxy 주소 |
| `L1_CHAIN_ID` | Sepolia = `11155111` |

```bash
L2_CROSS_TRADE_PROXY=<L2_PROXY> \
L1_CROSS_TRADE_PROXY=<L1_PROXY> \
L1_CHAIN_ID=11155111 \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/L2L1/SetChainInfoL2_L2L1.sol \
  --rpc-url <L2_RPC_URL> \
  --broadcast
```

---

### 검증 (L2-L1)

```bash
# L1에서 L2 등록 확인 (CDM 주소, L2CrossTrade 주소 반환)
cast call <L1_PROXY> "chainData(uint256)(address,address)" <L2_CHAIN_ID> \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# L2에서 L1 등록 확인
cast call <L2_PROXY> "chainData(uint256)(address,address)" 11155111 \
  --rpc-url <L2_RPC_URL>
```

---

## L2-L2 Flow

L2 ↔ L2 간 CrossTrade. L1에 `L2toL2CrossTradeProxyL1`(허브) 하나, 각 L2마다 `L2toL2CrossTradeProxy` 하나.

```
[L2-A User] --> L2toL2CrossTradeProxy(A) --> (CDM) --> L2toL2CrossTradeProxyL1(L1 Hub) --> (CDM) --> L2toL2CrossTradeProxy(B) --> [L2-B Provider]
```

### Step 1 — L2toL2CrossTradeProxyL1 배포 (최초 1회, L1에)

> 이미 배포된 L1 허브가 있으면 건너뜁니다.

스크립트: `scripts/foundry_scripts/DeployL1CrossTrade_L2L2.s.sol`

```bash
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/DeployL1CrossTrade_L2L2.s.sol \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast --chain sepolia
```

**결과**: `L2toL2CrossTradeProxyL1` + `L2toL2CrossTradeL1` logic 배포 + `upgradeTo` 완료

---

### Step 2 — L2toL2CrossTradeProxy 배포 (각 L2마다)

스크립트: `scripts/foundry_scripts/DeployL2CrossTrade_L2L2.s.sol`

| 환경변수 | 값 |
|---------|-----|
| `L2_CROSS_DOMAIN_MESSENGER` | `0x4200000000000000000000000000000000000007` |

```bash
L2_CROSS_DOMAIN_MESSENGER=0x4200000000000000000000000000000000000007 \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/DeployL2CrossTrade_L2L2.s.sol \
  --rpc-url <L2_RPC_URL> \
  --broadcast
```

> **주의**: 배포 후 반드시 `implementation()` 반환값을 확인하세요. `0x0`이면 `upgradeTo`가 실행되지 않은 것으로, 별도 upgrade 스크립트가 필요합니다.
>
> ```bash
> cast call <L2_PROXY> "implementation()" --rpc-url <L2_RPC_URL>
> ```

---

### Step 3 — L2toL2CrossTradeProxyL1에 L2 등록 (L1 허브에서)

등록하려는 L2마다 반복합니다.

스크립트: `scripts/foundry_scripts/SetChainInfoL1_L2L2.sol`

| 환경변수 | 설명 |
|---------|------|
| `L1_CROSS_TRADE_PROXY` | L2toL2CrossTradeProxyL1 주소 |
| `L1_CROSS_DOMAIN_MESSENGER` | 해당 L2의 CrossDomainMessenger **L1 주소** |
| `L2_CROSS_TRADE_PROXY` | Step 2에서 배포한 L2toL2CrossTradeProxy 주소 |
| `L2_NATIVE_TOKEN_ADDRESS_ON_L1` | L2 네이티브 토큰의 L1 주소 |
| `L1_STANDARD_BRIDGE` | 해당 L2 연결 L1 Standard Bridge 주소 |
| `L1_USDC_BRIDGE` | 해당 L2 USDC Bridge 주소 (없으면 `0x0000000000000000000000000000000000000000`) |
| `USE_CUSTOM_BRIDGE` | Custom bridge 사용 여부 (`true` / `false`) |
| `L2_CHAIN_ID` | 등록할 L2 chain ID |

```bash
L1_CROSS_TRADE_PROXY=<L1_HUB_PROXY> \
L1_CROSS_DOMAIN_MESSENGER=<L2_CDM_L1_ADDR> \
L2_CROSS_TRADE_PROXY=<L2_PROXY> \
L2_NATIVE_TOKEN_ADDRESS_ON_L1=<L2_NATIVE_TOKEN_L1_ADDR> \
L1_STANDARD_BRIDGE=<L1_STANDARD_BRIDGE_ADDR> \
L1_USDC_BRIDGE=<L1_USDC_BRIDGE_ADDR> \
USE_CUSTOM_BRIDGE=true \
L2_CHAIN_ID=<L2_CHAIN_ID> \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/SetChainInfoL1_L2L2.sol \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com \
  --broadcast --chain sepolia
```

---

### Step 4 — L2toL2CrossTradeProxy에 L1 허브 등록 (각 L2에서)

스크립트: `scripts/foundry_scripts/SetChainInfoL2_L2L2.sol`

| 환경변수 | 설명 |
|---------|------|
| `L2_CROSS_TRADE_PROXY` | L2toL2CrossTradeProxy 주소 |
| `L1_CROSS_TRADE_PROXY` | L2toL2CrossTradeProxyL1 (L1 허브) 주소 |
| `L1_CHAIN_ID` | Sepolia = `11155111` |

```bash
L2_CROSS_TRADE_PROXY=<L2_PROXY> \
L1_CROSS_TRADE_PROXY=<L1_HUB_PROXY> \
L1_CHAIN_ID=11155111 \
PRIVATE_KEY=<deployer_key> \
forge script scripts/foundry_scripts/SetChainInfoL2_L2L2.sol \
  --rpc-url <L2_RPC_URL> \
  --broadcast
```

---

### 검증 (L2-L2)

```bash
# L1 허브에서 L2 등록 확인
cast call <L1_HUB_PROXY> \
  "chainData(uint256)(address,address,address,address,address,bool)" <L2_CHAIN_ID> \
  --rpc-url https://ethereum-sepolia-rpc.publicnode.com

# L2에서 L1 허브 등록 확인
cast call <L2_PROXY> "l1CrossTradeContract(uint256)" 11155111 \
  --rpc-url <L2_RPC_URL>
```

---

## 새 L2 추가 체크리스트

| # | 작업 | Flow | 실행 체인 | 스크립트 |
|---|------|------|----------|---------|
| 1 | L2CrossTradeProxy 배포 | L2-L1 | L2 | `DeployL2CrossTrade_L2L1.s.sol` |
| 2 | L1CrossTradeProxy에 L2 등록 | L2-L1 | L1 | `SetChainInfoL1_L2L1.sol` |
| 3 | L2CrossTradeProxy에 L1 등록 | L2-L1 | L2 | `SetChainInfoL2_L2L1.sol` |
| 4 | L2toL2CrossTradeProxy 배포 | L2-L2 | L2 | `DeployL2CrossTrade_L2L2.s.sol` |
| 5 | L1 허브에 L2 등록 | L2-L2 | L1 | `SetChainInfoL1_L2L2.sol` |
| 6 | L2toL2CrossTradeProxy에 L1 허브 등록 | L2-L2 | L2 | `SetChainInfoL2_L2L2.sol` |

---

## 현재 Testnet 배포 주소

### Network Info

| 체인 | Chain ID | RPC URL |
|------|----------|---------|
| Sepolia | `11155111` | `https://ethereum-sepolia-rpc.publicnode.com` |
| Thanos Sepolia | `111551119090` | `https://rpc.thanos-sepolia.tokamak.network` |
| ect-defi | `111551190773` | `http://localhost:8545` |

### L2-L1 Flow

| 컨트랙트 | 체인 | 주소 |
|---------|------|------|
| L1CrossTradeProxy | Sepolia | `0xfea37d39bec823d503ed6fb9d3a6e151190821fb` |
| L1CrossTrade (logic) | Sepolia | `0x89e3854f612c12749e58133d52dd5a77d01c1209` |
| L2CrossTradeProxy | Thanos Sepolia | `0xfd2c81fe8a9ceed49c33642cba84bd3cf744bc0e` |
| L2CrossTrade (logic) | Thanos Sepolia | `0xf5472f94e8139460e3d3de97712dd8ed56b6173f` |
| L2CrossTradeProxy | ect-defi | `0xD2Aea5CC4cA8861D809dCb34b354D6059766A809` |

### L2-L2 Flow

| 컨트랙트 | 체인 | 주소 |
|---------|------|------|
| L2toL2CrossTradeProxyL1 (L1 허브) | Sepolia | `0xd038d89655f106d88c5bd56a9442d9ecee675c1c` |
| L2toL2CrossTradeL1 (logic) | Sepolia | `0x1865acb3972ded95c2262358c0bc3a571d18055e` |
| L2toL2CrossTradeProxy | Thanos Sepolia | `0x7bbec445f9bdf6c579e81eada5df86654184bce3` |
| L2toL2CrossTradeL2 (logic) | Thanos Sepolia | `0x344644b3b559af3a26bcb7f65b2b9ce727f5220b` |
| L2toL2CrossTradeProxy | ect-defi | `0x2452ceB66Ccd4B997e3d400F90d42F2566AC0C94` |
| L2toL2CrossTradeL2 (logic) | ect-defi | `0x2a52D7DF50a7F82887bDD4FE96ec8568bd02D3e4` |

### Thanos Sepolia 등록 파라미터 참고

L2-L2 flow에서 Thanos Sepolia를 L1 허브에 등록할 때 사용한 값:

| 파라미터 | 값 |
|---------|-----|
| `L2_CDM_L1_ADDR` | `0xd3a16d5271f0551ef8a0f393d963878cddecbe00` |
| `L2_NATIVE_TOKEN_ADDRESS_ON_L1` | `0xa30fe40285B8f5c0457DbC3B7C8A280373c40044` |
| `L1_STANDARD_BRIDGE` | `0x5D2Ed95c0230Bd53E336f12fA9123847768B2B3E` |
| `L1_USDC_BRIDGE` | `0x7dD2196722FBe83197820BF30e1c152e4FBa0a6A` |
| `USE_CUSTOM_BRIDGE` | `true` |
