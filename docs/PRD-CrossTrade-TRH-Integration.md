# PRD: CrossTrade Integration for DeFi & Full Presets

**문서 버전:** 2.0
**작성일:** 2026-04-06
**최종 수정:** 2026-04-07
**상태:** Draft (v2 — 기술 리뷰 반영)

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-06 | 초안 작성 |
| 2.0 | 2026-04-07 | Genesis Predeploy → L1 Deposit Transaction 배포 방식 전환, dApp 환경 변수 수정, 메인넷 고려사항 추가, 컨트랙트 테이블 정정 |

---

## 1. Summary

TRH Platform의 Electron 앱을 통해 L2를 배포할 때, DeFi 및 Full Preset을 선택하면 CrossTrade 프로토콜이 자동으로 통합되도록 구현한다. CrossTrade는 L2↔L1, L2↔L2 간 빠른 토큰 교환을 가능하게 하는 탈중앙화 크로스체인 트레이딩 프로토콜로, 기존 7일 출금 대기를 제거하여 사용자 경험을 크게 개선한다.

이 PRD는 L2 체인 부팅 후 L1 Deposit Transaction을 통한 컨트랙트 배포, 기존 L1 컨트랙트와의 자동 연결, CrossTrade dApp UI 컨테이너 배포까지의 End-to-End 통합 범위를 정의한다.

---

## 2. Contacts

| 이름 | 역할 | 비고 |
|------|------|------|
| Theo | PM / 기획 | PRD 작성 및 의사결정 |
| TBD | Backend Engineer | trh-backend CrossTrade 배포 로직 구현 |
| TBD | SDK Engineer | trh-sdk L1 Deposit Tx 배포 스크립트 구현 |
| TBD | Frontend Engineer | cross-trade-dApp Docker 통합 |
| TBD | Smart Contract Engineer | CrossTrade 컨트랙트 검증 및 배포 설정 |
| George Negru (@negrugeorge) | External Auditor | CrossTrade 외부 보안 감사 |

---

## 3. Background

### 3.1 Context

TRH Platform은 Docker Compose 기반의 풀스택 애플리케이션으로, Electron 앱을 통해 L2 체인을 원클릭으로 배포할 수 있다. 현재 4가지 Preset(General, DeFi, Gaming, Full)을 지원하며, 각 Preset마다 다른 genesis config, predeploy, 모듈 구성을 생성한다.

CrossTrade는 Tokamak Network의 크로스체인 트레이딩 프로토콜로, OP Stack 기반 L2와 Ethereum L1 간의 Request-Provide 모델을 통해 빠른 토큰 교환을 제공한다. Requester가 소스 체인에 토큰을 잠그면, Provider가 목적지 체인에서 토큰을 제공하고 잠긴 토큰을 청구하는 방식으로 작동한다.

### 3.2 Why Now?

- DeFi Preset의 핵심 가치는 "L2에서 바로 사용 가능한 DeFi 인프라"이며, 빠른 크로스체인 자산 이동은 DeFi 사용성의 필수 요소이다.
- CrossTrade 프로토콜이 외부 보안 감사를 진행 중이며, Foundry/Hardhat 테스트가 포괄적으로 구비되어 프로덕션 준비 상태에 근접해 있다.
- 기존 L1 CrossTrade 컨트랙트가 이미 배포되어 있어, 새 L2를 등록(setChainInfo)하는 것만으로 즉시 연결 가능하다.
- L2→L2 트레이딩(L2toL2CrossTrade)이 구현 완료되어 멀티체인 생태계 확장이 가능한 시점이다.

### 3.3 현재 아키텍처와의 관계

TRH Platform은 4개 레포지토리로 구성된다:

```
Electron (trh-platform) → Platform UI (trh-platform-ui) → Backend API (trh-backend) → SDK CLI (trh-sdk)
     |                            |                               |                            |
     | IPC + window.__globals     | HTTP POST /preset-deploy      | exec trh-sdk deploy        | Docker/L1/L2
```

CrossTrade 통합은 이 파이프라인의 각 레이어에 영향을 미친다:
- **trh-sdk**: L2 부팅 후 L1 Deposit Transaction으로 CrossTrade L2 컨트랙트 배포
- **trh-backend**: L2 배포 완료 후 L1 컨트랙트에 setChainInfo 자동 호출, CrossTrade dApp 컨테이너 관리
- **trh-platform-ui**: DeFi/Full Preset 선택 시 CrossTrade 설정 UI 표시
- **trh-platform (Electron)**: docker-compose에 CrossTrade dApp 서비스 추가

### 3.4 v1.0 → v2.0 핵심 변경 사유

v1.0에서는 Genesis Predeploy (genesis `alloc`에 바이트코드 + 스토리지 직접 배치) 방식을 제안했으나, 기술 검토 결과 다음 이유로 **L1 Deposit Transaction 기반 Post-Genesis 배포**로 전환한다:

1. **Genesis Predeploy의 근본적 한계**: constructor가 실행되지 않아 AccessControl, ReentrancyGuard 등의 초기화를 15개 이상의 스토리지 슬롯을 수동 계산하여 주입해야 한다. 슬롯 1개라도 틀리면 컨트랙트가 완전히 잠긴다.
2. **메인넷 Bridge Invariant 위반**: Genesis alloc으로 deployer에게 fee token 잔액을 부여하면, L1에 대응하는 담보 없이 토큰이 생성되어 bridge의 1:1 backing이 깨진다. 메인넷에서는 허용할 수 없는 형평성 문제이다.
3. **L1 Deposit Transaction의 이점**: L1에서 `OptimismPortal.depositTransaction()`을 호출하면 L2에서 가스비 없이 강제 실행된다. Constructor가 정상 실행되고, fee token 종류(ETH/USDT/USDC)와 무관하게 L1 ETH만으로 배포 가능하며, bridge invariant도 유지된다.

---

## 4. Objective

### 4.1 목표

DeFi 및 Full Preset으로 L2를 배포하는 사용자가 추가 설정 없이 CrossTrade 기능을 즉시 사용할 수 있도록 한다. L2 배포 파이프라인에 CrossTrade를 완전히 통합하여, 컨트랙트 배포부터 dApp UI 접근까지 원스톱으로 제공한다.

### 4.2 회사/생태계 이점

- TRH Platform으로 배포된 L2 체인의 DeFi 사용성이 즉시 확보되어, L2 운영자의 진입 장벽이 낮아진다.
- 외부 Provider가 참여하는 오픈 마켓 모델로, CrossTrade 네트워크 효과가 새 L2 배포마다 확대된다.
- Tokamak 생태계 내 L2 간 유동성이 자동으로 연결되어, 네트워크 전체의 가치가 상승한다.

### 4.3 Key Results (SMART OKR)

| KR | 측정 기준 | 목표 |
|----|-----------|------|
| KR1 | DeFi/Full Preset 배포 시 CrossTrade L2 컨트랙트가 L1 Deposit Tx로 배포 성공률 | 100% |
| KR2 | L2 배포 완료 후 L1 setChainInfo 자동 등록 성공률 | 95%+ |
| KR3 | CrossTrade dApp UI 정상 접근 가능 시간 (L2 배포 완료 후) | 5분 이내 |
| KR4 | Sepolia 테스트넷에서 L2→L1, L2→L2 CrossTrade 전체 플로우 성공 | ETH/USDC/USDT 각 토큰별 1회 이상 |

---

## 5. Market Segment(s)

### 5.1 Primary: L2 운영자 (DeFi 프로젝트)

DeFi 서비스를 제공하는 L2 체인을 운영하려는 팀 또는 프로젝트. 자체 L2를 배포하면서 크로스체인 유동성을 즉시 확보하고 싶어한다.

- **핵심 과제**: "L2를 배포한 후 사용자가 L1↔L2 간 자산을 빠르게 이동할 수 없으면, DeFi 서비스 자체가 무용지물이다."
- **제약 조건**: 스마트 컨트랙트 배포/설정에 대한 전문 지식이 부족할 수 있으며, 빠른 시장 출시가 중요하다.

### 5.2 Secondary: 외부 Provider (유동성 공급자)

CrossTrade 마켓에서 수익을 얻기 위해 Provider로 참여하는 개인 또는 봇 운영자. 새 L2가 추가될 때마다 새로운 수익 기회가 생긴다.

- **핵심 과제**: "새로 배포된 L2의 CrossTrade 요청을 발견하고 빠르게 제공(provide)하여 수수료 수익을 얻고 싶다."
- **제약 조건**: L1에 충분한 자금(ETH, USDC, USDT)이 필요하며, Provider Risk(L2 오퍼레이터 의존성)를 이해하고 감수해야 한다.

### 5.3 Tertiary: L2 최종 사용자

DeFi/Full Preset으로 배포된 L2에서 토큰을 보유한 사용자. 7일 대기 없이 빠르게 L1이나 다른 L2로 자산을 이동하고 싶다.

---

## 6. Value Proposition(s)

### 6.1 L2 운영자 가치

| 구분 | 기존 (Without CrossTrade) | 이후 (With CrossTrade) |
|------|--------------------------|----------------------|
| 크로스체인 브릿지 | 7일 출금 대기 (OP Stack 기본) | Provider를 통한 즉시 교환 |
| 배포 복잡도 | 수동으로 CrossTrade 컨트랙트 배포, L1 등록, dApp 설정 필요 | Preset 선택만으로 자동 통합 |
| 지원 토큰 | 직접 토큰 등록 스크립트 실행 필요 | ETH, USDC, USDT 사전 등록 완료 |
| L2↔L2 연결 | 직접 구현 불가 | L1 경유 L2↔L2 트레이딩 자동 지원 |

### 6.2 외부 Provider 가치

- 새 L2가 TRH Platform으로 배포될 때마다, 별도 설정 없이 기존 L1 CrossTrade 컨트랙트를 통해 새 L2의 요청을 처리할 수 있다.
- RequestCT 이벤트 모니터링으로 자동화된 Provider 봇 운영이 가능하다.

### 6.3 최종 사용자 가치

- L2 배포 직후부터 CrossTrade dApp을 통해 빠른 자산 이동이 가능하다.
- 요청 생성, 수수료 수정, 취소 등 전체 라이프사이클을 UI에서 관리할 수 있다.

---

## 7. Solution

