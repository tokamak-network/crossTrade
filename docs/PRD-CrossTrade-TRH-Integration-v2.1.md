# PRD: CrossTrade Integration for DeFi & Full Presets

**문서 버전:** 2.1
**작성일:** 2026-04-06
**최종 수정:** 2026-04-07
**상태:** Draft (v2.1 — Go 인터페이스 반영, 로컬 배포 스코프 명확화)

### 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2026-04-06 | 초안 작성 |
| 2.0 | 2026-04-07 | Genesis Predeploy → L1 Deposit Transaction 배포 방식 전환, dApp 환경 변수 수정, 메인넷 고려사항 추가, 컨트랙트 테이블 정정 |
| 2.1 | 2026-04-07 | Go 인터페이스 반영 (기존 TypeScript → Go struct), 로컬 배포 스코프 명확화, 기존 AWS CrossTrade 코드와의 관계 정리, Preset 매핑 DeFi/Full로 변경, 코드 삽입 지점 명시 |

---

## 1. Summary

TRH Platform의 Electron 앱을 통해 L2를 배포할 때, DeFi 및 Full Preset을 선택하면 CrossTrade 프로토콜이 자동으로 통합되도록 구현한다. CrossTrade는 L2↔L1, L2↔L2 간 빠른 토큰 교환을 가능하게 하는 탈중앙화 크로스체인 트레이딩 프로토콜로, 기존 7일 출금 대기를 제거하여 사용자 경험을 크게 개선한다.

이 PRD는 L2 체인 부팅 후 L1 Deposit Transaction을 통한 컨트랙트 배포, 기존 L1 컨트랙트와의 자동 연결, CrossTrade dApp UI 컨테이너 배포까지의 End-to-End 통합 범위를 정의한다.

---

## 1.1 스코프: 로컬(Docker Compose) 배포

이 PRD는 **로컬 인프라(`infraProvider: "local"`)** 환경에서의 CrossTrade 통합에 집중한다.

### 기존 AWS CrossTrade 구현과의 관계

현재 코드베이스에는 AWS(K8s/Helm) 기반 CrossTrade 배포가 이미 부분 구현되어 있다:

| 레포 | 파일 | 현재 구현 | 이 PRD의 범위 |
|------|------|-----------|--------------|
| trh-sdk | `pkg/stacks/thanos/cross_trade.go` (1133줄) | Foundry 스크립트 기반 L1/L2 컨트랙트 배포 + Helm dApp 배포 | L1 Deposit Tx 기반 L2 컨트랙트 배포 함수 추가 (`DeployCrossTradeLocal`) |
| trh-backend | `pkg/services/thanos/integrations/cross_trade.go` | Install/Uninstall/Cancel/Retry 패턴 (AWS SDK client 사용) | 로컬 배포 후처리: L1 setChainInfo + dApp Docker Compose 서비스 |
| trh-backend | `pkg/api/dtos/cross-trade.go` | `InstallCrossChainBridgeRequest` DTO | 로컬 전용 설정 필드 추가 |
| trh-backend | `pkg/services/thanos/stack_lifecycle.go:123-125` | `localUnsupported["crossTrade"] = true` ← **차단됨** | **이 차단을 해제**하고 로컬 자동 설치 플로우 구현 |
| trh-platform-ui | `src/features/rollup/schemas/preset.ts` | DeFi: `crossTrade: false`, Gaming/Full: `crossTrade: true` | **DeFi/Full: `crossTrade: true`**, Gaming: `crossTrade: false` |
| trh-sdk | `pkg/constants/chain.go:18-45` | Gaming/Full에 `crossTrade: true` | **DeFi/Full에 `crossTrade: true`** |

### 핵심 변경 요약

1. **`localUnsupported` 맵에서 `crossTrade` 제거** → 로컬 배포에서 CrossTrade Integration 활성화
2. **SDK에 L1 Deposit Tx 배포 함수 추가** → 기존 Foundry 스크립트 방식과 병존
3. **Backend `deployment.go`의 로컬 auto-install 블록에 CrossTrade 추가** → 배포 완료 후 자동 실행
4. **Preset 매핑 변경**: CrossTrade를 Gaming/Full → **DeFi/Full**로 이동

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
     | IPC + window.__globals     | HTTP POST /preset-deploy      | import trh-sdk Go pkg      | ethclient/Docker
