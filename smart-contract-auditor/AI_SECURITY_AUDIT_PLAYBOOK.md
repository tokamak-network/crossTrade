# AI Security Audit Playbook
**Smart Contract Security Audit Methodology for AI Assistants**

> **Version**: 1.0.0  
> **Last Updated**: February 2, 2026  
> **Framework**: Trail of Bits Testing Handbook ([appsec.guide](https://appsec.guide))  
> **Reference Implementation**: [Tokamak Thanos Shutdown Audit](https://github.com/tokamak-network/tokamak-thanos/tree/main/packages/tokamak/contracts-bedrock/test/shutdown)

---

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Audit Workflow](#audit-workflow)
3. [Output Requirements](#output-requirements)
4. [Severity Classification](#severity-classification)
5. [Report Templates](#report-templates)
6. [Verification Commands](#verification-commands)

---

## 🔧 Prerequisites

### Required Tools
```bash
# 1. Slither (Static Analysis)
pip3 install slither-analyzer

# 2. Forge (Testing Framework)
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 3. Verify installations
slither --version  # Should be 0.11.5+
forge --version
```

### Project Structure Expected
```
project-root/
├── src/              # Smart contracts
├── test/             # Test files
├── scripts/          # Deployment scripts
├── foundry.toml      # Forge config
└── [audit-folder]/   # Where audit reports go
    ├── SECURITY_AUDIT_REPORT.md
    ├── VULNERABILITY_ANALYSIS.md
    └── fixes/        # Fixed contract versions
```

### Pre-Audit Checklist
- [ ] All contracts compile successfully (`forge build`)
- [ ] Test suite runs without errors (`forge test`)
- [ ] Git repository is clean (committed all changes)
- [ ] Scope is clearly defined (which contracts to audit)

---

## 🔄 Audit Workflow

### Phase 1: Static Analysis (Slither)
**Duration**: 5-10 minutes

```bash
# Run Slither on target contracts
slither src/ --exclude-dependencies --json slither-report.json

# Focus on specific folder if needed
slither src/[target-folder]/ --exclude-dependencies
```

**What to capture**:
- Total contracts analyzed
- Number of detectors used
- Findings by severity (high/medium/low/info)
- Filter out dependency warnings

**Output**: Save findings to `slither-report.json`

---

### Phase 2: Manual Code Review (AI Analysis)
**Duration**: 30-60 minutes

Follow **Trail of Bits Testing Handbook** patterns:

#### 2.1 Access Control Review
```solidity
// Check for:
✅ onlyOwner modifiers
✅ Role-based access control (RBAC)
✅ Multi-sig requirements
✅ Time-locks on critical functions
❌ Missing access controls on state-changing functions
❌ Centralization risks
```

#### 2.2 Reentrancy Analysis
```solidity
// Check for:
✅ Checks-Effects-Interactions (CEI) pattern
✅ ReentrancyGuard modifiers
✅ State updates before external calls
❌ External calls before state changes
❌ Missing reentrancy protection on fund transfers
```

#### 2.3 Asset Flow Analysis
```solidity
// Check for:
✅ Proper ETH/token accounting
✅ Balance validation before transfers
✅ Double-claim prevention (mappings/flags)
❌ Locked ether (payable with no withdraw)
❌ Missing balance checks
❌ Integer overflow/underflow risks
```

#### 2.4 Input Validation
```solidity
// Check for:
✅ Address(0) checks
✅ Amount bounds validation
✅ Array length limits
✅ Function parameter sanitization
❌ Missing zero-address checks
❌ Unbounded loops
❌ Missing input validation
```

#### 2.5 Proxy Pattern Safety (if applicable)
```solidity
// Check for:
✅ Storage collision prevention
✅ Proper initialization guards
✅ Upgrade authorization controls
❌ Uninitialized proxy storage
❌ Delegatecall to untrusted contracts
```

---

### Phase 3: Dynamic Testing (Forge)
**Duration**: 15-30 minutes

#### 3.1 Run Existing Tests
```bash
# Run all tests with verbosity
forge test -vvv

# Check coverage
forge coverage
```

**Metrics to capture**:
- Total tests count
- Pass rate (should be 100%)
- Coverage percentage
- Gas usage patterns

#### 3.2 Fuzz Testing
```solidity
// Add fuzz tests for critical functions
function testFuzz_criticalFunction(uint256 amount, address recipient) public {
    vm.assume(amount > 0 && amount < MAX_SUPPLY);
    vm.assume(recipient != address(0));
    
    // Test invariants with random inputs
}
```

**Run with increased iterations**:
```bash
# Default: 256 runs
forge test --fuzz-runs 256

# High security: 1000+ runs
forge test --fuzz-runs 1000
```

#### 3.3 Invariant Testing (if applicable)
```solidity
// Example: Token balance invariant
function invariant_totalSupplyMatchesBalances() public {
    uint256 sumBalances = 0;
    for (uint i = 0; i < users.length; i++) {
        sumBalances += token.balanceOf(users[i]);
    }
    assertEq(token.totalSupply(), sumBalances);
}
```

---

### Phase 4: Findings Documentation
**Duration**: 20-40 minutes

#### 4.1 Classify Findings
Use the [Severity Classification](#severity-classification) system below.

#### 4.2 Document Each Finding
For each vulnerability, record:
1. **Severity** (Critical/High/Medium/Low)
2. **Location** (Contract name, line numbers)
3. **Description** (What's wrong)
4. **Impact** (What could happen)
5. **Recommendation** (How to fix)
6. **Code Snippet** (Before/After if fixed)

---

### Phase 5: Apply Fixes & Verify
**Duration**: 30-90 minutes

#### 5.1 Implement Fixes
```solidity
// Example: Fix locked ether
// BEFORE
fallback() external payable { ... }

// AFTER
receive() external payable {
    revert("Contract: ETH not accepted");
}

fallback() external { ... }  // Remove payable
```

#### 5.2 Verify Fixes
```bash
# Rebuild
forge build

# Re-run tests
forge test -vvv

# Re-run Slither
slither src/ --exclude-dependencies

# Compare results
diff slither-report-before.json slither-report-after.json
```

#### 5.3 Update Test Suite
```solidity
// Add tests for fixed vulnerabilities
function test_cannotSendEther() public {
    vm.expectRevert("Contract: ETH not accepted");
    (bool success, ) = address(contract).call{value: 1 ether}("");
    assertFalse(success);
}
```

---

### Phase 6: Generate Reports
**Duration**: 20-30 minutes

Generate **TWO** markdown files:
1. **SECURITY_AUDIT_REPORT.md** - Executive summary for stakeholders
2. **VULNERABILITY_ANALYSIS.md** - Technical details for developers

See [Report Templates](#report-templates) below.

---

## 📊 Output Requirements

### File 1: SECURITY_AUDIT_REPORT.md
**Purpose**: High-level overview for management/team

**Required Sections**:
1. Executive Summary (risk matrix)
2. Contracts in Scope (table)
3. Static Analysis Results (Slither summary)
4. Detailed Findings (each vulnerability)
5. Security Controls Verified (checkmarks)
6. Test Coverage Summary
7. Architecture Review (ASCII diagrams)
8. Recommendations (prioritized)
9. Conclusion
10. Appendix (tools used)

---

### File 2: VULNERABILITY_ANALYSIS.md
**Purpose**: Technical documentation for developers

**Required Sections**:
1. Summary Table (severity, count, status)
2. HIGH Severity Findings (with fixes)
3. MEDIUM Severity Findings (with fixes)
4. LOW Severity Findings
5. Remediation Summary Table
6. Verification Commands
7. Approval Checklist

**Each Finding Must Include**:
- Vulnerability Description
- Code: Before (Vulnerable)
- Code: After (Fixed)
- Fix Verification Steps
- Status (✅ Fixed / ⚠️ Acknowledged / ❌ Open)

---

## 🚦 Severity Classification

### 🔴 CRITICAL
**Impact**: Complete loss of funds or control

**Examples**:
- Arbitrary code execution
- Unauthorized fund withdrawal
- Complete contract takeover
- Private key exposure

**Response**: Immediate fix required, block deployment

---

### 🟠 HIGH
**Impact**: Significant loss of funds or functionality

**Examples**:
- Locked ether with no recovery
- Reentrancy allowing theft
- Access control bypass
- Broken core functionality

**Response**: Fix before deployment

---

### 🟡 MEDIUM
**Impact**: Limited loss or degraded functionality

**Examples**:
- Missing access controls on non-critical functions
- Gas optimization issues causing DOS
- Weak randomness
- Missing input validation

**Response**: Fix recommended, document if acknowledged

---

### 🔵 LOW
**Impact**: Minor issues, best practices

**Examples**:
- Missing event emissions
- Unused variables
- Outdated Solidity version
- Non-standard naming

**Response**: Fix when convenient

---

### ℹ️ INFORMATIONAL
**Impact**: Code quality, gas optimization

**Examples**:
- Code style inconsistencies
- Redundant code
- Better patterns available
- Documentation improvements

**Response**: Optional improvements

---

## 📝 Report Templates

### Template 1: SECURITY_AUDIT_REPORT.md

```markdown
# [Project Name] Security Audit Report

**Project**: [Project Name]  
**Audit Date**: [Date]  
**Auditor**: Claude AI (Trail of Bits Guidelines Framework)  
**Scope**: `[folder/contract paths]`

---

## Executive Summary

This audit analyzes the [description] system for [project]. The system is designed to [purpose].

| Severity | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 0 | - |
| 🟠 High | X | Y Fixed, Z Acknowledged |
| 🟡 Medium | X | Documented |
| 🔵 Low | X | Informational |
| ℹ️ Info | X | Notes |

**Overall Assessment**: [1-2 sentence summary]

See also: [VULNERABILITY_ANALYSIS.md](./VULNERABILITY_ANALYSIS.md) for detailed fix documentation.

---

## Contracts In Scope

| Contract | Lines | Description |
|----------|-------|-------------|
| ContractA.sol | XXX | [Purpose] |
| ContractB.sol | XXX | [Purpose] |

---

## Static Analysis Results (Slither)

```
Analyzed: XX contracts with 56 detectors
Results: XX findings (most in dependencies)
```

### Project-Specific Findings

| Issue Type | Contract | Severity | Status |
|------------|----------|----------|--------|
| locked-ether | ContractA | Medium | Fixed |
| ... | ... | ... | ... |

---

## Detailed Findings

### 🟠 HIGH-1: [Vulnerability Name]

**Location**: `src/path/Contract.sol:XX-YY`

**Description**: [What's wrong]

```solidity
// Vulnerable code
function vulnerable() external payable {
    // Issue here
}
```

**Risk**: [Impact description]

**Recommendation**:
1. [Fix step 1]
2. [Fix step 2]

**Status**: ✅ Fixed / ⚠️ Acknowledged / ❌ Open

---

[Repeat for each finding]

---

## Security Controls Verified

### ✅ Access Control

| Function | Modifier | Status |
|----------|----------|--------|
| criticalFunc() | onlyOwner | ✅ |

### ✅ Reentrancy Protection

| Pattern | Location | Status |
|---------|----------|--------|
| nonReentrant modifier | ContractA:XX | ✅ |
| CEI pattern | ContractA:YY | ✅ |

### ✅ Input Validation

| Check | Location | Status |
|-------|----------|--------|
| Zero address | ContractA:XX | ✅ |
| Amount bounds | ContractA:YY | ✅ |

---

## Test Coverage

| Test File | Tests | Status |
|-----------|-------|--------|
| ContractA.t.sol | XX | ✅ Pass |
| **Total** | **XX** | **100% Pass** |

### Fuzz Testing

| Test | Runs | Status |
|------|------|--------|
| testFuzz_example | 256 | ✅ |

---

## Architecture Review

### System Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Contract A │ ──▶ │  Contract B │ ──▶ │  Contract C │
└─────────────┘     └─────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
   [Details]           [Details]           [Details]
```

### Key Security Properties

1. **[Property 1]**: Description
2. **[Property 2]**: Description
3. **[Property 3]**: Description

---

## Recommendations

### Critical Actions (Required)
[List or "None identified"]

### High Priority (Recommended)
1. [Recommendation]
2. [Recommendation]

### Medium Priority (Suggested)
1. [Recommendation]
2. [Recommendation]

### Low Priority (Nice-to-have)
1. [Recommendation]
2. [Recommendation]

---

## Conclusion

The [Project Name] system is [overall assessment]. The code demonstrates:

- ✅ [Strength 1]
- ✅ [Strength 2]
- ✅ [Strength 3]

[Final verdict on deployment readiness]

---

## Appendix: Tools Used

| Tool | Version | Purpose |
|------|---------|---------|
| Slither | X.X.X | Static analysis |
| Forge | Latest | Testing framework |
| Trail of Bits Skills | 1.0.1 | Audit methodology |

This report was generated following [Trail of Bits' Building Secure Contracts](https://appsec.guide) guidelines.
```

---

### Template 2: VULNERABILITY_ANALYSIS.md

```markdown
# [Project Name] - Vulnerability Analysis Report

**Date**: [Date]  
**Scope**: `[contract paths]`  
**Tool**: Slither vX.X.X + Manual Review

---

## Summary

| Severity | Count | Fixed | Acknowledged/Open |
|----------|-------|-------|-------------------|
| 🟠 HIGH | X | Y | Z |
| 🟡 MEDIUM | X | Y | Z |

---

## HIGH Severity Findings

### HIGH-1: [Vulnerability Name] ✅ FIXED

| Property | Value |
|----------|-------|
| Contract | ContractName.sol |
| Location | Line XX-YY |
| Status | ✅ Fixed |
| Commit | [commit hash] |

#### Vulnerability Description

[Detailed explanation of the vulnerability]

#### Before (Vulnerable)

```solidity
// Old vulnerable code
function oldFunction() external payable {
    // Vulnerability here
}
```

#### After (Fixed)

```solidity
// New secure code
function newFunction() external {
    // Fix applied
}
```

#### Fix Verification

- ✅ Build successful
- ✅ All tests pass (XX/XX)
- ✅ Slither no longer reports issue

---

[Repeat for each finding]

---

## MEDIUM Severity Findings

[Same structure as HIGH]

---

## Remediation Summary

| ID | Severity | Fix Applied | Status |
|----|----------|-------------|--------|
| HIGH-1 | 🟠 High | [Description] | ✅ Fixed |
| HIGH-2 | 🟠 High | No action (by design) | ⚠️ Acknowledged |
| MEDIUM-1 | 🟡 Medium | [Description] | ✅ Fixed |

---

## Verification Commands

```bash
# Build all contracts
forge build src/

# Run all tests
forge test --match-path "test/*" -vv

# Run Slither analysis
slither src/ --exclude-dependencies

# Check coverage
forge coverage
```

---

## Approval

| Item | Status |
|------|--------|
| Security Review | ✅ Complete |
| Code Changes | ✅ Verified |
| Test Coverage | ✅ XX% Pass (YY tests) |

**Conclusion**: All actionable findings have been addressed (X of Y fixed). 
The remaining Z are acknowledged as by-design or standard patterns. 
The system is ready for deployment.
```

---

## ✅ Verification Commands

### Before Starting Audit
```bash
# Check environment
forge --version
slither --version

# Clean build
forge clean
forge build

# Baseline tests
forge test -vvv
forge coverage
```

### During Audit
```bash
# Static analysis
slither src/ --exclude-dependencies --json slither-before.json

# Focused analysis on specific contract
slither src/ContractName.sol --exclude-dependencies

# Run tests with gas reporting
forge test --gas-report

# Fuzz testing
forge test --fuzz-runs 1000
```

### After Applying Fixes
```bash
# Rebuild
forge clean && forge build

# Verify tests still pass
forge test -vvv

# Re-run Slither
slither src/ --exclude-dependencies --json slither-after.json

# Compare reports
diff slither-before.json slither-after.json

# Check coverage improved
forge coverage --report lcov
```

---

## 🎯 AI Instructions Summary

When an AI assistant encounters this file in a contract directory:

### Step 1: Environment Check
Run prerequisite verification commands

### Step 2: Execute Audit Workflow
Follow Phases 1-6 in sequence:
1. Slither static analysis
2. Manual code review (Trail of Bits patterns)
3. Forge testing + fuzzing
4. Classify & document findings
5. Apply fixes & verify
6. Generate both report files

### Step 3: Output Delivery
Create exactly **TWO** files:
- `SECURITY_AUDIT_REPORT.md` (use Template 1)
- `VULNERABILITY_ANALYSIS.md` (use Template 2)

### Step 4: Verification
Ensure:
- All severity levels use emoji system (🔴🟠🟡🔵)
- Code snippets show Before/After
- Tables are properly formatted
- All tests pass (100%)
- Slither findings addressed or acknowledged

---

## 📚 Additional Resources

### Trail of Bits Resources
- **Testing Handbook**: https://appsec.guide
- **GitHub Repo**: https://github.com/trailofbits/testing-handbook
- **Semgrep Rules**: https://github.com/trailofbits/semgrep-rules
- **CodeQL Queries**: https://github.com/trailofbits/codeql-queries

### Solidity Security
- **SWC Registry**: https://swcregistry.io/
- **Consensys Best Practices**: https://consensys.github.io/smart-contract-best-practices/

### Testing Tools
- **Foundry Book**: https://book.getfoundry.sh/
- **Slither Wiki**: https://github.com/crytic/slither/wiki

---

## 🔄 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-02-02 | Initial playbook based on Tokamak audit |

---


** How to Use It ** 
Copy this file to any contract project
Point an AI to the folder
Say: "Follow the AI_SECURITY_AUDIT_PLAYBOOK.md to audit these contracts"
Get: Professional audit reports automatically



**END OF PLAYBOOK**

*Place this file in your contract repository root or audit folder. AI assistants should follow this methodology exactly to produce consistent, high-quality security audit reports.*