### 7.1 시스템 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                     TRH Platform (Electron App)                     │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────────────────┐  │
│  │  Setup Page   │───▶│  Platform UI  │───▶│   Backend API         │  │
│  │  (Preset 선택) │    │  (CrossTrade  │    │   ┌─────────────────┐│  │
│  │              │    │   설정 표시)   │    │   │ preset-deploy   ││  │
│  │              │    │              │    │   │ + CrossTrade    ││  │
│  │              │    │              │    │   │   post-deploy   ││  │
│  │              │    │              │    │   └────────┬────────┘│  │
│  └──────────────┘    └──────────────┘    └────────────┼─────────┘  │
│                                                       │            │
│  Docker Compose Services:                             ▼            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────────────┐   │
│  │ Database │ │ Backend  │ │ Frontend │ │ CrossTrade dApp    │   │
│  │ (PG 15)  │ │ (:8000)  │ │ (:3000)  │ │ (:3001) [NEW]     │   │
│  └──────────┘ └──────────┘ └──────────┘ └────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
            ┌──────────┐ ┌──────────┐ ┌──────────────────────────┐
            │ trh-sdk  │ │ L1 Chain │ │ L2 Chain (New)           │
            │ (deploy  │ │ (기존 CT │ │ (CT L2 contracts via     │
            │  script) │ │  L1 ctrs)│ │  L1 Deposit Tx 배포)     │
            └──────────┘ └──────────┘ └──────────────────────────┘
                                │
                    L1 OptimismPortal.depositTransaction()
                    → L2에서 CT 컨트랙트 배포 + 초기화
```

### 7.2 핵심 기능 상세

#### Feature 1: L1 Deposit Transaction 기반 CrossTrade L2 컨트랙트 배포

L2 체인 부팅 후, L1에서 `OptimismPortal.depositTransaction()`을 통해 CrossTrade 컨트랙트를 L2에 배포한다. 이 방식은 constructor가 정상 실행되어 AccessControl, ReentrancyGuard 등이 자동 초기화되며, L2 fee token 종류와 무관하게 L1 ETH만으로 배포 가능하다.

**대상 컨트랙트 (4개):**

| 컨트랙트 | 용도 | 비고 |
|----------|------|------|
| L2CrossTradeProxy.sol | L2→L1 크로스트레이드 프록시 | constructor가 AccessControl 자동 초기화 |
| L2CrossTrade.sol | L2→L1 크로스트레이드 구현체 | ReentrancyGuard 자동 초기화 |
| L2toL2CrossTradeProxy.sol | L2→L2 크로스트레이드 프록시 | constructor가 AccessControl 자동 초기화 |
| L2toL2CrossTradeL2.sol | L2→L2 크로스트레이드 구현체 | ReentrancyGuard 자동 초기화 |

> **참고:** L2CrossTradeStorage.sol 및 L2toL2CrossTradeStorage.sol은 별도 컨트랙트가 아니라 Proxy에 상속되어 스토리지 레이아웃을 정의하는 역할이므로, 독립 배포 대상이 아니다.

**배포 시퀀스 (L2→L1 CrossTrade 기준):**

```
[L1] deployer가 OptimismPortal.depositTransaction() 호출
     │
     ├── Step 1: L2CrossTrade (impl) 컨트랙트 생성
     │   → _isCreation: true
     │   → _data: L2CrossTrade creation bytecode
     │   → L2에서 constructor 실행 (ReentrancyGuard._status = 1) ✅
     │
     ├── Step 2: L2CrossTradeProxy 컨트랙트 생성
     │   → _isCreation: true
     │   → _data: L2CrossTradeProxy creation bytecode
     │   → L2에서 constructor 실행:
     │     _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE) ✅
     │     _grantRole(ADMIN_ROLE, msg.sender) ✅
     │
     ├── Step 3: proxy.setSelectorImplementations2(selectors, implAddress)
     │   → onlyOwner 검증 통과 (Step 2에서 ADMIN_ROLE 설정됨) ✅
     │
     ├── Step 4: proxy.initialize(crossDomainMessenger)
     │   → crossDomainMessenger 주소 설정 ✅
     │
     ├── Step 5: proxy.setChainInfo(l1CrossTrade, l1ChainId)
     │   → L1 연결 정보 설정 ✅
     │
     └── Step 6: proxy.registerToken(token pairs)
         → ETH, USDC, USDT 토큰 쌍 사전 등록 ✅

[L2→L2 CrossTrade도 동일한 6-step으로 반복]
```

**L1 Deposit Transaction 메커니즘:**

```solidity
// L1에서 실행 — deployer는 L1 ETH로 가스비만 지불
// L2 sender에게 fee token 잔액이 필요 없음
OptimismPortal.depositTransaction(
    _to:         address(0),              // contract creation
    _value:      0,                        // no value transfer
    _gasLimit:   3_000_000,               // L2 execution gas
    _isCreation: true,
    _data:       contractCreationBytecode
);
```

핵심 특성:
- L2 sender의 fee token 잔액 확인 없이 실행됨 (deposit 타입 트랜잭션)
- L1 가스비만 필요 (fee token이 ETH/USDT/USDC 중 무엇이든 무관)
- Constructor가 정상 실행되어 모든 초기화가 자동으로 완료됨
- Bridge invariant 유지 — 무담보 토큰이 생성되지 않음

**L1 비용 추정:**

```
Deposit Transaction 1회당 L1 gas ≈ 약 100,000~150,000 (고정 오버헤드) + L2 실행분
CrossTrade 전체 배포 (약 12회 deposit tx):
  L1 gas 총합 ≈ 약 2,000,000~4,000,000 gas
  L1 ETH 비용 ≈ 약 0.01~0.05 ETH (L1 gas price에 따라)