```

**중요:** Backend는 SDK를 HTTP/exec가 아닌 **Go 패키지 import**로 직접 호출한다:
```go
// trh-backend/pkg/stacks/thanos/thanos_stack.go
import thanosStack "github.com/tokamak-network/trh-sdk/pkg/stacks/thanos"
sdkClient, err := thanosStack.NewThanosStack(ctx, logger, network, false, deploymentPath, awsConfig)
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
            │ (Go pkg) │ │ (기존 CT │ │ (CT L2 contracts via     │
            │          │ │  L1 ctrs)│ │  L1 Deposit Tx 배포)     │
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

**trh-sdk 변경 사항 — Go 인터페이스:**

기존 `cross_trade.go`의 `DeployCrossTrade()` (Foundry 스크립트 기반 AWS 배포)와 **병존**하는 새 함수를 추가한다.

```go
// 파일: trh-sdk/pkg/stacks/thanos/cross_trade_local.go (신규)
package thanos

// DeployCrossTradeLocalInput은 L1 Deposit Tx 기반 로컬 CrossTrade 배포 입력이다.
// 기존 DeployCrossTradeInputs (Foundry 스크립트 기반)와 구분된다.
type DeployCrossTradeLocalInput struct {
    // L1 연결 정보
    L1RPCUrl             string `json:"l1_rpc_url"`
    L1ChainID            uint64 `json:"l1_chain_id"`
    DeployerPrivateKey   string `json:"deployer_private_key"`   // L1 Deposit Tx 실행용 EOA 키

    // L2 연결 정보 (부팅 완료된 L2)
    L2RPCUrl             string `json:"l2_rpc_url"`
    L2ChainID            uint64 `json:"l2_chain_id"`

    // L1 배포 완료된 컨트랙트 주소 (deployment output에서 자동 획득)
    OptimismPortalProxy  string `json:"optimism_portal_proxy"`  // types.Contracts.OptimismPortalProxy
    CrossDomainMessenger string `json:"cross_domain_messenger"` // constants.L2CrossDomainMessenger

    // 기존 L1 CrossTrade 컨트랙트 (이미 Sepolia에 배포됨)
    L1CrossTradeProxy    string `json:"l1_cross_trade_proxy"`    // L2→L1용
    L2toL2CrossTradeL1   string `json:"l2_to_l2_cross_trade_l1"` // L2→L2용

    // 사전 등록할 토큰 쌍
    SupportedTokens      []TokenPair `json:"supported_tokens"`
}

// TokenPair는 L1↔L2 토큰 매핑이다.
type TokenPair struct {
    L1Token string `json:"l1_token"` // L1 토큰 주소 (ETH = address(0))
    L2Token string `json:"l2_token"` // L2 토큰 주소
    Symbol  string `json:"symbol"`   // 토큰 심볼 (ETH, USDC, USDT)
}

// DeployCrossTradeLocalOutput은 L1 Deposit Tx 배포 결과이다.
type DeployCrossTradeLocalOutput struct {
    // L2→L1 CrossTrade 컨트랙트 주소
    L2CrossTradeProxy   string `json:"l2_cross_trade_proxy"`
    L2CrossTrade        string `json:"l2_cross_trade"`

    // L2→L2 CrossTrade 컨트랙트 주소
    L2toL2CrossTradeProxy string `json:"l2_to_l2_cross_trade_proxy"`
    L2toL2CrossTradeL2    string `json:"l2_to_l2_cross_trade_l2"`

    // L1 setChainInfo 호출 결과
    L1RegistrationTxHash  string `json:"l1_registration_tx_hash"`  // L2→L1 setChainInfo tx
    L1RegistrationL2L2Tx  string `json:"l1_registration_l2_l2_tx"` // L2→L2 setChainInfo tx
}

// DeployCrossTradeLocal은 L1 Deposit Tx를 통해 L2에 CrossTrade 컨트랙트를 배포한다.
// 기존 DeployCrossTrade() (Foundry 스크립트/Helm 기반)과 달리,
// go-ethereum ethclient를 직접 사용하여 OptimismPortal.depositTransaction()을 호출한다.
func (t *ThanosStack) DeployCrossTradeLocal(
    ctx context.Context,
    input *DeployCrossTradeLocalInput,
) (*DeployCrossTradeLocalOutput, error) {
    // 구현 참조: Section 7.2 Feature 1 배포 시퀀스
    // 1. L1 ethclient 연결
    // 2. OptimismPortal ABI 바인딩 (abis/ 디렉토리에 추가 필요)
    // 3. 12단계 Deposit Tx 순차 실행
    // 4. 각 tx의 L2 receipt 확인 (deposit tx → L2 tx 매핑)
    // 5. 배포된 주소 수집 및 반환
    return nil, nil // placeholder
}
```

