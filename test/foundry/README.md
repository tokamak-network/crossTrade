# L2-to-L2 Cross-Trade Foundry Test Suite

This directory contains comprehensive Foundry tests for the L2-to-L2 cross-chain trading functionality with full support for **USDC**, **USDT**, **ETH**, and **ERC20** tokens.

## 🎯 **What This Tests**

The test suite simulates the complete **3-chain L2-to-L2 flow**:

```
L2A (Source) → L1 (Bridge Hub) → L2B (Destination)
     ↓
L2A (Claim via cross-domain message)
```

### **Complete Flow Steps:**
1. **L2A**: User makes a request (`requestRegisteredToken` or `requestNonRegisteredToken`)
2. **L1**: Provider calls `provideCT` which:
   - Sends cross-domain message to L2A
   - Bridges tokens to L2B using the appropriate bridge
3. **L2A**: Receives message and calls `claimCT` (releases funds to provider)
4. **L2B**: User receives bridged tokens

## 📁 **Test Structure**

```
test/foundry/
├── mocks/
│   ├── MockCrossDomainMessenger.sol    # Simulates cross-chain messaging
│   ├── MockL1StandardBridge.sol        # Simulates standard token bridging
│   ├── MockUSDCBridge.sol             # Simulates USDC-specific bridging
│   └── MockUSDT.sol                   # USDT with double approval pattern
├── helpers/
│   └── TestHelper.sol                  # Base test setup with 3-chain simulation
├── L2toL2CrossTrade.t.sol             # Main functionality tests  
├── EOARestriction.t.sol               # EOA modifier tests
└── README.md                          # This file
```

## 🪙 **Token Support**

### **Supported Token Types**

| Token Type | L1 Bridge Used | Special Requirements | Test Coverage |
|------------|----------------|---------------------|---------------|
| **ETH** | `l1StandardBridge` | Native ETH handling | ✅ Full |
| **ERC20** | `l1StandardBridge` | Standard approval | ✅ Full |
| **USDC** | `l1USDCBridge` | Separate bridge | ✅ Full |
| **USDT** | `l1StandardBridge` | Double approval pattern | ✅ Full |
| **Native L2 Tokens** | `l1StandardBridge` | `bridgeNativeTokenTo` | ✅ Full |

### **USDC Bridging**
- Uses dedicated `MockUSDCBridge` (separate from standard bridge)
- Calls `bridgeERC20To` on the USDC bridge
- Tracked separately in test assertions

### **USDT Bridging**
- Uses standard bridge but requires **double approval**
- Must approve to `0` first, then to desired amount
- `MockUSDT` contract enforces this pattern
- Uses `safeApprove` helper in tests

## 🔧 **Test Components**

### **Mock Contracts**

#### `MockCrossDomainMessenger`
- Simulates cross-chain message passing
- Immediately relays messages for testing (can be disabled for manual control)
- Tracks message sender for authentication

#### `MockL1StandardBridge` 
- Simulates standard token bridging (ETH, ERC20, USDT, Native tokens)
- Tracks bridged amounts for verification
- Handles USDT's double approval detection

#### `MockUSDCBridge`
- Dedicated USDC bridge simulation
- Separate tracking for USDC bridging
- Mirrors real USDC bridge interface

#### `MockUSDT`
- Implements real USDT's double approval pattern
- Reverts on direct non-zero to non-zero approval
- Provides `safeApprove` for proper handling

### **Test Helper**
- Sets up complete 3-chain environment (L1: 1, L2A: 10, L2B: 420)
- Deploys all contracts with proper configuration
- Handles all token types automatically
- Provides `getBridgedAmount` helper that routes to correct bridge

## 🧪 **Test Coverage**

### **Main Functionality (`L2toL2CrossTrade.t.sol`)**

✅ **Happy Path Tests:**
- `test_RegisteredTokenL2toL2_ERC20()` - Complete ERC20 flow
- `test_RegisteredTokenL2toL2_USDC()` - **USDC-specific bridging**
- `test_RegisteredTokenL2toL2_USDT()` - **USDT with double approval**
- `test_NonRegisteredTokenL2toL2_ERC20()` - Non-registered token flow  
- `test_L2toL2_ETH()` - Native ETH flow

✅ **USDT-Specific Tests:**
- `test_USDT_DoubleApprovalPattern()` - Tests approval requirements

✅ **Edge Cases:**
- `test_CancelRequest()` - Request cancellation
- `test_EditFee()` - Fee editing functionality

✅ **Error Cases:**
- `test_RevertWhen_InvalidHash()` - Wrong hash validation
- `test_RevertWhen_UnregisteredToken()` - Using unregistered tokens
- `test_RevertWhen_InsufficientAmount()` - Invalid amounts

### **EOA Restrictions (`EOARestriction.t.sol`)**

✅ **Contract Call Restrictions:**
- All user-facing functions reject contract calls
- `requestRegisteredToken`, `requestNonRegisteredToken`
- `provideCT`, `cancel`, `editFee`, `resendProvideCTMessage`

✅ **EOA Success Cases:**
- Verifies EOAs can call all functions successfully
- Tests the EOA library functionality

## 🚀 **Running the Tests**

### **Prerequisites**
```bash
# Install Foundry if not already installed
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

### **Run All Tests**
```bash
# Run all foundry tests
forge test --match-path "test/foundry/*"

# Run with verbose output
forge test --match-path "test/foundry/*" -vvv

