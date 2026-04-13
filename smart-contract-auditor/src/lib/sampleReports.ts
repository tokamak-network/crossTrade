// Sample reports for preview/demo mode

export const SAMPLE_SECURITY_REPORT = `# Security Audit Report

## Executive Summary

This security audit examined the **ExampleToken** smart contract system, which implements an ERC-20 token with additional staking functionality. The audit identified several findings across different severity levels.

---

## Risk Assessment Matrix

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 1 | ❌ Open |
| 🟠 High | 2 | ❌ Open |
| 🟡 Medium | 2 | ❌ Open |
| 🔵 Low | 1 | ❌ Open |
| ℹ️ Info | 1 | ❌ Open |

---

## Contracts in Scope

| Contract | Lines | Description |
|----------|-------|-------------|
| ExampleToken.sol | 156 | Main ERC-20 token with staking |
| StakingVault.sol | 243 | Staking vault for token rewards |
| TokenProxy.sol | 45 | Upgradeable proxy contract |

---

## Detailed Findings

### 🔴 CRITICAL-1: Reentrancy Vulnerability in Withdraw Function

**Location:** \`StakingVault.sol:145-167\`

**Description:** The \`withdraw()\` function sends ETH to the user before updating the internal balance state, creating a classic reentrancy vulnerability.

**Vulnerable Code:**
\`\`\`solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // BAD: External call before state update
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    balances[msg.sender] -= amount;  // State updated after external call
}
\`\`\`

**Impact:** Attackers can drain the contract by recursively calling withdraw before the balance is updated.

**Recommendation:** Follow the Checks-Effects-Interactions pattern:

\`\`\`solidity
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // Update state first
    balances[msg.sender] -= amount;
    
    // Then make external call
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
\`\`\`

**Status:** ❌ Open

---

### 🟠 HIGH-1: Missing Access Control on Admin Functions

**Location:** \`ExampleToken.sol:78-92\`

**Description:** The \`setMinter()\` function lacks proper access control, allowing any address to grant minting privileges.

**Impact:** Unauthorized users could mint unlimited tokens, causing hyperinflation and complete loss of token value.

**Recommendation:** Add \`onlyOwner\` modifier or implement role-based access control.

**Status:** ❌ Open

---

### 🟠 HIGH-2: Unchecked Return Value in Token Transfer

**Location:** \`StakingVault.sol:89-95\`

**Description:** The contract doesn't check the return value of \`transferFrom()\` calls.

**Impact:** Silent failures could result in incorrect accounting and potential fund loss.

**Recommendation:** Use SafeERC20 library or check return values explicitly.

**Status:** ❌ Open

---

### 🟡 MEDIUM-1: Centralization Risk

**Location:** \`ExampleToken.sol:25-30\`

**Description:** Single owner address has unlimited control over contract upgrades and parameter changes.

**Impact:** Compromised owner key leads to complete protocol takeover.

**Recommendation:** Implement multi-sig or timelock for critical operations.

**Status:** ❌ Open

---

### 🟡 MEDIUM-2: Missing Event Emissions

**Location:** Various functions across contracts

**Description:** Several state-changing functions don't emit events.

**Impact:** Reduced transparency and difficulty in off-chain tracking.

**Recommendation:** Add appropriate events for all state changes.

**Status:** ❌ Open

---

### 🔵 LOW-1: Floating Pragma

**Location:** All contracts

**Description:** Using \`^0.8.20\` instead of a fixed version.

**Impact:** Different compiler versions may produce different bytecode.

**Recommendation:** Use fixed pragma: \`pragma solidity 0.8.20;\`

**Status:** ❌ Open

---

### ℹ️ INFO-1: Missing NatSpec Documentation

**Location:** Various internal functions

**Description:** Several functions lack proper documentation.

**Impact:** Reduced code maintainability.

**Recommendation:** Add comprehensive NatSpec comments.

**Status:** ❌ Open

---

## Security Controls Verified

| Control | Status | Notes |
|---------|--------|-------|
| ✅ ReentrancyGuard | Partial | Not applied consistently |
| ✅ Access Control | Present | Needs improvement |
| ❌ Input Validation | Missing | Zero address checks needed |
| ✅ Event Emissions | Partial | Some functions missing |

---

## Recommendations Summary

### Priority 1 - Critical
1. Fix reentrancy vulnerability immediately
2. Add proper access control to admin functions

### Priority 2 - High Severity
3. Implement SafeERC20 for token transfers
4. Add input validation for all parameters

### Priority 3 - Medium/Low
5. Implement multi-sig governance
6. Add comprehensive event emissions
7. Fix compiler version pragma

---

## Conclusion

The audited contracts contain **critical security vulnerabilities** that must be addressed before deployment. The reentrancy issue in particular poses an immediate risk of fund loss.

> **Recommendation:** Do not deploy to mainnet until all Critical and High severity issues are resolved.

---

## Appendix

**Tools Used:**
- Manual code review following Trail of Bits methodology
- Static analysis patterns based on common vulnerability classes

**Methodology:**
- Trail of Bits Testing Handbook patterns
- OWASP Smart Contract Security guidelines
`;