**기존 SDK 타입과의 연결점:**

```go
// types.Contracts에 이미 존재하는 필드 활용:
// - OptimismPortalProxy → input.OptimismPortalProxy
// - L1CrossDomainMessengerProxy → CrossDomainMessenger 주소 획득 가능

// 배포 완료 후 주소를 기존 output 구조에 매핑:
// DeployCrossTradeLocalOutput → DeployCrossTradeContractsOutput 변환 가능
```

**OptimismPortal ABI 바인딩:**

```bash
# trh-sdk/abis/ 디렉토리에 추가
# abigen을 사용하여 Go 바인딩 생성
abigen --abi OptimismPortal.abi.json --pkg abis --type OptimismPortal --out abis/OptimismPortal.go
```

**Preset 매핑:**

| Preset | CrossTrade L2→L1 | CrossTrade L2→L2 | 사전 등록 토큰 |
|--------|------------------|------------------|--------------|
| General | ❌ | ❌ | — |
| DeFi | ✅ | ✅ | ETH, USDC, USDT |
| Gaming | ❌ | ❌ | — |
| Full | ✅ | ✅ | ETH, USDC, USDT |

**코드 변경 위치 (trh-sdk `pkg/constants/chain.go`):**

```go
// 변경 전:
var PresetModules = map[string]map[string]bool{
    PresetGaming: {
        "crossTrade": true,  // 제거
        "drb":        true,
        // ...
    },
    PresetFull: {
        "crossTrade": true,  // 유지
        // ...
    },
}

// 변경 후:
var PresetModules = map[string]map[string]bool{
    PresetDeFi: {
        "crossTrade": true,  // 추가
        // ...
    },
    PresetGaming: {
        // "crossTrade" 제거, "drb" 유지
        "drb": true,
        // ...
    },
    PresetFull: {
        "crossTrade": true,  // 유지
        // ...
    },
}
```

#### Feature 2: L1 자동 등록 — setChainInfo

L2 배포 완료 후, trh-backend가 기존 L1 CrossTrade 컨트랙트에 새 L2를 등록하는 자동 프로세스.

**등록 흐름:**

1. trh-sdk의 `DeployCrossTradeLocal()`이 L2 CrossTrade 컨트랙트 배포 완료를 반환
2. trh-backend가 배포된 L2 CrossTrade 컨트랙트 주소, CrossDomainMessenger 주소를 수집
3. trh-backend가 L1 CrossTrade 컨트랙트의 owner 키로 다음 트랜잭션 실행:
   - `L1CrossTradeProxy.setChainInfo(l2ChainId, crossDomainMessenger, l2CrossTradeAddress, nativeToken)`
   - `L2toL2CrossTradeProxyL1.setChainInfo(l2ChainId, crossDomainMessenger, l2toL2CrossTradeL2Address, bridge, usdcBridge, nativeToken)`
4. 트랜잭션 확인 후 CrossTrade 사용 가능 상태로 전환

**L1 setChainInfo는 SDK가 아닌 Backend에서 직접 실행한다.** L1 owner 키 관리의 책임을 Backend에 집중시키고, SDK는 L2 컨트랙트 배포에만 집중한다. 이를 위한 Go 인터페이스:

