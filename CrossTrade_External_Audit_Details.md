# CrossTrade External Audit Details

## Basic Info

- **Requester name:** George Negru
- **Requester Github id:** @negrugeorge
- **Review branch link:** https://github.com/tokamak-network/tokamak-thanos/tree/L2toL2Implementation
- **Commit hash:** `[TO BE UPDATED]` 
- **Expected review duration:** ???
- **Review completion deadline:** [TO BE DETERMINED]
- **Audit scope:** [CrossTrade Audit Scope](#audit-scope)
- **Contract explanation:** [CrossTrade Contract Info](#contract-info)
- **Seminar link:** [TO BE SCHEDULED]

---

## Overview

The CrossTrade system is a decentralized cross-chain trading protocol that enables fast, trustless token swaps between Layer 2 chains via Layer 1 as a bridge hub. The system supports two main flows:

1. **L2-to-L1 CrossTrade:** Direct swaps from L2 to L1 chains
2. **L2-to-L2 CrossTrade:** Cross-chain swaps between different L2 chains using L1 as an intermediary

The protocol operates on a **request-provide model** where:
- **Requesters** lock tokens on source chain and specify desired tokens on destination chain
- **Providers** fulfill requests by providing tokens on destination chain and claiming locked tokens from source

### Key Innovation
CrossTrade eliminates the need for traditional 7-day withdrawal periods by using **cross-domain messaging** and **provider incentives**, enabling near-instant cross-chain transfers.

---

## Audit Scope

### Core Contracts

#### **L1 Contracts (Layer 1 Hub)**

1. **L1CrossTrade.sol** - Main L1 contract for L2-to-L1 trades
   - **Lines:** 448
   - **Key Functions:** `provideCT`, `cancel`, `editFee`, `resendProvideCTMessage`

2. **L1CrossTradeProxy.sol** - L1 proxy contract
   - **Lines:** 28
   - **Key Functions:** `setChainInfo`

3. **L1CrossTradeStorage.sol** - L1 storage contract
   - **Lines:** 27
   - **Key Structures:** `ChainIdData`, state mappings

4. **L2toL2CrossTradeL1.sol** - L1 contract for L2-to-L2 trades
   - **Lines:** 545
   - **Key Functions:** `provideCT`, `resendProvideCTMessage`, bridging logic

5. **L2toL2CrossTradeProxyL1.sol** - L1 proxy for L2-to-L2
   - **Lines:** 53
   - **Key Functions:** `setChainInfo`, `initialize`

6. **L2toL2CrossTradeStorageL1.sol** - L1 storage for L2-to-L2
   - **Lines:** 33
   - **Key Structures:** `ChainIdData` with bridge addresses

#### **L2 Contracts (Layer 2 Chains)**

7. **L2CrossTrade.sol** - Main L2 contract for L2-to-L1 trades
   - **Lines:** 408
   - **Key Functions:** `requestRegisteredToken`, `requestNonRegisteredToken`, `claimCT`, `cancelCT`

8. **L2CrossTradeProxy.sol** - L2 proxy contract
   - **Lines:** 33
   - **Key Functions:** `initialize`, `setChainInfo`

9. **L2CrossTradeStorage.sol** - L2 storage contract
   - **Lines:** 30
   - **Key Structures:** `RequestData`, state mappings

10. **L2toL2CrossTradeL2.sol** - L2 contract for L2-to-L2 trades
    - **Lines:** 511
    - **Key Functions:** `requestRegisteredToken`, `requestNonRegisteredToken`, `claimCT`, `cancelCT`

11. **L2toL2CrossTradeProxy.sol** - L2 proxy for L2-to-L2
    - **Lines:** 33
    - **Key Functions:** `initialize`, `setChainInfo`

12. **L2toL2CrossTradeStorage.sol** - L2 storage for L2-to-L2
    - **Lines:** 32
    - **Key Structures:** `RequestData` with multi-chain support

#### **Supporting Infrastructure**

13. **Proxy.sol** - Upgradeable proxy implementation
    - **Lines:** 204
    - **Key Functions:** `upgradeTo`, `setSelectorImplementations2`

14. **AccessibleCommon.sol** - Access control base contract
    - **Lines:** [TO BE COUNTED]
    - **Key Features:** Role-based access control

15. **EOA.sol** - EOA validation library
    - **Lines:** 25
    - **Key Functions:** `isSenderEOA`

### **Total Lines of Code:** ~2,000+ lines

---

## Key Points to Check

### 1. **Cross-Chain Message Security**
- **Cross-domain messenger validation:** Ensure only authorized messengers can call claim functions
- **Message replay protection:** Verify hash uniqueness and completion tracking
- **Chain ID validation:** Confirm proper chain identification and routing

### 2. **Provider Risk and Centralization**
- **Message relay dependency:** Analyze provider risk when L2 operator fails to relay messages
- **Resend mechanism:** Verify `resendProvideCTMessage` functionality and limitations
- **Operator trust assumptions:** Evaluate centralization risks inherent to L2 architecture

### 3. **Token Handling and Bridge Integration**
- **Multi-token support:** Verify ETH, ERC20, USDC, USDT, and native token handling
- **Bridge routing logic:** Ensure correct bridge selection (Standard, USDC, Native)
- **USDT double approval:** Confirm proper handling of USDT's approval pattern
- **Amount validation:** Check totalAmount >= ctAmount constraints

### 4. **Hash-Based Security**
- **Hash collision resistance:** Verify hash generation includes sufficient entropy
- **Parameter validation:** Ensure hash verification prevents parameter manipulation
- **Request uniqueness:** Confirm one-time use of request hashes

### 5. **Access Control and Upgrades**
- **EOA restrictions:** Validate EOA-only modifiers work correctly with EIP-7702
- **Owner privileges:** Review admin functions and upgrade mechanisms
- **Proxy security:** Analyze selector-to-implementation mapping security

### 6. **Economic Security**
- **Fee editing mechanism:** Verify requester can safely modify ctAmount
- **Cancellation logic:** Ensure proper fund recovery for requesters
- **Provider incentives:** Analyze profit mechanisms and risk/reward balance

### 7. **State Management**
- **Completion tracking:** Verify `completedCT` prevents double-spending
- **Provider assignment:** Ensure `provideAccount` mapping integrity
- **Sale count management:** Check counter overflow and uniqueness

---

## Contract Info

### System Architecture

The CrossTrade system operates on a **hub-and-spoke model** with Layer 1 as the central hub:

```
L2A (Source) ←→ L1 (Hub) ←→ L2B (Destination)
     ↓                           ↓
  Request CT                 Receive Tokens
     ↓                           ↑
  Lock Tokens              Bridge Transfer
     ↓                           ↑
  Provider Claims ←— Cross-domain Message
```

### Flow Types

#### **L2-to-L1 Flow**
1. **Request Phase:** User calls `requestRegisteredToken`/`requestNonRegisteredToken` on L2
2. **Provide Phase:** Provider calls `provideCT` on L1 (sends tokens to requester + message to L2)
3. **Claim Phase:** L2 receives message, calls `claimCT`, releases locked tokens to provider

#### **L2-to-L2 Flow**
1. **Request Phase:** User calls `requestRegisteredToken`/`requestNonRegisteredToken` on L2A
2. **Provide Phase:** Provider calls `provideCT` on L1 (bridges to L2B + sends message to L2A)
3. **Claim Phase:** L2A receives message, calls `claimCT`, releases tokens to provider
4. **Completion:** User receives bridged tokens on L2B

### Token Support Matrix

| Token Type | L1 Bridge | L2-to-L1 | L2-to-L2 | Special Handling |
|------------|-----------|----------|----------|------------------|
| **ETH** | Standard | ✅ | ✅ | Native token handling |
| **ERC20** | Standard | ✅ | ✅ | Standard approval |
| **USDC** | USDC Bridge | ✅ | ✅ | Dedicated bridge |
| **USDT** | Standard | ✅ | ✅ | Double approval pattern |
| **Native L2** | Standard | ✅ | ✅ | `bridgeNativeTokenTo` |

### Security Features

#### **Cross-Domain Authentication**
- **Messenger validation:** Only authorized cross-domain messengers accepted
- **Sender verification:** `xDomainMessageSender()` validates L1 contract origin
- **Chain-specific routing:** Separate configurations per supported chain

#### **EOA Enforcement**
- **Contract call prevention:** All user functions restricted to EOAs
- **EIP-7702 consideration:** Library handles account abstraction edge cases
- **Bypass protection:** Multiple validation layers prevent circumvention

#### **Reentrancy Protection**
- **ReentrancyGuard:** Applied to all state-changing functions
- **Safe token transfers:** Uses OpenZeppelin's SafeERC20
- **Gas limits:** Controlled gas forwarding prevents griefing

#### **Hash-Based Integrity**
- **Unique identification:** Each request has cryptographically unique hash
- **Parameter binding:** Hash includes all critical parameters
- **Replay prevention:** Completed hashes tracked to prevent reuse

---

## Critical Risk Areas

### 1. **Provider Fund Loss Risk**
**Issue:** If L2 operator is malicious or L2 chain fails, provider funds may be locked indefinitely.

**Impact:** HIGH - Direct financial loss for providers
**Likelihood:** MEDIUM - Depends on L2 operator trustworthiness
**Mitigation:** Resend mechanism, but still relies on L2 operator cooperation

### 2. **Cross-Domain Message Failure**
**Issue:** Messages from L1 to L2 may fail or be delayed, preventing provider claims.

**Impact:** HIGH - System functionality breakdown
**Likelihood:** LOW - But possible during network congestion or operator issues
**Mitigation:** `resendProvideCTMessage` function allows retry attempts

### 3. **Hash Collision or Manipulation**
**Issue:** Weak hash generation could allow parameter manipulation or collisions.

**Impact:** HIGH - Could enable fund theft or system manipulation
**Likelihood:** LOW - If cryptographically secure hash used
**Mitigation:** Strong hash function with sufficient entropy required

### 4. **Upgrade Security**
**Issue:** Proxy upgrade mechanism could be exploited to change contract logic maliciously.

**Impact:** CRITICAL - Complete system compromise
**Likelihood:** LOW - If proper access controls maintained
**Mitigation:** Multi-sig ownership, timelock delays recommended

### 5. **Bridge Integration Vulnerabilities**
**Issue:** Incorrect bridge routing or approval handling could result in fund loss.

**Impact:** HIGH - Direct fund loss during bridging
**Likelihood:** MEDIUM - Complex multi-bridge logic increases attack surface
**Mitigation:** Comprehensive testing of all bridge integrations required

---

## Testing Strategy

### Foundry Test Coverage

The system includes comprehensive Foundry tests covering:

#### **Functional Tests**
- **Happy path flows:** Complete L2-to-L1 and L2-to-L2 transactions
- **Multi-token support:** ETH, ERC20, USDC, USDT, native tokens
- **Edge cases:** Fee editing, cancellation, resend functionality
- **Error conditions:** Invalid hashes, unauthorized calls, insufficient funds

#### **Security Tests**
- **EOA restrictions:** Contract call prevention
- **Access control:** Owner-only functions, cross-domain authentication
- **Reentrancy protection:** State consistency during external calls
- **Hash validation:** Parameter integrity and uniqueness

#### **Integration Tests**
- **Mock cross-domain messaging:** Simulates L1↔L2 communication
- **Bridge simulation:** Tests all supported bridge types
- **Multi-chain scenarios:** 3-chain L2A→L1→L2B flows

### Test Execution
```bash
# Run all CrossTrade tests
forge test --match-path "test/foundry/*"

# Run specific flow tests
forge test --match-test "test_RegisteredTokenL2toL2_USDC" -vvv

# Run with gas reporting
forge test --match-path "test/foundry/*" --gas-report
```

---

## Deployment and Configuration

### Chain Support
The system is designed to support multiple L2 chains including:
- **Optimism ecosystem:** Standard bridge integration
- **Arbitrum ecosystem:** Native ArbSys integration
- **Tokamak L2s:** Custom bridge configurations
- **Other OP Stack chains:** Configurable bridge adapters

### Configuration Requirements
1. **Cross-domain messengers:** Must be configured per supported chain
2. **Bridge addresses:** Standard, USDC, and native token bridges
3. **Token registrations:** Approved token pairs per chain
4. **Gas limits:** Appropriate limits for cross-domain messages

---

## Recommendations for Auditors

### Focus Areas
1. **Cross-chain security:** Message authentication and replay protection
2. **Economic incentives:** Provider risk/reward analysis
3. **Upgrade safety:** Proxy security and admin controls
4. **Bridge integrations:** Multi-bridge routing correctness
5. **State consistency:** Completion tracking and fund accounting

### Testing Approach
1. **Fork testing:** Test against real L1/L2 environments
2. **Stress testing:** High-volume transaction scenarios
3. **Failure scenarios:** Network partitions, operator malfunction
4. **Economic analysis:** Game theory and incentive alignment
5. **Upgrade simulation:** Test upgrade paths and rollback procedures

### Expected Findings
Based on internal audit, expect issues related to:
- **Centralization risks:** L2 operator dependency
- **Message relay failures:** Provider fund recovery mechanisms
- **EOA bypass attempts:** EIP-7702 edge cases
- **Bridge integration:** Complex multi-token routing
- **Access control:** Upgrade and admin function security

---

## Conclusion

The CrossTrade system represents a novel approach to cross-chain trading that prioritizes speed and user experience while accepting certain centralization trade-offs inherent to L2 architectures. The audit should focus on validating the security assumptions, particularly around cross-domain messaging and provider fund safety, while ensuring the economic incentives align with system security goals.

The system is production-ready for deployment with appropriate risk disclosures to users, particularly providers who must understand and accept the inherent risks of trusting L2 operators for message relay functionality.