```

**Deployer 주소 결정:**

L1 Deposit Transaction에서 L2의 sender 주소는 L1 caller가 EOA인 경우 동일한 주소, 컨트랙트인 경우 alias가 적용된다. Deployer를 EOA로 사용하면 L1과 L2의 주소가 동일하여 관리가 단순하다.

**컨트랙트 주소 예측:**

트랜잭션 배포에서 주소는 `CREATE`의 `(sender, nonce)` 기반이다. 신규 L2에서 deployer의 첫 트랜잭션부터 순서대로 배포하면 주소가 사실상 결정적이다. 배포 스크립트가 반환하는 주소를 후속 단계(dApp 설정, L1 등록)에 자동 주입한다.

**trh-sdk 변경 사항:**
- CrossTrade 배포 스크립트 모듈 추가 (`deploy-crosstrade.ts`)
- OptimismPortal 주소를 L2 deployment output에서 자동 획득
- 배포 완료 후 각 컨트랙트 주소를 JSON으로 출력 → Backend가 수집

**Preset 매핑:**

| Preset | CrossTrade L2→L1 | CrossTrade L2→L2 | 사전 등록 토큰 |
|--------|------------------|------------------|--------------|
| General | ❌ | ❌ | — |
| DeFi | ✅ | ✅ | ETH, USDC, USDT |
| Gaming | ❌ | ❌ | — |
| Full | ✅ | ✅ | ETH, USDC, USDT |

#### Feature 2: L1 자동 등록 — setChainInfo

L2 배포 완료 후, trh-backend가 기존 L1 CrossTrade 컨트랙트에 새 L2를 등록하는 자동 프로세스.

**등록 흐름:**

1. trh-sdk가 L2 체인 부팅 + CrossTrade L2 컨트랙트 배포 완료를 보고
2. trh-backend가 배포된 L2 CrossTrade 컨트랙트 주소, CrossDomainMessenger 주소를 수집
3. trh-backend가 L1 CrossTrade 컨트랙트의 owner 키로 다음 트랜잭션 실행:
   - `L1CrossTradeProxy.setChainInfo(l2ChainId, crossDomainMessenger, l2CrossTradeAddress, nativeToken)`
   - `L2toL2CrossTradeProxyL1.setChainInfo(l2ChainId, crossDomainMessenger, l2toL2CrossTradeL2Address, bridge, usdcBridge, nativeToken)`
4. 트랜잭션 확인 후 CrossTrade 사용 가능 상태로 전환

**필수 조건:**
- trh-backend가 L1 CrossTrade 컨트랙트의 owner 권한을 가진 키에 접근 가능해야 함
- L1에 충분한 ETH가 있어야 함 (setChainInfo 가스비)
- setChainInfo의 파라미터 중 bridge, usdcBridge 주소는 L2 배포 시 결정되는 값이므로 SDK로부터 전달받아야 함

**에러 처리:**
- L1 트랜잭션 실패 시 최대 3회 재시도
- 재시도 실패 시 Electron 앱 알림으로 수동 등록 가이드 제공
- 등록 상태를 Platform UI의 배포 상태 페이지에 표시

#### Feature 3: CrossTrade dApp 컨테이너 배포

기존 crossTrade 레포의 `frontend/cross-trade-dApp`을 Docker 이미지로 빌드하여 docker-compose에 추가한다.

**docker-compose.yml 변경:**

```yaml
crosstrade-dapp:
  image: tokamaknetwork/cross-trade-dapp@sha256:<digest>
  ports:
    - "3001:3000"
  environment:
    # cross-trade-dApp은 next-runtime-env를 사용하여 런타임에 JSON config를 로드한다.
    # 각 환경 변수는 체인별 컨트랙트 주소/RPC/chainId를 포함하는 JSON blob이다.
    - NEXT_PUBLIC_CHAIN_CONFIG_L2_L1=${CHAIN_CONFIG_L2_L1}
    - NEXT_PUBLIC_CHAIN_CONFIG_L2_L2=${CHAIN_CONFIG_L2_L2}
    - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_PROJECT_ID}
  depends_on:
    - backend
  restart: unless-stopped
```

**환경 변수 형식 (실제 dApp 코드 기반):**

cross-trade-dApp의 `src/config/contracts.ts`는 `next-runtime-env`의 `env()`를 사용하여 환경 변수를 런타임에 JSON으로 파싱한다. 빌드 타임이 아닌 런타임 로딩이므로, Docker 컨테이너 시작 시 환경 변수만 변경하면 새 L2 체인에 적응 가능하다.

```bash
# config/.env.crosstrade 예시 (trh-backend가 자동 생성)
CHAIN_CONFIG_L2_L1='{"chainId":11155111,"l1CrossTradeContract":"0xf3473E20F1d9EB4468C72454a27aA1C65B67AB35","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC>","l2CrossTradeContract":"<DEPLOYED_ADDRESS>"}]}'
CHAIN_CONFIG_L2_L2='{"chainId":11155111,"l1CrossTradeContract":"0xDa2CbF69352cB46d9816dF934402b421d93b6BC2","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC>","l2CrossTradeContract":"<DEPLOYED_ADDRESS>"}]}'
WALLETCONNECT_PROJECT_ID=<project-id>
```

**환경 변수 자동 설정:**
- L2 CrossTrade 컨트랙트 배포 완료 후 trh-backend가 배포된 주소를 수집
- 수집된 주소 + L2 RPC URL + Chain ID를 JSON 구조로 조합하여 `config/.env.crosstrade` 생성
- DeFi/Full Preset이 아닌 경우 crosstrade-dapp 서비스를 시작하지 않음

**dApp 접근:**
- 로컬: `http://localhost:3001`
- EC2: `http://<instance-ip>:3001`
- Platform UI에서 "CrossTrade" 링크를 통해 접근 가능