```go
// 파일: trh-backend/pkg/services/thanos/integrations/cross_trade_local.go (신규)
package integrations

// CrossTradeL1RegistrationInput은 L1 setChainInfo 호출에 필요한 입력이다.
type CrossTradeL1RegistrationInput struct {
    L1RPCUrl               string `json:"l1_rpc_url"`
    L1OwnerPrivateKey      string `json:"l1_owner_private_key"` // setChainInfo 실행 권한

    // L2→L1 CrossTrade 등록
    L1CrossTradeProxy      string `json:"l1_cross_trade_proxy"`
    L2ChainID              uint64 `json:"l2_chain_id"`
    L2CrossDomainMessenger string `json:"l2_cross_domain_messenger"`
    L2CrossTradeProxy      string `json:"l2_cross_trade_proxy"`
    NativeToken            string `json:"native_token"` // L2 fee token 주소

    // L2→L2 CrossTrade 등록
    L2toL2CrossTradeL1     string `json:"l2_to_l2_cross_trade_l1"`
    L2toL2CrossTradeL2     string `json:"l2_to_l2_cross_trade_l2"`
    L2Bridge               string `json:"l2_bridge"`      // L2 StandardBridge 주소
    L2UsdcBridge           string `json:"l2_usdc_bridge"`  // L2 USDC Bridge 주소
}

// CrossTradeL1RegistrationOutput은 L1 등록 결과이다.
type CrossTradeL1RegistrationOutput struct {
    L2L1TxHash string `json:"l2_l1_tx_hash"` // L2→L1 setChainInfo tx hash
    L2L2TxHash string `json:"l2_l2_tx_hash"` // L2→L2 setChainInfo tx hash
    Success    bool   `json:"success"`
}
```

**에러 처리:**
- L1 트랜잭션 실패 시 최대 3회 재시도 (기존 `retryIntegrationCommon` 패턴 활용)
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
    - NEXT_PUBLIC_CHAIN_CONFIG_L2_L1=${CHAIN_CONFIG_L2_L1}
    - NEXT_PUBLIC_CHAIN_CONFIG_L2_L2=${CHAIN_CONFIG_L2_L2}
    - NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=${WALLETCONNECT_PROJECT_ID}
  depends_on:
    - backend
  restart: unless-stopped
```

**환경 변수 자동 설정 — Backend 로직:**

```go
// 파일: trh-backend/pkg/services/thanos/integrations/cross_trade_local.go
// 기존 deployment.go의 로컬 auto-install 패턴을 따름

// CrossTradeDAppConfig는 dApp Docker 컨테이너의 환경 변수를 생성한다.
type CrossTradeDAppConfig struct {
    ChainConfigL2L1    string `json:"chain_config_l2_l1"`    // JSON blob
    ChainConfigL2L2    string `json:"chain_config_l2_l2"`    // JSON blob
    WalletConnectID    string `json:"walletconnect_project_id"`
}

// BuildDAppConfig는 배포 결과를 기반으로 dApp 환경 변수 JSON을 생성한다.
func BuildDAppConfig(
    l1ChainID uint64,
    l2ChainID uint64,
    l2RPCUrl string,
    deployOutput *DeployCrossTradeLocalOutput, // SDK 결과 (cross_trade_local.go에서 import)
    l1CrossTradeProxy string,
    l2toL2CrossTradeL1 string,
) *CrossTradeDAppConfig {
    // config/.env.crosstrade 에 기록할 JSON 구조 생성
    return nil // placeholder
}
```

**dApp 접근:**
- 로컬: `http://localhost:3001`
- EC2: `http://<instance-ip>:3001`
- Platform UI에서 "CrossTrade" 링크를 통해 접근 가능

#### Feature 4: Backend 로컬 배포 플로우 — 코드 삽입 지점

**4a. `stack_lifecycle.go` — localUnsupported 해제:**

```go
// 변경 전 (pkg/services/thanos/stack_lifecycle.go:123-125):
localUnsupported := map[string]bool{
    "crossTrade": true, // requires additional contract deployment on AWS
}

// 변경 후:
localUnsupported := map[string]bool{
    // crossTrade는 L1 Deposit Tx로 로컬에서도 배포 가능 (v2.1)
}
```

**4b. `deployment.go` — 로컬 auto-install에 CrossTrade 추가:**

기존 `deployment.go` (line 209-248)의 로컬 auto-install 블록에 CrossTrade를 추가한다:

```go
// 변경 전 (deployment.go:215-221):
localIntegrationURLs := map[string]string{
    enum.IntegrationTypeBlockExplorer.String(): chainInformation.BlockExplorer,
    enum.IntegrationTypeMonitoring.String():    chainInformation.MonitoringUrl,
    enum.IntegrationTypeUptimeService.String(): "http://localhost:3003",
    enum.IntegrationTypeDRB.String():           "http://localhost:9600",
}

// 변경 후: CrossTrade 추가
localIntegrationURLs := map[string]string{
    enum.IntegrationTypeBlockExplorer.String(): chainInformation.BlockExplorer,
    enum.IntegrationTypeMonitoring.String():    chainInformation.MonitoringUrl,
    enum.IntegrationTypeUptimeService.String(): "http://localhost:3003",
    enum.IntegrationTypeDRB.String():           "http://localhost:9600",
    enum.IntegrationTypeCrossTrade.String():    "http://localhost:3001", // CrossTrade dApp
}
```

**그러나**, CrossTrade는 다른 로컬 모듈과 달리 **추가 컨트랙트 배포가 필요**하다. 단순히 URL만 등록하는 것이 아니라 다음 시퀀스가 필요:

```go
// deployment.go의 auto-install 블록 내 CrossTrade 전용 처리:
if enabled, ok := def.Modules["crossTrade"]; ok && enabled && stackConfig.InfraProvider == "local" {
    crossTradeIntegration, err := s.integrationRepo.GetIntegration(stackId.String(), enum.IntegrationTypeCrossTrade.String())
    if err != nil || crossTradeIntegration == nil {
        logger.Error("cross-trade integration not found for local auto-install")
    } else {
        // 1. SDK를 통해 L1 Deposit Tx로 L2 컨트랙트 배포
        deployOutput, err := thanos.DeployCrossTradeLocal(ctx, sdkClient, &DeployCrossTradeLocalInput{
            L1RPCUrl:            stackConfig.L1RpcUrl,
            L1ChainID:           uint64(chainInformation.L1ChainID),
            DeployerPrivateKey:  stackConfig.AdminAccount,
            L2RPCUrl:            chainInformation.L2RpcUrl,
            L2ChainID:           uint64(chainInformation.L2ChainID),
            OptimismPortalProxy: contracts.OptimismPortalProxy,
            CrossDomainMessenger: constants.L2CrossDomainMessenger,
            L1CrossTradeProxy:   constants.SepoliaL1CrossTradeProxy,
            L2toL2CrossTradeL1:  constants.SepoliaL2toL2CrossTradeL1,
            SupportedTokens:     constants.DefaultSupportedTokens,
        })
        if err != nil {
            // 실패 시 integration 상태 업데이트
            _ = s.integrationRepo.UpdateIntegrationStatusWithReason(
                crossTradeIntegration.ID.String(),
                entities.DeploymentStatusFailed,
                err.Error(),
            )
        } else {
            // 2. L1 setChainInfo 호출
            // 3. dApp 환경 변수 생성 + 컨테이너 시작
            // 4. integration metadata 업데이트
            metaBytes, _ := json.Marshal(map[string]interface{}{
                "url":       "http://localhost:3001",
                "contracts": deployOutput,
            })
            _ = s.integrationRepo.UpdateMetadataAfterInstalled(
                crossTradeIntegration.ID.String(),
                entities.IntegrationInfo(metaBytes),
            )
            stack.Metadata.CrossTradeUrl = "http://localhost:3001"
            _ = s.stackRepo.UpdateMetadata(stackId.String(), stack.Metadata)
        }
    }
}
```

**4c. `PresetDeployRequest` DTO 확장:**

