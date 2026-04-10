# Genesis Predeploy 스토리지 슬롯 분석

**분석 일자:** 2026-04-06
**검증 도구:** solc 0.8.24 `--standard-json` (storageLayout 출력)
**대상 컨트랙트:** L2CrossTradeProxy.sol, L2CrossTrade.sol

---

## 1. 문제 정의

Genesis predeploy로 컨트랙트를 배치하면 **constructor가 실행되지 않는다.** OP Stack genesis의 `alloc` 필드에 바이트코드와 스토리지를 직접 지정하는 방식이기 때문이다.

L2CrossTradeProxy의 부모인 `Proxy.sol`의 constructor는 다음을 실행한다:

```solidity
constructor () {
    _setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE);   // AccessControl 내부 호출
    _grantRole(ADMIN_ROLE, msg.sender);      // owner 등록
}
```

이것이 실행되지 않으면:
- `ADMIN_ROLE`의 admin role이 설정되지 않음
- 어떤 주소도 `ADMIN_ROLE`의 member가 아님
- **`onlyOwner` modifier가 붙은 모든 함수가 호출 불가능**
  - `initialize()`, `setChainInfo()`, `registerToken()`, `deleteToken()`
  - `upgradeTo()`, `setSelectorImplementations2()`, `setProxyPause()`

마찬가지로 `ReentrancyGuard`의 constructor도 실행되지 않아 `_status`가 `NOT_ENTERED(1)` 대신 `0`으로 남는다.

---

## 2. 컴파일러 검증 스토리지 레이아웃

`solc 0.8.24 --standard-json`으로 추출한 **실제 스토리지 레이아웃**:

### L2CrossTradeProxy (Proxy 컨트랙트 — genesis에 배치)

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

### L2CrossTrade (Implementation 컨트랙트)

| Slot | Variable | Type | 출처 |
|------|----------|------|------|
| 0–10 | *(위와 동일)* | | |
| **11** | **`_status`** | **uint256** | **ReentrancyGuard** |

**핵심 확인 사항:** Proxy와 Implementation의 slot 0–10이 완벽히 일치한다. `delegatecall` 시 스토리지 충돌 없음. Implementation만 slot 11에 `_status`를 추가로 사용한다.

---

## 3. Genesis에서 설정해야 하는 스토리지 슬롯

총 **15개 슬롯**을 설정해야 한다. 6가지 카테고리로 분류된다.

### A. 단순 슬롯 (직접 값 설정)

| 대상 | Slot Key | Value | 설명 |
|------|----------|-------|------|
| crossDomainMessenger | `0x...05` | L2 CDM 주소 | OP Stack 표준: `0x4200...0007` |
| _status (ReentrancyGuard) | `0x...0b` | `1` (NOT_ENTERED) | impl이 delegatecall로 사용하므로 proxy storage에 설정 |

`_status`를 설정하지 않으면 (default 0): 기능적으로는 동작하지만 첫 번째 호출에서 가스 환급이 줄어든다. `1`로 설정하는 것이 안전하다.

### B. Proxy 패턴 슬롯

`proxyImplementation[0]`과 `aliveImplementation[impl]`을 설정해야 `fallback()`에서 `delegatecall`이 올바른 구현체로 라우팅된다.

| 대상 | Slot 계산 | Value |
|------|-----------|-------|
| proxyImplementation[0] | `keccak256(abi.encode(0, 1))` | Implementation 주소 |
| aliveImplementation[impl] | `keccak256(abi.encode(impl_addr, 2))` | `true (0x01)` |

### C. Selector → Implementation 매핑 (7개)

`Proxy.sol`의 `fallback()`은 `msg.sig`를 `selectorImplementation` 매핑에서 조회하여 `delegatecall` 대상을 결정한다. 모든 L2CrossTrade 함수의 selector를 등록해야 한다.

| 함수 | Selector | Slot 계산 |
|------|----------|-----------|
| `registerToken(address,address,uint256)` | `0xb6f7134b` | `keccak256(abi.encode(bytes32(selector), 3))` |
| `deleteToken(address,address,uint256)` | `0x9792f8d7` | 〃 |
| `requestRegisteredToken(...)` | `0x0213672f` | 〃 |
| `requestNonRegisteredToken(...)` | `0xaee4ff85` | 〃 |
| `claimCT(...)` | `0x0f377395` | 〃 |
| `cancelCT(...)` | `0x6c790d54` | 〃 |
| `getHash(...)` | `0xd8294dde` | 〃 |