#### Feature 4: Preset Deploy API 확장

trh-backend의 `/api/v1/stacks/thanos/preset-deploy` API를 확장한다.

**요청 파라미터 추가:**

```typescript
interface PresetDeployRequest {
  preset: 'general' | 'defi' | 'gaming' | 'full';
  // ... 기존 파라미터

  // CrossTrade 관련 (DeFi/Full Preset에서 자동 설정)
  crossTrade?: {
    enabled: boolean;
    l1CrossTradeAddress: string;       // 기존 L1 컨트랙트 주소
    l2toL2CrossTradeL1Address: string; // 기존 L2toL2 L1 컨트랙트 주소
    supportedTokens: TokenPair[];      // 사전 등록할 토큰 쌍
    l1OwnerKey: string;                // setChainInfo 실행용 L1 owner 키
    deployerKey: string;               // L1 Deposit Tx 실행용 deployer 키
  };
}

interface TokenPair {
  l1Token: string;  // L1 토큰 주소 (ETH = address(0))
  l2Token: string;  // L2 토큰 주소
  symbol: string;   // 토큰 심볼 (ETH, USDC, USDT)
}
```

**응답 확장:**

```typescript
interface DeploymentStatus {
  // ... 기존 필드
  crossTrade?: {
    l2ContractsDeployed: boolean;
    l2ContractAddresses: {
      l2CrossTradeProxy: string;
      l2CrossTrade: string;
      l2toL2CrossTradeProxy: string;
      l2toL2CrossTradeL2: string;
    };
    l1RegistrationStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
    dAppContainerStatus: 'pending' | 'running' | 'error';
    dAppUrl: string;
  };
}
```

### 7.3 사용자 플로우

#### Flow 1: L2 배포 with CrossTrade (DeFi Preset)

```
[Electron App]
     │
     ▼
[1] Setup Page → Preset 선택: "DeFi"
     │            → CrossTrade 자동 활성화 표시
     │            → L1 CrossTrade 컨트랙트 주소 확인 (Sepolia)
     │
     ▼
[2] Config Page → 체인 파라미터 설정 (chainName, chainId 등)
     │            → CrossTrade 설정 섹션:
     │              - L1 CrossTrade 주소 (사전 입력, 수정 가능)
     │              - 지원 토큰 목록 (ETH, USDC, USDT 기본 선택)
     │              - L1 Owner 키 설정 (setChainInfo 실행용)
     │              - Deployer 키 설정 (L1 Deposit Tx용, L1 ETH 필요)
     │
     ▼
[3] Deploy → Platform UI에서 "Deploy" 클릭
     │       → Backend가 trh-sdk 호출:
     │         - Genesis config 생성 (CrossTrade 미포함 — post-deploy로 처리)
     │         - L2 체인 부팅
     │
     ▼
[4] Post-Deploy → Backend 자동 실행:
     │             - L1 Deposit Tx로 CrossTrade L2 컨트랙트 배포 (12 tx)
     │             - 배포된 주소 수집
     │             - L1 setChainInfo 트랜잭션 (L2→L1 CrossTrade)
     │             - L1 setChainInfo 트랜잭션 (L2→L2 CrossTrade)
     │             - CrossTrade dApp 컨테이너 시작 (배포 주소 → env 주입)
     │
     ▼
[5] Complete → 배포 상태 페이지:
               - ✅ L2 Chain: Running
               - ✅ CrossTrade L2 Contracts: Deployed (via L1 Deposit Tx)
               - ✅ L1 Registration: Completed
               - ✅ CrossTrade dApp: http://localhost:3001
```

#### Flow 2: CrossTrade 사용 (최종 사용자)

```
[CrossTrade dApp - http://localhost:3001]
     │
     ▼
[1] 지갑 연결 (Reown AppKit)
     │
     ▼
[2] CreateRequest → 소스 체인(L2), 목적지 체인(L1 or 다른 L2), 토큰, 금액 입력
     │              → ERC20인 경우 Approve 먼저 실행
     │              → requestRegisteredToken() 호출 → 토큰 잠금
     │
     ▼
[3] Provider가 RequestPool에서 요청 발견
     │ → Provide Cross Trade → L1에서 provideCT() 실행
     │ → Requester에게 L1 토큰 즉시 전송
     │
     ▼
[4] CrossDomainMessenger가 L2로 claimCT() 자동 전달
     │ → Provider에게 L2 잠긴 토큰 전송
     │
     ▼
[5] History에서 거래 완료 확인
```

### 7.4 기술 상세

#### 7.4.1 지원 토큰 및 브릿지 라우팅