```go
// 파일: trh-backend/pkg/api/dtos/thanos.go
// PresetDeployRequest에 CrossTrade 관련 필드 추가

type PresetDeployRequest struct {
    PresetID        string                   `json:"presetId" binding:"required"`
    ChainName       string                   `json:"chainName" binding:"required"`
    Network         entities.DeploymentNetwork `json:"network" binding:"required"`
    SeedPhrase      string                   `json:"seedPhrase" binding:"required"`
    InfraProvider   string                   `json:"infraProvider" binding:"required"`
    // ... 기존 필드 ...

    // CrossTrade 관련 (DeFi/Full Preset에서 자동 설정, Optional)
    CrossTrade *CrossTradePresetConfig `json:"crossTrade,omitempty"`
}

// CrossTradePresetConfig는 Preset 배포 시 CrossTrade 설정이다.
// DeFi/Full Preset에서 기본값이 자동 적용되며, 사용자가 선택적으로 오버라이드 가능하다.
type CrossTradePresetConfig struct {
    L1CrossTradeProxy    string      `json:"l1CrossTradeProxy"`    // 기존 L1 CT 주소 (Sepolia 기본값)
    L2toL2CrossTradeL1   string      `json:"l2toL2CrossTradeL1"`   // 기존 L2toL2 L1 CT 주소
    L1OwnerKey           string      `json:"l1OwnerKey"`           // setChainInfo 실행용 (Electron에서 전달)
    DeployerKey          string      `json:"deployerKey"`          // L1 Deposit Tx용 (Electron에서 전달)
    SupportedTokens      []TokenPair `json:"supportedTokens"`      // 사전 등록 토큰 쌍
}

// TokenPair는 SDK의 동일 이름 struct와 일치한다.
type TokenPair struct {
    L1Token string `json:"l1Token"`
    L2Token string `json:"l2Token"`
    Symbol  string `json:"symbol"`
}
```

**4d. `DeploymentStatus` 응답 확장:**

```go
// 파일: trh-backend/pkg/domain/entities/stack.go
// StackMetadata에 이미 CrossTradeUrl 필드가 존재하므로 추가 확장 불필요:
type StackMetadata struct {
    // ... 기존 필드 ...
    CrossTradeUrl string `json:"crossTradeUrl,omitempty"` // 이미 존재
}

// CrossTrade 상세 상태는 IntegrationEntity의 Info 필드에 JSON으로 저장:
// integration.Info = {"url": "http://localhost:3001", "contracts": {...}}
```

#### Feature 5: Platform UI 변경

**5a. Preset 스키마 업데이트 (trh-platform-ui):**

```typescript
// 파일: src/features/rollup/schemas/preset.ts
// DeFi preset의 crossTrade를 true로 변경

// 변경 전 (MOCK_PRESETS의 "defi"):
modules: {
  crossTrade: false,
  // ...
}

// 변경 후:
modules: {
  crossTrade: true,
  // ...
}

// Gaming preset의 crossTrade를 false로 변경
// 변경 전 (MOCK_PRESETS의 "gaming"):
modules: {
  crossTrade: true,
  // ...
}

// 변경 후:
modules: {
  crossTrade: false,
  // ...
}
```

**참고:** Preset 정의는 Backend의 `presets.Definition`에서 서빙되므로, UI의 MOCK_PRESETS는 실제 API 응답과 동기화되어야 한다. Backend `presets/` 디렉토리의 정의도 동일하게 변경 필요.

**5b. CrossTrade 설정 UI 컴포넌트:**

DeFi/Full Preset의 `ConfigReview` 단계에 CrossTrade 정보 표시 (read-only):
- L1 CrossTrade 컨트랙트 주소 (Sepolia 기본값)
- 지원 토큰 목록 (ETH, USDC, USDT)
- dApp 접근 URL (배포 완료 후 표시)

**5c. Rollup Detail — Components 탭:**

기존 Integration 표시 패턴(`IntegrationStatus`, `IntegrationInfo`)을 따라 CrossTrade 상태 카드 추가:
- Status badge: Pending → InProgress → Completed
- URL 링크: `http://localhost:3001`
- 배포된 컨트랙트 주소 표시

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
     │            → CrossTrade 설정 섹션 (read-only 기본값 표시):
     │              - L1 CrossTrade 주소 (사전 입력)
     │              - 지원 토큰 목록 (ETH, USDC, USDT)
     │
     ▼
[3] Deploy → Platform UI에서 "Deploy" 클릭
     │       → Backend가 trh-sdk 호출:
     │         - Genesis config 생성 (CrossTrade 미포함 — post-deploy로 처리)
     │         - L2 체인 부팅 (Docker Compose)
     │
     ▼
[4] Post-Deploy → Backend 자동 실행 (deployment.go auto-install):
     │             - SDK.DeployCrossTradeLocal() 호출
     │               → L1 Deposit Tx로 CrossTrade L2 컨트랙트 배포 (12 tx)
     │               → 배포된 주소 수집 후 반환
     │             - L1 setChainInfo 트랜잭션 (L2→L1 CrossTrade)
     │             - L1 setChainInfo 트랜잭션 (L2→L2 CrossTrade)
     │             - config/.env.crosstrade 생성
     │             - CrossTrade dApp Docker 컨테이너 시작
     │
     ▼