export const SAMPLE_VULNERABILITY_REPORT = `# Vulnerability Analysis Report

## Summary Table

| Severity | Count | Fixed | Acknowledged | Open |
|----------|-------|-------|--------------|------|
| 🔴 Critical | 1 | 0 | 0 | 1 |
| 🟠 High | 2 | 0 | 0 | 2 |
| 🟡 Medium | 2 | 0 | 0 | 2 |
| 🔵 Low | 1 | 0 | 0 | 1 |
| ℹ️ Info | 1 | 0 | 0 | 1 |
| **Total** | **7** | **0** | **0** | **7** |

---

## 🔴 CRITICAL SEVERITY FINDINGS

### CRITICAL-1: Reentrancy Vulnerability in Withdraw Function

**Location:** \`StakingVault.sol:145-167\`

**Description:** The \`withdraw()\` function contains a classic reentrancy vulnerability. The function sends ETH to the caller before updating the internal balance state, allowing an attacker to recursively call the function and drain funds.

**Vulnerable Code:**

\`\`\`solidity
function withdraw(uint256 amount) external {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // VULNERABILITY: External call before state update
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
    
    // State updated AFTER external call - allows reentrancy
    balances[msg.sender] -= amount;
}
\`\`\`

**Attack Scenario:**

1. Attacker deposits 1 ETH
2. Attacker calls \`withdraw(1 ether)\`
3. Contract sends 1 ETH to attacker
4. Attacker's \`receive()\` function calls \`withdraw()\` again
5. Balance not yet updated, so check passes
6. Repeat until contract is drained

**Proof of Concept:**

\`\`\`solidity
contract ReentrancyAttacker {
    StakingVault public vault;
    
    constructor(address _vault) {
        vault = StakingVault(_vault);
    }
    
    function attack() external payable {
        vault.deposit{value: msg.value}();
        vault.withdraw(msg.value);
    }
    
    receive() external payable {
        if (address(vault).balance >= 1 ether) {
            vault.withdraw(1 ether);
        }
    }
}
\`\`\`

**Recommended Fix:**

\`\`\`solidity
function withdraw(uint256 amount) external nonReentrant {
    require(balances[msg.sender] >= amount, "Insufficient balance");
    
    // Update state FIRST (Checks-Effects-Interactions pattern)
    balances[msg.sender] -= amount;
    
    // External call LAST
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success, "Transfer failed");
}
\`\`\`

**CVSS Score:** 9.8 (Critical)

**Status:** ❌ Open

---

## 🟠 HIGH SEVERITY FINDINGS

### HIGH-1: Missing Access Control on Admin Functions

**Location:** \`ExampleToken.sol:78-92\`

**Description:** The \`setMinter()\` function can be called by any address, allowing unauthorized users to grant themselves minting privileges.

**Vulnerable Code:**

\`\`\`solidity
function setMinter(address _minter) external {
    // Missing: require(msg.sender == owner, "Not authorized");
    minter = _minter;
}
\`\`\`

**Impact:** Complete token supply manipulation, leading to total loss of value.

**Recommended Fix:**

\`\`\`solidity
function setMinter(address _minter) external onlyOwner {
    require(_minter != address(0), "Invalid address");
    minter = _minter;
    emit MinterUpdated(_minter);
}
\`\`\`

**CVSS Score:** 8.6 (High)

**Status:** ❌ Open

---

### HIGH-2: Unchecked Return Value in Token Transfer

**Location:** \`StakingVault.sol:89-95\`

**Description:** The contract calls \`transferFrom()\` without checking the return value. Some ERC-20 tokens return \`false\` instead of reverting on failure.

**Vulnerable Code:**

\`\`\`solidity
function deposit(uint256 amount) external {
    // BAD: Return value not checked
    stakingToken.transferFrom(msg.sender, address(this), amount);
    deposits[msg.sender] += amount;
}
\`\`\`

**Recommended Fix:**

\`\`\`solidity
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

using SafeERC20 for IERC20;

function deposit(uint256 amount) external {
    stakingToken.safeTransferFrom(msg.sender, address(this), amount);
    deposits[msg.sender] += amount;
}
\`\`\`

**CVSS Score:** 7.5 (High)

**Status:** ❌ Open

---

## 🟡 MEDIUM SEVERITY FINDINGS

### MEDIUM-1: Centralization Risk

**Location:** \`ExampleToken.sol:25-30\`

**Description:** Single owner address controls all privileged functions including upgrades, minting, and parameter changes.

**Impact:** Single point of failure - if owner key is compromised or lost, the entire protocol is at risk.

**Recommendation:** 
- Implement multi-signature wallet for ownership
- Add timelock for critical operations
- Consider DAO governance for decentralization

**CVSS Score:** 6.5 (Medium)

**Status:** ❌ Open

---

### MEDIUM-2: Missing Event Emissions

**Location:** Multiple locations

| Function | Contract | Missing Event |
|----------|----------|---------------|
| \`setMinter()\` | ExampleToken.sol | MinterChanged |
| \`updateFee()\` | StakingVault.sol | FeeUpdated |
| \`pause()\` | ExampleToken.sol | Paused |

**Impact:** Reduced transparency and difficulty tracking state changes off-chain.

**Status:** ❌ Open

---

## 🔵 LOW SEVERITY FINDINGS

### LOW-1: Floating Pragma

**Location:** All contract files

**Description:** Contracts use \`^0.8.20\` which allows compilation with any compatible version.

**Recommendation:** Lock to specific version: \`pragma solidity 0.8.20;\`

**Status:** ❌ Open

---

## ℹ️ INFORMATIONAL FINDINGS

### INFO-1: Missing NatSpec Documentation

**Location:** Various internal functions

**Description:** Code lacks proper documentation for maintainability.

**Recommendation:** Add NatSpec comments to all public/external functions.

**Status:** ❌ Open

---

## Gas Optimization Opportunities

| Location | Optimization | Estimated Savings |
|----------|--------------|-------------------|
| StakingVault.sol:45 | Cache array length in loop | ~100 gas/iteration |
| ExampleToken.sol:112 | Use \`unchecked\` for safe math | ~50 gas |
| TokenProxy.sol:28 | Use immutable for constants | ~2100 gas |

---

## Test Coverage Analysis

| Contract | Line Coverage | Branch Coverage |
|----------|---------------|-----------------|
| ExampleToken.sol | 78% | 65% |
| StakingVault.sol | 62% | 45% |
| TokenProxy.sol | 85% | 70% |

> ⚠️ **Warning:** Low test coverage on StakingVault.sol correlates with the critical vulnerability found.

---

## Conclusion

This vulnerability analysis identified **1 critical**, **2 high**, **2 medium**, **1 low**, and **1 informational** findings. The critical reentrancy vulnerability requires immediate attention before any deployment.
`;