각 매핑의 value는 Implementation 컨트랙트의 predeploy 주소이다.

> **참고:** `setSelectorImplementations2()`를 genesis 후에 호출하는 것으로 대체할 수 있다면, 이 7개 슬롯은 생략하고 post-deploy에서 설정할 수 있다. 단, 그러려면 AccessControl이 먼저 올바르게 설정되어야 한다 (Section D).

### D. AccessControl 슬롯 (가장 핵심적인 부분)

OpenZeppelin AccessControl v5.0의 `_roles` 매핑 구조:

```
_roles (slot 4) → mapping(bytes32 role => RoleData)

RoleData struct {
    mapping(address account => bool) hasRole;    // offset 0
    bytes32 adminRole;                            // offset 1
}
```

설정해야 하는 값 2개:

**1) `_roles[ADMIN_ROLE].adminRole = ADMIN_ROLE`**

```
ADMIN_ROLE = keccak256("ADMIN") = 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42

RoleData 베이스 슬롯 = keccak256(abi.encode(ADMIN_ROLE, 4))
                     = 0x2fb794d17134dfdec181ddbac1babb5ab1eb140204ef4d982f294e7fc8b69022

adminRole 필드 = 베이스 슬롯 + 1
               = 0x2fb794d17134dfdec181ddbac1babb5ab1eb140204ef4d982f294e7fc8b69023

Value: 0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42  (= ADMIN_ROLE)
```

이것은 `_setRoleAdmin(ADMIN_ROLE, ADMIN_ROLE)`과 동일한 효과를 낸다. Role의 admin이 자기 자신이므로, ADMIN_ROLE member가 다른 admin을 추가/제거할 수 있다.

**2) `_roles[ADMIN_ROLE].hasRole[ownerAddress] = true`**

```
hasRole 서브매핑 베이스 = RoleData 베이스 슬롯 (offset 0)
                       = 0x2fb794d17134dfdec181ddbac1babb5ab1eb140204ef4d982f294e7fc8b69022

hasRole[owner] 슬롯 = keccak256(abi.encode(ownerAddress, 베이스슬롯))

Value: 0x01 (true)
```

이것은 `_grantRole(ADMIN_ROLE, ownerAddress)`와 동일한 효과를 낸다.

**이 2개 슬롯이 누락되면 컨트랙트가 완전히 잠기게 된다.**

### E. 비즈니스 로직 슬롯

| 대상 | Slot 계산 | Value | 설명 |
|------|-----------|-------|------|
| chainData[11155111] | `keccak256(abi.encode(11155111, 10))` | L1CrossTrade 주소 | Sepolia L1 연결 |
| registerCheck[chainId][l1Token][l2Token] | 3중 중첩 keccak256 | `true` | ETH 토큰 쌍 사전 등록 |

---

## 4. 정확한 슬롯 값 (Sepolia 예시)

아래는 `solc 0.8.24` + `ethers.js keccak256`으로 계산한 실제 슬롯-값 쌍이다.