[5] Complete → Rollup Detail > Components 탭:
               - ✅ Bridge: http://localhost:3001
               - ✅ Block Explorer: http://localhost:4001
               - ✅ CrossTrade: http://localhost:3001 [NEW]
               - ✅ Monitoring: http://localhost:3002
```

### 7.4 기술 상세

#### 7.4.1 지원 토큰 및 브릿지 라우팅

| 토큰 | L1 주소 (Sepolia) | 브릿지 경로 | 특수 처리 |
|------|-------------------|-------------|-----------|
| ETH | address(0) | StandardBridge / OptimismPortal | msg.value로 전송, gas: 51000 |
| USDC | TBD | L1UsdcBridge → MasterMinter.mint | 전용 USDC 브릿지 사용 |
| USDT | TBD | StandardBridge | Double approval 패턴 (approve 0 → approve amount) |

#### 7.4.2 보안 고려사항

| 위험 | 심각도 | 완화 조치 |
|------|--------|-----------|
| Provider Risk (L2 오퍼레이터 의존성) | CRITICAL | resendProvideCTMessage() 재전송 메커니즘 |
| L1 Owner 키 노출 | CRITICAL | Electron safeStorage로 암호화 저장 |
| Deployer 키 관리 | HIGH | L1 Deposit Tx 실행용, 배포 완료 후 불필요. 최소 잔액 유지 |
| setChainInfo 실패 | MEDIUM | 최대 3회 재시도, 실패 시 수동 가이드 |
| L1 Deposit Tx 실패 | MEDIUM | 개별 tx 확인 후 다음 단계, 부분 실패 시 재시도 |

#### 7.4.3 EC2 보안 그룹 변경

CrossTrade dApp 포트를 EC2 보안 그룹에 추가:

```
추가:
- CrossTrade dApp (3001) from 0.0.0.0/0
```

### 7.5 Assumptions

| 가정 | 검증 방법 | 위험도 |
|------|-----------|--------|
| L1 OptimismPortal.depositTransaction()으로 L2 컨트랙트 생성 가능 | Sepolia devnet PoC 검증 | 중간 |
| EOA caller의 L2 sender 주소가 동일 | OP Stack 사양 확인 | 낮음 |
| 12회 Deposit Tx가 5분 이내 처리 | Sepolia 실측 | 중간 |
| cross-trade-dApp의 next-runtime-env가 JSON 환경 변수 적응 | dApp의 contracts.ts 구조 확인 완료 | 낮음 |
| L1 CrossTrade owner 키를 Backend에 안전 전달 가능 | Electron safeStorage + IPC | 높음 |

---

## 8. Release

### 8.1 Phase 1: Foundation (약 4-6주)

**목표:** Sepolia 테스트넷에서 L1 Deposit Tx 기반 L2→L1 CrossTrade 전체 플로우 동작 검증

- trh-sdk에 `cross_trade_local.go` 추가 — `DeployCrossTradeLocal()` 함수 구현
- OptimismPortal ABI 바인딩 생성 (`abis/OptimismPortal.go`)
- trh-backend `stack_lifecycle.go`에서 `localUnsupported` crossTrade 제거
- trh-backend `deployment.go`에 CrossTrade 로컬 auto-install 로직 추가
- trh-sdk/trh-backend `PresetModules` 매핑을 DeFi/Full로 변경
- docker-compose에 CrossTrade dApp 서비스 추가
- Sepolia에서 ETH L2→L1 크로스트레이드 E2E 테스트

### 8.2 Phase 2: Full Token & L2→L2 Support (약 3-4주)

**목표:** USDC, USDT 토큰 지원 및 L2→L2 크로스트레이드 통합

- L2toL2CrossTrade 컨트랙트 L1 Deposit Tx 배포 추가
- USDC 전용 브릿지 연동
- USDT double approval 패턴 검증
- registerToken 자동 등록 (ETH, USDC, USDT)
- L2→L2 크로스트레이드 E2E 테스트

### 8.3 Phase 3: UX Polish & Security (약 2-3주)

**목표:** 사용자 경험 개선 및 보안 검증

- Platform UI CrossTrade 상태 카드 (Components 탭)
- ConfigReview 단계에 CrossTrade 정보 표시
- L1 Deposit Tx 진행률 표시 (12단계 중 N단계 완료)
- setChainInfo 실패 에러 복구 플로우
- 외부 보안 감사 피드백 반영

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
| L2CrossTrade.sol | 426줄 | requestRegisteredToken, claimCT, cancelCT | L1 Deposit Tx (impl) |
| L2CrossTradeProxy.sol | 33줄 | initialize, setChainInfo | L1 Deposit Tx (proxy) |
| L2toL2CrossTradeL2.sol | 529줄 | requestRegisteredToken, claimCT, cancelCT | L1 Deposit Tx (impl) |
| L2toL2CrossTradeProxy.sol | 33줄 | initialize, setChainInfo | L1 Deposit Tx (proxy) |

## Appendix B: 환경 변수 명세

### config/.env.crosstrade (자동 생성)

```bash
# CrossTrade Configuration (auto-generated by trh-backend)