| 토큰 | L1 주소 (Sepolia) | 브릿지 경로 | 특수 처리 |
|------|-------------------|-------------|-----------|
| ETH | address(0) | StandardBridge / OptimismPortal | msg.value로 전송, gas: 51000 |
| USDC | TBD | L1UsdcBridge → MasterMinter.mint | 전용 USDC 브릿지 사용 |
| USDT | TBD | StandardBridge | Double approval 패턴 (approve 0 → approve amount) |

#### 7.4.2 CrossTrade 해시 메커니즘

모든 거래의 무결성은 keccak256 해시로 보장된다:

- **L2→L1 해시** (8개 파라미터): `keccak256(l1token, l2token, requester, totalAmount, ctAmount, saleCount, startChainId, endChainId)`
- **L2→L2 해시** (11개 파라미터): 위 항목 + `l2DestToken, l2SourceChainId, l2DestChainId`

#### 7.4.3 보안 고려사항

| 위험 | 심각도 | 완화 조치 |
|------|--------|-----------|
| Provider Risk (L2 오퍼레이터 의존성) | CRITICAL | resendProvideCTMessage() 재전송 메커니즘, Provider에게 위험 고지 |
| L1 Owner 키 노출 | CRITICAL | Electron safeStorage로 암호화 저장, 메모리에서만 복호화 |
| Deployer 키 관리 | HIGH | L1 Deposit Tx 실행용 키, 배포 완료 후 더 이상 필요 없음. 최소 잔액만 유지 |
| 프론트러닝 (provideCT 선취) | HIGH | completedCT[hash] first-come-first-served로 제한 |
| Cross-Domain 메시지 위조 | HIGH | checkL1 modifier: messenger + xDomainMessageSender 이중 검증 |
| EIP-7702 위임 EOA 우회 | MEDIUM | EOA.sol 라이브러리의 코드길이/패턴 검증 |
| 비표준 ERC20 (fee-on-transfer) | MEDIUM | SafeERC20 사용, fee-on-transfer 토큰 미지원 문서화 |
| setChainInfo 실패 | MEDIUM | 최대 3회 재시도, 실패 시 수동 가이드 제공 |
| L1 Deposit Tx 실패 | MEDIUM | 개별 tx 확인 후 다음 단계 진행, 부분 실패 시 재시도 가능 |

#### 7.4.4 EC2 보안 그룹 변경

CrossTrade dApp 포트를 EC2 보안 그룹에 추가:

```
기존:
- SSH (22) from 0.0.0.0/0
- Frontend (3000) from 0.0.0.0/0
- Backend (8000) from 0.0.0.0/0

추가:
- CrossTrade dApp (3001) from 0.0.0.0/0
```

#### 7.4.5 메인넷 배포 고려사항

**Bridge Invariant 원칙:**

메인넷에서 L2의 native token은 L1에 locked된 토큰과 1:1 backing이 되어야 한다. 따라서:

- ❌ Genesis alloc으로 deployer에 fee token 잔액 부여 — bridge backing이 없는 무담보 토큰 생성
- ✅ L1 Deposit Transaction — deployer가 L1 ETH만 지불, L2에 무담보 토큰 미생성

**Fee Token 종류별 배포 호환성:**

| L2 Fee Token | L1 Deposit Tx 지원 | Deployer 필요 자금 | Bridge Invariant |
|-------------|-------------------|-------------------|-----------------|
| ETH | ✅ | L1 ETH | ✅ 유지 |
| USDT | ✅ | L1 ETH | ✅ 유지 |
| USDC | ✅ | L1 ETH | ✅ 유지 |
| TON | ✅ | L1 ETH | ✅ 유지 |

모든 fee token 시나리오에서 deployer는 L1 ETH만 보유하면 된다.

**테스트넷 vs 메인넷 전략 차이:**

| 항목 | 테스트넷 (Sepolia) | 메인넷 |
|------|-------------------|--------|
| 배포 방식 | L1 Deposit Tx (동일) | L1 Deposit Tx (동일) |
| Deployer 자금 | Sepolia ETH (faucet) | 실제 ETH (약 0.01~0.05 ETH) |
| 컨트랙트 주소 | Nonce 기반 결정적 | Nonce 기반 결정적 |
| 가용성 지연 | 수 초~분 (허용 가능) | 수 초~분 (허용 가능) |
| Bridge Invariant | 중요하지 않음 | 반드시 유지 |

### 7.5 Assumptions

| 가정 | 검증 방법 | 위험도 |
|------|-----------|--------|
| 기존 L1 CrossTrade 컨트랙트(Sepolia)가 정상 동작하며 setChainInfo 호출이 가능하다 | Sepolia에서 실제 setChainInfo 트랜잭션 테스트 | 낮음 |
| L1 OptimismPortal.depositTransaction()으로 L2에서 컨트랙트 생성 및 함수 호출이 가능하다 | Sepolia devnet에서 deposit tx 배포 PoC 검증 | 중간 |
| L1 Deposit Tx의 sender alias 규칙이 deployer EOA에 대해 동일 주소를 보장한다 | OP Stack 사양 확인: EOA caller → L2 sender 동일 | 낮음 |
| cross-trade-dApp이 `next-runtime-env` 기반 JSON 환경 변수로 새 L2 체인 설정에 적응할 수 있다 | 기존 dApp의 `contracts.ts` + `.env.example` 구조 확인 완료 | 낮음 |
| 외부 Provider가 Sepolia 테스트넷에서 충분히 참여할 것이다 | 초기에는 내부 테스트용 Provider 운영 필요 | 중간 |
| L1 CrossTrade owner 키를 trh-backend에 안전하게 전달하는 메커니즘이 가능하다 | Electron safeStorage + IPC 암호화 전달 방식 검토 | 높음 |
| 12회의 L1 Deposit Transaction이 합리적인 시간(5분 이내) 내에 L2에서 처리된다 | Sepolia에서 실제 배포 시간 측정 | 중간 |

