# PRD 심층 리뷰: CrossTrade Integration for DeFi & Full Presets

**리뷰어:** Claude (시니어 PM & 테크니컬 아키텍트)
**리뷰 대상:** PRD-CrossTrade-TRH-Integration.md v1.0
**리뷰 일자:** 2026-04-06
**분석 범위:** PRD 본문, CrossTrade 컨트랙트 소스코드, cross-trade-dApp 소스코드, TRH Platform presets.json, docker-compose.yml, 외부 감사 문서

---

## 관점 1: 기술적 실현 가능성 (Feasibility)

### 강점

- PRD가 OP Stack genesis config의 predeploy 메커니즘을 활용하는 방향은 기술적으로 올바른 접근이다. OP Stack은 실제로 genesis.json의 `alloc` 필드를 통해 임의 주소에 바이트코드와 스토리지를 사전 배치할 수 있으며, 기존 시스템 컨트랙트(L2CrossDomainMessenger, L2StandardBridge 등)도 이 방식으로 배포된다.
- cross-trade-dApp의 `contracts.ts`가 이미 `next-runtime-env`를 사용하여 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L2`, `NEXT_PUBLIC_CHAIN_CONFIG_L2_L1` 환경 변수에서 체인별 설정을 JSON으로 로드하는 구조를 갖추고 있다. 하드코딩된 주소가 아닌 런타임 환경 변수 기반이므로, 새 L2 체인 설정 적응이 구조적으로 가능하다.
- L2CrossTradeProxy.sol의 `initialize()` 함수가 단순히 `crossDomainMessenger` 주소만 설정하므로, genesis state에서 해당 스토리지 슬롯을 직접 설정하는 것으로 동일한 효과를 달성할 수 있다.

### 우려사항

- 🔴 **Critical: Proxy 패턴의 Genesis State 설정 복잡도가 과소평가되었다.**
  실제 코드를 분석하면, L2CrossTradeProxy는 `Proxy → ProxyStorage → AccessibleCommon → AccessControl → AccessRoleCommon` 의 깊은 상속 체인을 가진다. Genesis state에서 설정해야 하는 스토리지 슬롯은 다음과 같다:
  1. `pauseProxy` (ProxyStorage, slot 0) → `false`
  2. `proxyImplementation[0]` (ProxyStorage, mapping) → 구현체 주소
  3. `aliveImplementation[impl]` (ProxyStorage, mapping) → `true`
  4. `selectorImplementation[selector]` (ProxyStorage, mapping) → 각 함수 셀렉터별 구현체 매핑
  5. OpenZeppelin `AccessControl`의 `_roles` mapping → `ADMIN_ROLE`에 대한 role admin과 member 설정
  6. `crossDomainMessenger` (L2CrossTradeStorage) → L2 CrossDomainMessenger 주소
  7. `chainData[l1ChainId]` (L2CrossTradeStorage, mapping) → L1CrossTrade 주소
  8. `registerCheck[chainId][l1Token][l2Token]` (L2CrossTradeStorage, 3중 mapping) → 토큰 등록

  특히 OpenZeppelin AccessControl의 `_roles` 매핑은 `keccak256(abi.encode(role, slot))` 형태의 복잡한 스토리지 레이아웃을 가지므로, 정확한 슬롯 계산이 필수적이다. **PRD에는 이 복잡도에 대한 인식이 전혀 없다.**

- 🔴 **Critical: Proxy.sol의 constructor가 genesis에서 실행되지 않는 문제.**
  `Proxy.sol`의 constructor에서 `_setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE)` 와 `_grantRole(ADMIN_ROLE, msg.sender)`를 실행한다. Genesis predeploy에서는 constructor가 실행되지 않으므로, ADMIN_ROLE의 role admin과 owner가 설정되지 않은 상태로 배포된다. 이 상태에서 `onlyOwner` modifier가 붙은 모든 함수(`initialize`, `setChainInfo`, `registerToken`, `upgradeTo`, `setSelectorImplementations2`)가 호출 불가능해진다. **이를 genesis state의 스토리지 슬롯으로 직접 설정하지 않으면 컨트랙트가 사실상 사용 불능 상태가 된다.**

- 🟡 **Major: `_setImplementation2`의 `_isContract` 체크.**
  Proxy.sol의 `_setImplementation2` 내부에서 `_isContract(newImplementation)`을 호출하여 구현체가 컨트랙트인지 확인한다. Genesis predeploy에서 프록시와 구현체가 동시에 배치되므로 이 체크는 문제가 없지만, Post-genesis에서 `upgradeTo`를 호출할 때는 새 구현체가 먼저 배포되어 있어야 한다. **업그레이드 절차에 대한 설명이 PRD에 없다.**

- 🟡 **Major: setChainInfo에 필요한 파라미터 확보 경로가 불완전하다.**
  L1CrossTradeProxy.setChainInfo의 시그니처는 `setChainInfo(l2ChainId, crossDomainMessenger, l2CrossTradeAddress, nativeToken)`이지만, L2toL2CrossTradeProxyL1.setChainInfo는 추가로 `bridge`, `usdcBridge` 주소를 필요로 한다. PRD에서 "bridge, usdcBridge 주소는 L2 배포 시 결정되는 값이므로 SDK로부터 전달받아야 함"이라고 언급하지만, **SDK→Backend로 이 값들이 전달되는 구체적인 메커니즘(API 응답 필드, 콜백, 이벤트)이 정의되지 않았다.**

- 🟡 **Major: cross-trade-dApp의 Reown AppKit(WalletConnect) 프로젝트 ID 관리.**
  `.env.example`을 보면 WalletConnect 프로젝트 ID가 필요하며, 이는 Reown 대시보드에서 발급받아야 한다. PRD의 env.crosstrade 명세에 `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`가 포함되어 있지만, **이 ID를 누가 발급하고 관리하는지(L2 운영자? TRH Platform 공용?)에 대한 정의가 없다.** 공용 프로젝트 ID 사용 시 rate limit 문제가 발생할 수 있다.

- 🟢 **Minor: L2CrossTradeStorage의 `NATIVE_TOKEN` 초기화.**
  `address public NATIVE_TOKEN = address(0);` 으로 선언되어 있는데, genesis에서 constructor가 실행되지 않아도 address(0)은 스토리지의 기본값이므로 별도 설정이 불필요하다. 다만 이 가정이 코드 검토를 통해 명시적으로 확인되어야 한다.

### 구체적 개선 제안

1. **Genesis Storage Layout Specification 문서 작성**: ProxyStorage + AccessControl + L2CrossTradeStorage의 전체 스토리지 레이아웃을 매핑하고, genesis alloc에 설정해야 하는 정확한 슬롯-값 쌍을 문서화한다. Foundry의 `forge inspect L2CrossTradeProxy storageLayout`을 활용하여 자동화할 수 있다.

2. **PoC(Proof of Concept) 구현을 Phase 1 시작 전에 수행**: 최소한 L2CrossTradeProxy를 genesis predeploy로 배치하고 owner가 정상적으로 `registerToken`을 호출할 수 있는지 검증하는 PoC를 Phase 1 스프린트 0(1주)로 설정한다.

3. **SDK-Backend 인터페이스 명세 추가**: trh-sdk가 L2 배포 완료 후 반환하는 데이터 구조에 `crossDomainMessenger`, `standardBridge`, `usdcBridge`, `nativeToken` 주소를 포함하도록 SDK 응답 스키마를 PRD에 명시한다.

4. **WalletConnect 프로젝트 ID 관리 정책 결정**: (a) TRH Platform 공용 프로젝트 ID를 기본 제공하되 L2 운영자가 자체 ID로 오버라이드 가능하게 하거나, (b) L2 운영자가 반드시 자체 ID를 발급하도록 Setup 플로우에 포함시킨다.

---

## 관점 2: 아키텍처 정합성 (Architecture Consistency)

### 강점

- PRD의 시스템 아키텍처 다이어그램(Section 7.1)이 4-repo 파이프라인(Electron → Platform UI → Backend → SDK)을 정확하게 반영하고 있으며, CrossTrade가 각 레이어에 미치는 영향을 명확하게 식별했다.
- CrossTrade dApp을 기존 docker-compose.yml에 서비스로 추가하는 접근은 TRH Platform의 컨테이너 오케스트레이션 패턴과 일관적이다.
- Preset Deploy API 확장(Section 7.2, Feature 4)의 TypeScript 인터페이스 정의가 구체적이며, 기존 API 패턴을 잘 따르고 있다.

### 우려사항

- 🔴 **Critical: Preset fixture(presets.json)와 PRD의 Preset 매핑이 불일치한다.**
  현재 `tests/fixtures/presets.json`을 분석한 결과:
  - **Gaming**: `"crossTrade": true` (PRD에서는 ❌로 정의)
  - **DeFi**: `"crossTrade": false` (PRD에서는 ✅로 정의)

  PRD Section 7.2의 Preset 매핑 테이블과 실제 fixture가 정반대이다. Gaming Preset에 CrossTrade가 활성화되어 있고 DeFi Preset에는 비활성화되어 있다. **이 불일치가 해소되지 않으면, 테스트 fixture와 실제 배포 로직이 상충하게 된다.**

- 🔴 **Critical: genesisPredeploys 목록에 CrossTrade 컨트랙트가 누락되어 있다.**
  현재 `presets.json`의 DeFi/Full Preset의 `genesisPredeploys` 배열에 CrossTrade 관련 컨트랙트(`L2CrossTradeProxy`, `L2CrossTrade`, `L2toL2CrossTradeProxy`, `L2toL2CrossTradeL2`)가 포함되어 있지 않다. PRD에서 "trh-sdk가 genesis config에 CrossTrade L2 컨트랙트 predeploy 추가"라고 하지만, **fixture 스키마에 이를 어떻게 반영할지 구체적 계획이 없다.**

- 🟡 **Major: L2CrossTradeStorage.sol과 L2toL2CrossTradeStorage.sol은 별도 predeploy가 아닌 Proxy의 스토리지에 포함된다는 점이 PRD에서 오해의 소지가 있다.**
  PRD의 predeploy 목록(Section 7.2, Feature 1)에 `L2CrossTradeStorage.sol`이 별도 항목으로 포함되어 있다. 그러나 실제 코드에서 `L2CrossTradeProxy is Proxy, L2CrossTradeStorage`로 상속하므로, Storage 컨트랙트는 Proxy의 스토리지 레이아웃에 포함되며 별도 주소에 배포할 필요가 없다. **6개 predeploy가 아닌 4개(Proxy 2개 + Implementation 2개)만 필요하다.**

- 🟡 **Major: CrossTrade dApp의 환경 변수 구조가 PRD 정의와 실제 코드 간에 불일치한다.**
  PRD의 docker-compose 설정에서는 `NEXT_PUBLIC_L1_CHAIN_ID`, `NEXT_PUBLIC_L2_CHAIN_IDS` 등 개별 환경 변수를 사용하지만, 실제 `contracts.ts`는 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L2`와 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L1`이라는 JSON blob 형태의 환경 변수를 파싱한다. **PRD의 환경 변수 명세를 실제 dApp 코드에 맞게 수정해야 한다.**

- 🟡 **Major: EOA.sol, ReentrancyGuard, SafeERC20 등 라이브러리/유틸리티 컨트랙트의 배치 전략이 누락되었다.**
  L2CrossTrade.sol은 `SafeERC20`, `ReentrancyGuard`, `EOA`, `AccessibleCommon`을 import한다. 이 중 라이브러리(`SafeERC20`, `EOA`)는 컨트랙트 바이트코드에 인라인되므로 별도 배포가 불필요하지만, **이 판단이 PRD에 명시적으로 기술되어 있지 않아 구현 시 혼란을 야기할 수 있다.**

- 🟢 **Minor: USDC 전용 브릿지(L1UsdcBridge/L2UsdcBridge)에 대한 언급이 있으나 구체적인 predeploy 계획이 없다.**
  DeFi Preset의 genesisPredeploys에 `USDCBridge`가 이미 포함되어 있으므로, CrossTrade의 USDC 브릿지 의존성은 기존 Preset 인프라로 충족될 수 있다. 다만 이 연결 관계가 PRD에서 명시적으로 설명되지 않았다.

### 구체적 개선 제안

1. **presets.json fixture 즉시 수정**: Gaming의 `crossTrade`를 `false`로, DeFi의 `crossTrade`를 `true`로 변경하거나, PRD의 Preset 매핑 테이블을 현행 fixture에 맞게 수정한다. 이 결정을 PRD에 명확히 기록한다.

2. **genesisPredeploys 스키마 확장**: `genesisPredeploys` 배열에 CrossTrade 항목을 추가하되, 단순 문자열이 아닌 `{ name, address, bytecodeSource, storageOverrides }` 형태의 객체 스키마로 확장하여 스토리지 초기화 정보를 포함할 수 있도록 한다.

3. **Predeploy 목록 정정**: Storage 컨트랙트를 별도 predeploy 목록에서 제거하고, 실제 필요한 4개 predeploy(L2CrossTradeProxy, L2CrossTrade, L2toL2CrossTradeProxy, L2toL2CrossTradeL2)만 명시한다.

4. **dApp 환경 변수 명세를 실제 코드 기반으로 재작성**: `NEXT_PUBLIC_CHAIN_CONFIG_L2_L1`과 `NEXT_PUBLIC_CHAIN_CONFIG_L2_L2`의 JSON 스키마를 PRD에 포함하고, trh-backend가 이 JSON을 자동 생성하는 로직을 명세한다.

---

## 관점 3: 보안 분석 (Security)

### 강점

- PRD Section 7.4.3의 보안 고려사항 테이블이 주요 위험(Provider Risk, 프론트러닝, Cross-Domain 메시지 위조, EIP-7702)을 포괄적으로 식별했다.
- EOA.sol 라이브러리가 EIP-7702 delegated EOA를 코드 길이(23바이트) + prefix(0xEF0100) 패턴으로 검증하는 구현이 포함되어 있어, 현재 알려진 7702 우회 벡터에 대응하고 있다.
- `checkL1` modifier가 messenger 주소 + `xDomainMessageSender()` 이중 검증을 수행하여 Cross-Domain 메시지 위조를 방지한다.
- `completedCT` / `providerCheck` modifier로 이중 provide를 차단하는 first-come-first-served 패턴이 구현되어 있다.

### 우려사항

- 🔴 **Critical: `l1OwnerKey`가 HTTP POST 요청 본문에 평문으로 포함된다.**
  PRD의 `PresetDeployRequest` 인터페이스에서 `l1OwnerKey: string`이 CrossTrade 설정의 일부로 정의되어 있다. 이 키는 Electron → Platform UI(window.__TRH_*) → HTTP POST `/preset-deploy` → Backend로 전달된다. **L1 CrossTrade 컨트랙트의 owner private key가 HTTP 요청 본문에 평문으로 노출되는 것은 심각한 보안 위험이다.** 로컬 네트워크라 하더라도, 로그 기록, 메모리 덤프, 디버그 도구 등으로 키가 유출될 수 있다.

- 🔴 **Critical: Genesis predeploy 컨트랙트의 초기 owner 설정 보안.**
  Genesis state에서 AccessControl의 ADMIN_ROLE을 특정 주소에 부여해야 하는데, 이 owner 주소가 누구인지 PRD에서 명확히 정의되지 않았다. **L2 운영자의 주소인지, TRH Platform의 관리 주소인지, 별도 MultiSig인지에 따라 보안 모델이 완전히 달라진다.** 만약 L2 오퍼레이터(시퀀서)가 genesis를 조작하여 자신을 owner로 설정하면, registerToken을 변조하거나 프록시를 악의적으로 업그레이드할 수 있다.

- 🟡 **Major: 외부 감사(CrossTrade_External_Audit_Details.md)에서 식별된 "Upgrade Security" 위험에 대한 PRD 대응이 부재하다.**
  감사 문서의 Critical Risk Area #4에서 "Multi-sig ownership, timelock delays recommended"라고 권고했으나, PRD에는 이에 대한 대응 계획이 없다. Genesis predeploy된 프록시의 owner가 단일 EOA라면, 해당 키 탈취 시 전체 시스템이 위험에 처한다.

- 🟡 **Major: setChainInfo 자동 호출 실패 시의 보안 위험이 불충분하게 다뤄졌다.**
  L1에 미등록 상태의 L2가 존재하면, 해당 L2의 사용자가 `requestRegisteredToken`을 호출할 수는 있지만(`chainData[_l1chainId]`가 0이면 revert), `requestNonRegisteredToken`은 `chainData[_l1chainId] != address(0)` 체크로 인해 역시 실패한다. 따라서 미등록 상태에서는 CrossTrade 자체가 작동하지 않아 자금 손실 위험은 낮다. 그러나 **사용자에게 "CrossTrade 활성화됨" 표시를 하면서 실제로는 작동하지 않는 상태가 되므로, 혼란을 야기할 수 있다.**

- 🟡 **Major: CrossTrade dApp(포트 3001) 웹 보안.**
  PRD에서 EC2 배포 시 포트 3001을 0.0.0.0/0으로 개방하는데, dApp 자체에 대한 CORS 정책, CSP(Content Security Policy), HTTPS 적용 여부에 대한 언급이 없다. Next.js 기본 설정은 개발 모드에서 모든 origin을 허용하므로, **프로덕션 배포 시 XSS/CSRF 공격에 취약할 수 있다.**

- 🟢 **Minor: `claimCT`에서 `payable(_from).call{value: totalAmount, gas: 51000}`의 하드코딩된 gas limit.**
  51000 gas는 현재 ETH 전송에 충분하지만, 향후 EVM 변경으로 부족해질 가능성이 있다. 이는 CrossTrade 컨트랙트 자체의 문제이지만, genesis predeploy로 배포되면 이 값을 변경하려면 구현체 업그레이드가 필요하다.

### 구체적 개선 제안

1. **L1 Owner 키 전달 메커니즘 재설계**: HTTP 본문에 키를 포함하지 말고, (a) Electron에서 직접 ethers.js로 setChainInfo 트랜잭션에 서명하여 signed transaction을 Backend에 전달하거나, (b) Backend가 L1 owner 키를 자체 Keystore(환경 변수 또는 암호화된 파일)에서 로드하는 방식으로 변경한다.

2. **Genesis predeploy의 owner를 MultiSig으로 설정**: 최소한 2-of-3 MultiSig(예: Gnosis Safe)을 owner로 설정하고, 단일 EOA가 아닌 멀티시그를 통해 registerToken, upgradeTo 등의 관리 함수를 실행하도록 한다. Phase 1에서는 개발 편의상 EOA를 사용하되, Phase 3에서 반드시 MultiSig으로 전환한다.

3. **배포 상태 페이지에 L1 등록 상태와 CrossTrade 실제 사용 가능 여부를 분리 표시**: "L2 Contracts: Deployed" vs "L1 Registration: Pending/Failed" vs "CrossTrade: Ready/Not Ready"를 구분하여, 사용자가 실제 사용 가능 상태를 정확히 인지하도록 한다.

4. **CrossTrade dApp에 HTTPS 및 보안 헤더 적용 계획 추가**: EC2 배포 시 Nginx 리버스 프록시를 통해 SSL 종단, CSP 헤더, X-Frame-Options 등을 적용하는 방안을 Phase 3에 포함한다.

---

## 관점 4: 사용자 경험 및 에러 처리 (UX & Error Handling)

### 강점

- Section 7.3의 사용자 플로우 다이어그램(Flow 1, Flow 2)이 L2 운영자와 최종 사용자 각각의 관점에서 단계별 흐름을 명확하게 정의했다.
- 배포 상태 페이지에 CrossTrade 관련 상태(L2 contracts, L1 registration, dApp)를 세분화하여 표시하려는 계획이 포함되어 있다.
- setChainInfo 재시도(최대 3회) + 실패 시 알림이라는 에러 처리 골격이 정의되어 있다.

### 우려사항

- 🟡 **Major: CrossTrade 비활성화 옵션이 없다.**
  DeFi/Full Preset을 선택하면 CrossTrade가 자동 활성화되는데, L2 운영자가 CrossTrade를 원하지 않는 경우(예: 자체 브릿지 솔루션 사용, 규제 이슈)의 비활성화 옵션이 없다. Config Page에서 CrossTrade 설정 섹션이 표시되지만 on/off 토글이 명시되지 않았다.

- 🟡 **Major: "수동 등록 가이드"의 구체적 내용이 정의되지 않았다.**
  setChainInfo 3회 재시도 실패 후 제공되는 "수동 등록 가이드"가 Electron 앱 알림으로 제공된다고 하지만, 가이드의 실체가 없다. L2 운영자가 직접 L1 컨트랙트의 setChainInfo를 실행하려면 (a) L1 owner 키, (b) L2 배포 결과에서 필요한 주소들, (c) 정확한 함수 호출 방법(cast send 또는 etherscan)을 알아야 한다.

- 🟡 **Major: "부분 실패" 상태의 복구 경로가 불명확하다.**
  L2 배포 성공 + setChainInfo 실패 + dApp 시작 실패 등의 조합으로 다양한 부분 실패 상태가 가능하다. 각 상태에서의 복구 방법(재시도, 롤백, 수동 개입)이 체계적으로 정의되지 않았다. 특히 genesis predeploy는 L2를 다시 배포하지 않는 한 롤백이 불가능하다는 점이 중요하다.

- 🟡 **Major: Provider 온보딩 정보 접근 경로가 부재하다.**
  외부 Provider가 새 L2의 CrossTrade에 참여하려면 L2 chainId, 컨트랙트 주소, RPC URL을 알아야 한다. PRD에서 이 정보를 공개하는 채널(API 엔드포인트, 문서 페이지, dApp 내 정보 패널)이 정의되지 않았다.

- 🟢 **Minor: L1 Owner 키 설정이 Setup 플로우에 포함되는 것이 부자연스럽다.**
  L2를 배포하려는 운영자가 반드시 L1 CrossTrade의 owner 키를 보유하고 있어야 한다는 전제가 있지만, **공유 L1 컨트랙트의 owner는 Tokamak Network 팀일 가능성이 높다.** 따라서 L2 운영자가 직접 setChainInfo를 실행할 수 없고, Tokamak 팀에게 등록을 요청해야 하는 시나리오가 더 현실적일 수 있다.

- 🟢 **Minor: EC2 배포 시 포트 3001 충돌 처리.**
  포트 충돌은 docker-compose의 `ports` 매핑에서 호스트 포트를 변경하면 해결 가능하지만, 자동 감지 및 대체 포트 할당 로직이 필요하다.

### 구체적 개선 제안

1. **CrossTrade 활성화/비활성화 토글 추가**: Config Page의 CrossTrade 설정 섹션에 "Enable CrossTrade" 토글을 추가하고, DeFi/Full Preset에서 기본값은 `true`이되 운영자가 `false`로 변경 가능하도록 한다.

2. **수동 등록 가이드 문서 작성**: setChainInfo를 직접 실행하기 위한 step-by-step 가이드를 작성한다. `cast send` 명령어 예시, 필요한 주소 목록 확인 위치, L1 네트워크 선택 등을 포함한다. 이 가이드를 Electron 앱 알림에서 링크로 제공한다.

3. **부분 실패 상태 매트릭스 작성**: 가능한 실패 조합별로 (a) 사용자에게 표시할 상태, (b) 자동 복구 가능 여부, (c) 수동 개입 방법을 정의한 매트릭스를 PRD에 추가한다.

4. **Provider 정보 공개 API 엔드포인트 추가**: `/api/v1/crosstrade/chain-info`와 같은 공개 API를 통해 지원 체인 목록, 컨트랙트 주소, RPC URL을 제공하고, dApp에도 "Provider Information" 패널을 추가한다.

---

## 관점 5: 스코프 및 릴리스 계획 (Scope & Release)

### 강점

- Phase 구분(Foundation → Full Token → UX Polish → Mainnet)이 점진적 가치 전달 관점에서 합리적이다.
- Phase 1에서 L2→L1 ETH만 지원하여 복잡도를 최소화하고, Phase 2에서 전체 토큰과 L2→L2를 추가하는 전략이 기술적 위험을 단계적으로 관리한다.
- 각 Phase의 산출물이 명확하게 정의되어 있다.

### 우려사항

- 🔴 **Critical: Phase 1의 "약 4-6주" 추정이 비현실적이다.**
  Phase 1 범위에 포함된 작업을 분해하면:
  1. trh-sdk genesis predeploy 기능 신규 개발 (스토리지 슬롯 계산, 바이트코드 주입 로직) — 최소 2-3주
  2. trh-backend setChainInfo 자동 호출 로직 — 1-2주
  3. docker-compose CrossTrade dApp 서비스 추가 + Docker 이미지 빌드 — 1주
  4. DeFi/Full Preset fixture 수정 + 스키마 확장 — 0.5-1주
  5. Sepolia E2E 테스트 — 1-2주
  6. 위 항목들의 통합 테스트 및 디버깅 — 1-2주

  합산하면 최소 6.5-11주이며, SDK 신규 개발 난이도(특히 AccessControl 스토리지 슬롯 계산)를 고려하면 **8-10주가 더 현실적이다.** 특히 SDK 엔지니어가 TBD인 상태에서 이 추정은 매우 낙관적이다.

- 🔴 **Critical: 여러 핵심 작업이 PRD에서 누락되었다.**
  1. **CrossTrade 바이트코드 확보 방법**: trh-sdk에서 컴파일된 바이트코드를 어떻게 확보하는지(npm 패키지? git submodule? 하드코딩?) 정의 없음
  2. **CrossTrade dApp Docker 이미지 빌드 파이프라인**: 현재 `.github/workflows/cross-trade-app.yml`이 있지만, TRH Platform용 이미지 빌드/게시 CI/CD 파이프라인이 별도 필요
  3. **registerToken 실행 주체와 시점**: Phase 1에서 ETH만 지원하더라도 `registerToken(address(0), address(0), l1ChainId)` 호출이 필요하며, 이것이 genesis state에서 직접 설정되는지 아니면 post-deploy에서 실행되는지 불명확
  4. **Makefile 변경**: `make setup`이 CrossTrade dApp도 시작하도록 수정 필요
  5. **config/env.crosstrade.template 파일 추가**: 기존 config 디렉토리 패턴 따라야 함
  6. **EC2 Terraform main.tf의 보안 그룹 규칙 추가**: 포트 3001 인바운드 규칙
  7. **install.sh 업데이트**: CrossTrade dApp 관련 설정

- 🟡 **Major: Phase 1에서 L2toL2CrossTrade 컨트랙트의 genesis 포함 여부가 불명확하다.**
  PRD의 Preset 매핑 테이블에서 DeFi/Full은 L2→L2도 ✅이지만, Phase 1에서는 L2→L1만 지원한다고 한다. L2toL2 컨트랙트를 Phase 1에서 genesis에 포함하되 비활성 상태로 두는지, Phase 2에서 genesis를 변경하는지(불가능), Phase 2부터 새 L2 배포에만 포함하는지 결정이 필요하다.

- 🟡 **Major: 외부 보안 감사 완료 시점이 블로커인지 불명확하다.**
  CrossTrade_External_Audit_Details.md에서 `Review completion deadline: [TO BE DETERMINED]`으로 감사 일정이 미확정이다. Phase 1이 감사 완료 전에 시작되면 감사 결과에 따라 컨트랙트 수정이 필요할 수 있고, genesis predeploy는 수정이 불가능(구현체 교체만 가능)하므로 위험이 크다.

- 🟢 **Minor: trh-sdk 팀의 가용성이 Phase 1 일정에 반영되지 않았다.**
  Contacts 테이블에서 SDK Engineer가 TBD이므로, 인력 확보 시점이 일정 시작의 실질적 블로커이다.

### 구체적 개선 제안

1. **Phase 0 (Sprint 0) 추가**: 1-2주의 "Technical Spike" Phase를 추가하여 (a) genesis predeploy PoC, (b) AccessControl 스토리지 슬롯 계산 검증, (c) SDK 확장 인터페이스 설계를 선행한다. 이 결과를 바탕으로 Phase 1 일정을 재추정한다.

2. **누락된 작업 항목을 PRD에 추가**: 위에 열거한 7개 누락 항목을 PRD의 Phase 1 범위에 명시적으로 추가한다.

3. **L2toL2 컨트랙트는 Phase 1부터 genesis에 포함**: Genesis 변경이 불가능하므로, Phase 1에서 L2toL2 컨트랙트도 predeploy에 포함하되 L1 setChainInfo를 L2toL2에 대해서는 실행하지 않는 방식으로 "배포되었지만 비활성" 상태를 달성한다.

4. **외부 감사를 Phase 1 시작의 게이트로 설정하지 않되, Phase 3 완료의 게이트로 설정**: 감사 결과에 따른 구현체 수정은 프록시 패턴 덕분에 가능하므로, Phase 1-2를 진행하면서 병렬로 감사를 수행하고, Phase 3에서 감사 피드백을 반영한다.

---

## 관점 6: 전략적 판단 (Strategic Assessment)

### 강점

- Genesis predeploy의 핵심 장점인 "확정적 주소"와 "배포 원자성"이 CrossTrade의 사용 사례에 잘 부합한다. L2 부팅 시점에 CrossTrade가 이미 활성화되어 있으면 사용자 경험이 극대화된다.
- 기존 L1 CrossTrade 컨트랙트 재사용은 네트워크 효과를 즉시 활용할 수 있는 전략적으로 올바른 선택이다. 새 L2마다 별도 L1 컨트랙트를 배포하면 Provider 생태계가 파편화된다.
- Request-Provide 모델의 오픈 마켓 구조가 장기적 확장성에 유리하다.

### 우려사항

- 🟡 **Major: Genesis predeploy가 Proxy 자체의 버그 수정에 제약을 만든다.**
  Proxy 패턴 덕분에 구현체(L2CrossTrade.sol, L2toL2CrossTradeL2.sol) 교체는 가능하지만, Proxy.sol 자체(fallback, delegatecall 로직, selector 매핑 로직)에 버그가 발견되면 수정이 불가능하다. PRD에서 이 위험을 인지하고 있다고 언급했지만, **구체적인 완화 조치(예: escape hatch 함수, migration 계획)가 없다.**

- 🟡 **Major: 공유 L1 컨트랙트의 owner 변경/업그레이드 시 모든 TRH L2에 영향.**
  L1 CrossTrade 컨트랙트가 업그레이드되거나 owner가 변경되면, TRH Platform으로 배포된 모든 L2의 CrossTrade 기능에 영향이 미친다. 현재 구조에서는 이 의존성이 단일 장애점(SPOF)이 될 수 있다.

- 🟡 **Major: Sepolia에서 외부 Provider 부트스트래핑 전략이 없다.**
  PRD의 Assumptions에서 "초기에는 내부 테스트용 Provider 운영 필요"라고 인정했지만, **내부 Provider 봇의 구현 및 운영이 Phase 스코프에 포함되지 않았다.** Provider가 없는 CrossTrade는 요청만 가능하고 실제 교환이 이루어지지 않으므로, 사용자 경험이 매우 나쁘다("요청했지만 아무도 응답하지 않는" 상태).

- 🟢 **Minor: L2별 독립 L1 컨트랙트 전환 가능성.**
  현재 공유 모델이 합리적이지만, 장기적으로 특정 L2가 독자적인 CrossTrade 정책(수수료 구조, 지원 토큰 등)을 원할 경우를 대비한 아키텍처 확장 포인트가 필요하다. L2CrossTradeProxy의 `chainData` 매핑이 chainId별 L1 컨트랙트 주소를 저장하므로, 이론적으로 다른 L1 컨트랙트를 가리키도록 변경 가능하지만 이 시나리오에 대한 계획이 없다.

### 구체적 개선 제안

1. **Proxy Migration 계획 수립**: Proxy 자체에 치명적 버그가 발견될 경우의 비상 계획을 수립한다. 예: (a) 새 Proxy를 post-deploy로 배포, (b) 기존 Proxy의 pause 기능 활성화, (c) 사용자 자금을 새 Proxy로 이전하는 migration 스크립트.

2. **L1 컨트랙트 의존성 모니터링 시스템 추가**: L1 CrossTrade 컨트랙트의 owner 변경, 업그레이드, pause 이벤트를 모니터링하여 TRH Platform 운영자에게 알림을 보내는 시스템을 Phase 3에 포함한다.

3. **내부 Provider 봇을 Phase 1 스코프에 추가**: Sepolia에서 최소한의 Provider 봇(RequestCT 이벤트 모니터링 → 자동 provideCT 실행)을 구현하여 E2E 테스트뿐 아니라 초기 사용자 경험을 보장한다. 간단한 Node.js 스크립트 수준이면 충분하다.

4. **Provider 부재 시 UX 정의**: dApp에서 Provider가 활동하지 않는 경우 "현재 활동 중인 Provider가 없습니다. 요청이 처리되지 않을 수 있습니다."와 같은 안내 메시지를 표시하고, 예상 대기 시간 또는 대안(기본 브릿지 사용)을 안내하는 UI를 설계한다.

---

## 종합 평가

### 1. PRD 완성도 점수: 6.5 / 10

| 평가 기준 | 점수 | 근거 |
|-----------|------|------|
| 명확성 (Clarity) | 7/10 | 시스템 아키텍처, 사용자 플로우가 명확하나 기술 상세의 정확성 이슈(환경 변수 불일치, predeploy 목록 오류)가 존재 |
| 기술 깊이 (Technical Depth) | 6/10 | CrossTrade 프로토콜 이해도는 높으나, genesis predeploy의 핵심 난제(스토리지 레이아웃, AccessControl 초기화)에 대한 깊이가 부족 |
| 실행 가능성 (Actionability) | 6/10 | Phase 구분과 산출물은 정의되었으나, 누락된 작업 항목이 많고 일정 추정이 낙관적이며 핵심 인력이 미확정 |
| 보안 설계 (Security Design) | 7/10 | 주요 위험을 식별했으나, 새로운 공격 표면(키 전달, genesis 조작)에 대한 대응이 미흡 |
| 완전성 (Completeness) | 6/10 | E2E 통합 범위를 커버하려는 시도는 좋으나, 운영 측면(CI/CD, 모니터링, Provider 봇)의 누락이 크다 |

### 2. Phase 1 시작 전 반드시 해결할 항목 (Top 3)

1. **Genesis Predeploy PoC 완료**: AccessControl 스토리지 슬롯 설정을 포함한 L2CrossTradeProxy genesis predeploy를 로컬 devnet에서 실증한다. `forge inspect`로 스토리지 레이아웃을 추출하고, genesis alloc에 정확한 슬롯-값 쌍을 설정하여 owner가 registerToken을 호출할 수 있는지 확인한다. 이 PoC 실패 시 전체 아키텍처를 Post-Deploy 방식으로 전환해야 하므로, **이것이 최우선 블로커다.**

2. **L1 Owner 키 전달 메커니즘 보안 재설계**: 현재 HTTP 평문 전달 방식을 폐기하고, (a) Electron에서 트랜잭션 서명 후 signed tx만 전달, 또는 (b) Backend 환경 변수에서 키 로드, 또는 (c) L2 운영자가 아닌 Tokamak 팀이 별도 프로세스로 setChainInfo를 실행하는 방식 중 결정한다.

3. **presets.json fixture와 PRD Preset 매핑 불일치 해소**: DeFi와 Gaming의 crossTrade 플래그 정합성을 맞추고, genesisPredeploys 배열에 CrossTrade 항목을 추가하는 스키마 확장을 완료한다.

### 3. 가장 큰 기술적 리스크 (Top 3)

| 순위 | 리스크 | 발생 확률 | 영향도 | 종합 (확률 × 영향) |
|------|--------|-----------|--------|-------------------|
| 1 | Genesis predeploy에서 AccessControl 스토리지 초기화가 올바르게 작동하지 않아 컨트랙트 관리 함수 호출 불가 | 중-상 (40%) | CRITICAL — 전체 접근 방식 재설계 필요 | **매우 높음** |
| 2 | trh-sdk 확장 범위가 예상보다 크고, SDK 팀 가용성이 부족하여 Phase 1 일정이 2배 이상 지연 | 상 (60%) | HIGH — 전체 프로젝트 일정 지연 | **높음** |
| 3 | 외부 보안 감사에서 컨트랙트 수정이 필요한 Critical/High 취약점이 발견되어, genesis predeploy된 Proxy 교체 불가 상황 발생 | 중 (30%) | HIGH — 구현체 교체로 대응 가능하나 Proxy 자체 문제면 대응 불가 | **중-상** |

### 4. 추가 리서치가 필요한 항목 (Top 3)

1. **OP Stack genesis alloc에서 OpenZeppelin AccessControl의 스토리지 슬롯 직접 설정 가능 여부**: `forge inspect` 또는 `solc --storage-layout`으로 정확한 슬롯을 추출하고, OP Stack의 genesis 생성 도구(op-node/genesis)가 임의 스토리지 오버라이드를 지원하는지 확인한다. 기존 OP Stack predeploy(Predeploys.sol)의 스토리지 초기화 방식을 참고 코드로 분석한다.

2. **trh-sdk의 현재 genesis config 생성 로직과 확장 포인트**: SDK가 genesis.json의 `alloc` 필드에 커스텀 컨트랙트를 추가할 수 있는 인터페이스를 이미 제공하는지, 아니면 신규 개발이 필요한지 코드를 분석한다. 이에 따라 Phase 1 공수가 크게 달라진다.

3. **Sepolia에 배포된 기존 L1 CrossTrade 컨트랙트의 owner 키 확보 가능 여부 및 절차**: `.env.example`에 L1 CrossTrade 주소가 `0xDa2CbF69352cB46d9816dF934402b421d93b6BC2`(L2→L2)와 `0xf3473E5b1e89b9Df59036B6a799f9EA84AAD8859`(L2→L1)로 기재되어 있다. 이 컨트랙트들의 현재 owner가 누구이며, TRH Platform에서 setChainInfo를 호출할 수 있는 권한을 확보할 수 있는지 확인한다.

---

*본 리뷰는 PRD v1.0 Draft와 crossTrade 레포의 실제 소스코드, TRH Platform의 presets.json, docker-compose.yml을 교차 분석하여 작성되었습니다. 리뷰에서 식별된 사항은 PRD의 완성도를 높이기 위한 건설적 피드백이며, 전체적인 통합 비전과 기술 방향성은 올바르다고 판단합니다.*