```json
{
  "0x4200000000000000000000000000000000000030": {
    "comment": "L2CrossTradeProxy",
    "code": "0x<배포 바이트코드>",
    "balance": "0x0",
    "storage": {
      "// A. crossDomainMessenger (slot 5)": "",
      "0x0000000000000000000000000000000000000000000000000000000000000005": "0x0000000000000000000000004200000000000000000000000000000000000007",

      "// A. ReentrancyGuard._status = NOT_ENTERED (slot 11)": "",
      "0x000000000000000000000000000000000000000000000000000000000000000b": "0x0000000000000000000000000000000000000000000000000000000000000001",

      "// B. proxyImplementation[0] = impl address": "",
      "0xa6eef7e35abe7026729641147f7915573c7e97b47efa546f5f6e3230263bcb49": "0x000000000000000000000000<IMPL_ADDRESS>",

      "// B. aliveImplementation[impl] = true": "",
      "0x<keccak256(impl_addr, 2)>": "0x0000000000000000000000000000000000000000000000000000000000000001",

      "// C. selectorImplementation[registerToken] = impl": "",
      "0x757b86bc8eda9d6a7b9c960783954d61e73d116b7af3039c78b83b568cd10bc3": "0x000000000000000000000000<IMPL_ADDRESS>",
      "// ... (6 more selectors)": "",

      "// D. _roles[ADMIN_ROLE].adminRole = ADMIN_ROLE": "",
      "0x2fb794d17134dfdec181ddbac1babb5ab1eb140204ef4d982f294e7fc8b69023": "0xdf8b4c520ffe197c5343c6f5aec59570151ef9a492f2c624fd45ddde6135ec42",

      "// D. _roles[ADMIN_ROLE].hasRole[owner] = true": "",
      "0x<keccak256(owner_addr, roleBase)>": "0x0000000000000000000000000000000000000000000000000000000000000001",

      "// E. chainData[11155111] = L1CrossTrade": "",
      "0xe83b91319e3f46f3ba062f193930de6f9faf8e204728cf91fd240c66011cbcaa": "0x000000000000000000000000f3473e20f1d9eb4468c72454a27aa1c65b67ab35",

      "// E. registerCheck[11155111][ETH][ETH] = true": "",
      "0xcc7efa2535a5af7c3399ad3973a4d38c87f621c65c6db9b075b57f7eec02a4d5": "0x0000000000000000000000000000000000000000000000000000000000000001"
    }
  },
  "0x4200000000000000000000000000000000000031": {
    "comment": "L2CrossTrade (Implementation) - 스토리지 없음, 코드만",
    "code": "0x<배포 바이트코드>",
    "balance": "0x0",
    "storage": {}
  }
}
```

---

## 5. 실현 가능성 판정

### 결론: **기술적으로 실현 가능하다.**

솔리디티 컴파일러로 스토리지 레이아웃을 정확히 추출할 수 있고, 각 mapping/struct의 슬롯 주소를 keccak256으로 결정론적으로 계산할 수 있다. OP Stack의 genesis alloc은 임의 주소에 임의 스토리지를 설정할 수 있으므로, 위의 15개 슬롯을 올바르게 설정하면 constructor 실행 없이도 완전히 초기화된 상태로 배포된다.

### 그러나 복잡도가 높다:

1. **슬롯 계산 자동화 필수**: 수동 계산은 오류 가능성이 크다. trh-sdk에 `computeGenesisStorage(ownerAddress, implAddress, l1ChainId, ...)` 유틸리티 함수를 구현해야 한다.

2. **바이트코드 확보 방법 결정 필요**: genesis alloc에는 **deployed bytecode** (constructor 없이 런타임 코드만)가 필요하다. `solc`의 `--bin-runtime` 출력을 사용하거나, 컴파일된 artifact에서 `deployedBytecode`를 추출해야 한다.

3. **컨트랙트 변경 시 재계산 필요**: L2CrossTrade에 함수가 추가/변경되면 selector 매핑도 업데이트해야 한다. CI/CD에서 자동 검증하는 파이프라인이 필요하다.

4. **L2toL2CrossTrade도 동일한 작업 필요**: L2toL2CrossTradeProxy + L2toL2CrossTradeL2에 대해서도 같은 분석을 수행해야 하며, 스토리지 구조가 약간 다르다 (`saleCountChainId`, `l1CrossTradeContract` 등).

### 대안 (더 안전한 접근):

Genesis에서 AccessControl(Section D)과 Proxy 패턴(Section B)만 최소한으로 설정하고, Section C(selector mappings)와 Section E(비즈니스 로직)는 genesis 후 `initialize()` + `setSelectorImplementations2()` + `setChainInfo()` + `registerToken()` 호출로 처리하는 하이브리드 방식도 가능하다. 이 경우 genesis에서 설정할 슬롯이 15개에서 4개로 줄어든다.

---

## 6. PoC 검증 계획

Phase 1 시작 전, 다음 PoC를 로컬 devnet에서 수행한다:

1. `forge inspect L2CrossTradeProxy storageLayout`으로 스토리지 레이아웃 재확인
2. `forge script`으로 genesis alloc JSON 생성
3. `op-node`의 genesis 생성 도구에 custom alloc 주입
4. L2 부팅 후 `cast call <proxy> "isAdmin(address)" <owner>` → `true` 확인
5. `cast send <proxy> "registerToken(address,address,uint256)" ...` → 성공 확인
6. `requestRegisteredToken` → `claimCT` 전체 플로우 E2E 테스트

---

*이 문서는 solc 0.8.24 컴파일러 출력과 ethers.js keccak256 계산을 기반으로 작성되었습니다.*