---

## 8. Release

### 8.1 Phase 1: Foundation (약 4-6주)

**목표:** Sepolia 테스트넷에서 L1 Deposit Tx 기반 L2→L1 CrossTrade 전체 플로우 동작 검증

- trh-sdk에 CrossTrade L1 Deposit Tx 배포 스크립트 구현 (`deploy-crosstrade.ts`)
- OptimismPortal 연동: depositTransaction() 호출 → L2 컨트랙트 배포 + 초기화
- trh-backend에 setChainInfo 자동 호출 로직 추가
- docker-compose에 CrossTrade dApp 서비스 추가 (JSON config 환경 변수 기반)
- DeFi/Full Preset fixture에 CrossTrade 설정 포함
- Sepolia에서 ETH L2→L1 크로스트레이드 E2E 테스트

**산출물:**
- trh-sdk CrossTrade L1 Deposit Tx 배포 모듈
- trh-backend CrossTrade 배포 후처리 API
- 업데이트된 docker-compose.yml
- Sepolia E2E 테스트 결과

### 8.2 Phase 2: Full Token & L2→L2 Support (약 3-4주)

**목표:** USDC, USDT 토큰 지원 및 L2→L2 크로스트레이드 통합

- L2toL2CrossTrade 컨트랙트 L1 Deposit Tx 배포 추가
- USDC 전용 브릿지(L1UsdcBridge/L2UsdcBridge) 연동
- USDT double approval 패턴 검증
- registerToken 자동 등록 (ETH, USDC, USDT 토큰 쌍)
- L2→L2 크로스트레이드 E2E 테스트 (3-chain: L2A → L1 → L2B)

**산출물:**
- 전체 토큰 지원 배포 스크립트
- L2→L2 통합 테스트 결과
- 토큰 등록 자동화 스크립트

### 8.3 Phase 3: UX Polish & Security (약 2-3주)

**목표:** 사용자 경험 개선 및 보안 검증

- Electron Setup 페이지에 CrossTrade 설정 상태 표시
- Platform UI 배포 상태 페이지에 CrossTrade 상태 추가 (L1 Deposit Tx 진행률 포함)
- L1 owner 키 + deployer 키 관리 보안 강화 (Electron safeStorage 통합)
- setChainInfo 실패 시 에러 복구 플로우
- L1 Deposit Tx 부분 실패 시 재시도 메커니즘
- EC2 배포 시 CrossTrade dApp 포트 자동 오픈
- 외부 보안 감사 피드백 반영

**산출물:**
- 완성된 UX 플로우
- 보안 감사 대응 문서
- EC2 배포 통합 테스트

### 8.4 Phase 4: Mainnet Preparation (Phase 3 완료 후)

**목표:** 메인넷 배포 준비 (본 PRD 범위 외, 후속 PRD에서 상세화)

- 외부 보안 감사 완료 확인
- 메인넷 L1 CrossTrade 컨트랙트 주소 확정
- 메인넷 deployer 키 관리 방안 확정 (배포 완료 후 키 폐기 절차 포함)
- Bridge invariant 검증 자동화 (L2 총 공급량 vs L1 locked 금액 일치 확인)
- Provider Risk 고지 문서 작성
- 메인넷 배포 체크리스트 및 롤백 절차

---

## Appendix A: CrossTrade 컨트랙트 구조 요약

### L1 컨트랙트 (기존 배포, 재사용)

| 컨트랙트 | 코드량 | 핵심 함수 |
|----------|--------|-----------|
| L1CrossTrade.sol | 465줄 | provideCT, editFee, cancel, resendProvideCTMessage |
| L2toL2CrossTradeL1.sol | 562줄 | provideCT (11 params), resendProvideCTMessage |
| L1CrossTradeProxy.sol | 27줄 | setChainInfo |

### L2 컨트랙트 (L1 Deposit Tx로 배포)

| 컨트랙트 | 코드량 | 핵심 함수 | 배포 방식 |
|----------|--------|-----------|-----------|
| L2CrossTrade.sol | 426줄 | requestRegisteredToken, requestNonRegisteredToken, claimCT, cancelCT | L1 Deposit Tx (impl) |
| L2CrossTradeProxy.sol | 33줄 | initialize, setChainInfo | L1 Deposit Tx (proxy) |
| L2toL2CrossTradeL2.sol | 529줄 | requestRegisteredToken, requestNonRegisteredToken, claimCT, cancelCT | L1 Deposit Tx (impl) |
| L2toL2CrossTradeProxy.sol | 33줄 | initialize, setChainInfo | L1 Deposit Tx (proxy) |

> **참고:** Storage 컨트랙트(L2CrossTradeStorage, L2toL2CrossTradeStorage)는 Proxy에 상속되어 스토리지 레이아웃을 정의하는 역할이며, 별도의 독립 배포 대상이 아니다.

### 스토리지 레이아웃 (L2CrossTradeProxy 기준)