# L2→L1 CrossTrade chain config (JSON blob)
CHAIN_CONFIG_L2_L1='{"chainId":11155111,"l1CrossTradeContract":"0xf3473E20F1d9EB4468C72454a27aA1C65B67AB35","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC_URL>","l2CrossTradeContract":"<DEPLOYED_L2_CT_PROXY>"}]}'

# L2→L2 CrossTrade chain config (JSON blob)
CHAIN_CONFIG_L2_L2='{"chainId":11155111,"l1CrossTradeContract":"0xDa2CbF69352cB46d9816dF934402b421d93b6BC2","l2Chains":[{"chainId":<L2_CHAIN_ID>,"rpcUrl":"<L2_RPC_URL>","l2CrossTradeContract":"<DEPLOYED_L2TOL2_CT_PROXY>"}]}'

# WalletConnect
WALLETCONNECT_PROJECT_ID=<project-id>
```

## Appendix C: 테스트 전략

### Unit Tests (Vitest — trh-platform)

- Preset → CrossTrade 설정 매핑 정합성 (DeFi/Full = enabled, General/Gaming = disabled)
- dApp 환경 변수 JSON 생성 정합성

### Unit Tests (Go test — trh-sdk)

- `DeployCrossTradeLocalInput` 검증 (빈 주소, 잘못된 chainID 등)
- L1 Deposit Tx 시퀀스의 nonce 관리 정확성 (mock ethclient)
- TokenPair 등록 데이터 정합성

### Unit Tests (Go test — trh-backend)

- `CrossTradePresetConfig` DTO 검증
- `localUnsupported` 맵에서 crossTrade 제거 확인
- `BuildDAppConfig()` JSON 생성 정확성
- setChainInfo 재시도 로직 (mock L1 client)

### Integration Tests

- preset-deploy API에 CrossTrade 파라미터 포함 시 올바른 SDK 호출 검증
- L1 Deposit Tx 배포 → 주소 수집 → setChainInfo 호출 전체 시퀀스
- docker-compose CrossTrade dApp 서비스 상태 관리

### E2E Tests (Playwright — trh-platform)

- DeFi Preset 선택 → CrossTrade 설정 UI 표시 검증
- 배포 완료 후 Components 탭에 CrossTrade 상태 표시 확인

## Appendix D: 기존 AWS 구현과의 공존

이 PRD는 기존 AWS CrossTrade 배포 코드를 **제거하지 않는다**. 두 방식이 공존한다:

| 배포 환경 | 호출 경로 | L2 컨트랙트 배포 방식 | dApp 배포 방식 |
|-----------|-----------|----------------------|---------------|
| AWS (K8s) | `InstallCrossTradeBridge()` → `DeployCrossTrade()` | Foundry 스크립트 (기존) | Helm chart (기존) |
| Local (Docker) | `DeployCrossTradeLocal()` → auto-install in `deployment.go` | L1 Deposit Tx (신규) | Docker Compose (신규) |

향후 AWS 배포도 L1 Deposit Tx 방식으로 전환할 수 있으나, 이는 본 PRD 범위 외이다.

---

*본 문서는 Draft 상태이며, 팀 리뷰를 통해 보완될 예정입니다.*