# Run specific test file
forge test --match-path "test/foundry/L2toL2CrossTrade.t.sol" -vvv

# Run specific test function
forge test --match-test "test_RegisteredTokenL2toL2_USDC" -vvv
```

### **Run Token-Specific Tests**
```bash
# Run USDC tests
forge test --match-test "USDC" -vvv

# Run USDT tests  
forge test --match-test "USDT" -vvv

# Run EOA tests
forge test --match-path "test/foundry/EOARestriction.t.sol" -vvv
```

### **Run with Gas Reports**
```bash
forge test --match-path "test/foundry/*" --gas-report
```

## 🔍 **Key Testing Patterns**

### **Chain Switching**
Tests use `vm.chainId()` to simulate different chains:
```solidity
vm.chainId(L2A_CHAIN_ID);  // Switch to L2A
// ... perform L2A operations

vm.chainId(L1_CHAIN_ID);   // Switch to L1  
// ... perform L1 operations
```

### **Token-Aware Bridging**
The test helper automatically handles different token types:
```solidity
// USDC uses dedicated bridge
if (_l1token == address(usdc)) {
    return l1USDCBridge.getBridgedUSDC(_l1token, requester, _l2DestinationToken);
}
// USDT uses double approval
else if (_l1token == address(usdt)) {
    MockUSDT(usdt).safeApprove(address(l1CrossTrade), _ctAmount);
}
```

### **Balance Verification**
Tests comprehensively check balances across all chains and token types:
```solidity
// Check requester spent tokens on L2A
assertEq(l2aUSDC.balanceOf(requester), initialBalance - totalAmount);

// Check provider received tokens on L2A
assertEq(l2aUSDC.balanceOf(provider), totalAmount);

// Check appropriate bridge was called
assertEq(getBridgedAmount(address(usdc), address(l2bUSDC)), ctAmount);
```

## 🛡️ **Security Testing**

### **EOA Restrictions**
The EOA tests ensure that:
- Smart contracts cannot call user-facing functions
- Only externally owned accounts (EOAs) can interact
- This prevents automated MEV extraction and ensures user intent

### **Token-Specific Security**
- **USDT**: Verifies double approval pattern is enforced
- **USDC**: Confirms separate bridge is used correctly
- **ETH**: Tests native value handling
- **ERC20**: Standard approval/transfer patterns

### **Hash Validation**
Tests verify that:
- Invalid hashes are rejected
- Hash parameters must match exactly
- Cross-chain message integrity is maintained

## 📊 **Expected Test Results**

When tests pass, you should see:
```
[PASS] test_RegisteredTokenL2toL2_ERC20() (gas: ~500k)
[PASS] test_RegisteredTokenL2toL2_USDC() (gas: ~520k)
[PASS] test_RegisteredTokenL2toL2_USDT() (gas: ~540k)
[PASS] test_USDT_DoubleApprovalPattern() (gas: ~150k)
[PASS] test_NonRegisteredTokenL2toL2_ERC20() (gas: ~480k)  
[PASS] test_L2toL2_ETH() (gas: ~450k)
[PASS] test_CancelRequest() (gas: ~400k)
[PASS] test_EditFee() (gas: ~520k)
[PASS] test_RevertWhen_InvalidHash() (gas: ~200k)
[PASS] test_RevertWhen_UnregisteredToken() (gas: ~100k)
[PASS] test_RevertWhen_InsufficientAmount() (gas: ~50k)

[PASS] test_RevertWhen_ContractCallsRequestRegisteredToken() (gas: ~100k)
[PASS] test_RevertWhen_ContractCallsProvideCT() (gas: ~150k)
[PASS] test_SuccessWhen_EOACallsFunctions() (gas: ~500k)
```

## 🔄 **Integration with Existing Tests**

These Foundry tests complement the existing TypeScript tests by:
- **Providing faster execution** for core logic testing
- **Enabling gas optimization** through detailed gas reports  
- **Supporting complex multi-chain scenarios** with easier mocking
- **Testing token-specific edge cases** (USDC bridge, USDT approvals)
- **Offering better debugging** with Foundry's trace capabilities

The TypeScript tests remain valuable for:
- Integration testing with actual bridge contracts
- Frontend integration testing
- Real network deployment testing

## 🎛️ **Customization**

### **Adding New Token Types**
1. Create new token contract in `TestHelper.setUp()`
2. Add bridge configuration for the token
3. Update `getBridgedAmount()` helper
4. Add token-specific test cases

### **Testing Different Chains**
1. Add new chain constants to `TestHelper`
2. Deploy contracts on new chain in `_deployL2Contracts()`
3. Configure chain info in `_configureContracts()`

### **Testing Failure Scenarios**
1. Use `vm.expectRevert()` for expected failures
2. Test edge cases with invalid parameters
3. Verify proper error messages

## 🚨 **Important Notes**

### **USDC Bridge Separation**
- USDC **always** uses `l1USDCBridge`, never `l1StandardBridge`
- Tests verify the correct bridge is called
- Real USDC bridge has different interfaces

### **USDT Double Approval**
- USDT requires approval to 0 before new approval
- Tests enforce this pattern with custom `MockUSDT`
- Use `safeApprove()` in contracts working with USDT

### **Chain ID Management**
- Always ensure you're on the correct chain before operations
- Use `vm.chainId()` consistently in tests
- Verify cross-chain message routing

This test suite provides comprehensive coverage of the L2-to-L2 cross-trade functionality with full token support, making it production-ready for all major token types! 