| Slot | Variable | Type | 출처 |
|------|----------|------|------|
| 0 | `pauseProxy` | bool | ProxyStorage |
| 1 | `proxyImplementation` | mapping(uint256 → address) | ProxyStorage |
| 2 | `aliveImplementation` | mapping(address → bool) | ProxyStorage |
| 3 | `selectorImplementation` | mapping(bytes4 → address) | ProxyStorage |
| 4 | `_roles` | mapping(bytes32 → RoleData) | AccessControl (OZ v5) |
| 5 | `crossDomainMessenger` | address | L2CrossTradeStorage |
| 6 | `NATIVE_TOKEN` | address | L2CrossTradeStorage |
| 7 | `saleCount` | uint256 | L2CrossTradeStorage |
| 8 | `dealData` | mapping(uint256 → RequestData) | L2CrossTradeStorage |
| 9 | `registerCheck` | mapping³ | L2CrossTradeStorage |
| 10 | `chainData` | mapping(uint256 → address) | L2CrossTradeStorage |
| 11* | `_status` | uint256 | ReentrancyGuard (impl만) |

> L1 Deposit Tx 배포에서는 constructor가 정상 실행되므로 이 스토리지 레이아웃의 수동 계산이 불필요하다.

## Appendix B: 환경 변수 명세

### config/.env.crosstrade (자동 생성)

```bash
# CrossTrade Configuration (auto-generated by trh-backend)
# cross-trade-dApp은 next-runtime-env를 사용하여 런타임에 JSON을 파싱한다.

# L2→L1 CrossTrade chain config (JSON blob)
CHAIN_CONFIG_L2_L1='{"chainId":11155111,"l1CrossTradeContract":"0xf3473E20F1d9EB4468C72454a27aA1C65B67AB35","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC_URL>","l2CrossTradeContract":"<DEPLOYED_L2_CT_PROXY>"}]}'

# L2→L2 CrossTrade chain config (JSON blob)
CHAIN_CONFIG_L2_L2='{"chainId":11155111,"l1CrossTradeContract":"0xDa2CbF69352cB46d9816dF934402b421d93b6BC2","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC_URL>","l2CrossTradeContract":"<DEPLOYED_L2TOL2_CT_PROXY>"}]}'

# WalletConnect
WALLETCONNECT_PROJECT_ID=<project-id>
```

> **주의:** v1.0에서 사용한 개별 환경 변수(`NEXT_PUBLIC_L1_CHAIN_ID`, `NEXT_PUBLIC_L2_CHAIN_IDS` 등)는 실제 dApp 코드와 일치하지 않는다. dApp은 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L1`과 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L2`라는 두 개의 JSON blob 환경 변수를 사용한다.

## Appendix C: 테스트 전략

### Unit Tests (Vitest)

- Preset → CrossTrade 설정 매핑 정합성 (DeFi/Full = enabled, General/Gaming = disabled)
- L1 Deposit Tx 배포 스크립트의 트랜잭션 시퀀스 검증 (mock OptimismPortal)
- 토큰 쌍 등록 데이터 정합성
- dApp 환경 변수 JSON 생성 정합성

### Integration Tests (Vitest + MSW)

- preset-deploy API에 CrossTrade 파라미터 포함 시 올바른 SDK 호출 검증
- L1 Deposit Tx 배포 → 주소 수집 → setChainInfo 호출 전체 시퀀스
- setChainInfo 자동 호출 플로우 (성공/실패/재시도)
- docker-compose CrossTrade dApp 서비스 상태 관리

### E2E Tests (Playwright)

- DeFi Preset 선택 → CrossTrade 설정 UI 표시 검증
- 배포 완료 후 CrossTrade dApp 접근 가능 확인
- L2→L1 ETH CrossTrade 전체 플로우 (Sepolia fork 환경)

## Appendix D: Genesis Predeploy 방식 폐기 사유

v1.0에서 제안했던 Genesis Predeploy 방식은 다음 이유로 폐기한다:

1. **Constructor 미실행 문제**: Genesis `alloc`에 배치된 컨트랙트는 constructor가 실행되지 않는다. Proxy.sol의 constructor에서 수행하는 `_setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE)` 및 `_grantRole(ADMIN_ROLE, msg.sender)`가 실행되지 않아, 15개 이상의 스토리지 슬롯을 keccak256으로 수동 계산하여 genesis state에 주입해야 한다.

2. **슬롯 1개 오류 시 전체 실패**: AccessControl의 `_roles` 매핑은 2중 중첩 구조(mapping → struct → mapping)로, 슬롯 계산이 틀리면 `onlyOwner`가 붙은 모든 함수(`initialize`, `setChainInfo`, `registerToken`, `upgradeTo`)가 호출 불가능해진다. 복구 방법이 없다.

3. **메인넷 Bridge Invariant 위반**: Genesis alloc으로 deployer에게 fee token 잔액을 부여하면 L1에 대응하는 locked 토큰 없이 L2 native token이 생성된다. withdrawal 시 다른 사용자 자금이 부족해질 수 있다.

4. **유지보수 부담**: 컨트랙트에 함수가 추가/변경될 때마다 selector 매핑의 슬롯을 재계산해야 한다.

상세 기술 분석은 `Genesis-Predeploy-Storage-Analysis.md` 참조.

---

*본 문서는 Draft 상태이며, 팀 리뷰를 통해 보완될 예정입니다.*
