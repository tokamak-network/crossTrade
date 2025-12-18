// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../../contracts/MockERC20Token.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT token that implements the double approval pattern
 * Real USDT requires approval to be set to 0 before setting a new approval
 */
contract MockUSDT is MockERC20Token {
    
    constructor() MockERC20Token("Tether USD", "USDT") {}
    
    /**
     * @dev Override approve to implement USDT's double approval requirement
     * Must approve to 0 first before approving to a new amount (if current allowance > 0)
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        uint256 currentAllowance = allowance(msg.sender, spender);
        
        // USDT requires approval to be 0 before setting a new non-zero approval
        if (currentAllowance > 0 && amount > 0) {
            revert("USDT: approve from non-zero to non-zero allowance");
        }
        
        return super.approve(spender, amount);
    }
    
    /**
     * @dev Safe approve function that handles the double approval pattern
     * This is what contracts should use when working with USDT
     */
    function safeApprove(address spender, uint256 amount) external {
        uint256 currentAllowance = allowance(msg.sender, spender);
        
        if (currentAllowance > 0) {
            // First set to 0
            require(super.approve(spender, 0), "USDT: approve to 0 failed");
        }
        
        // Then set to desired amount
        require(super.approve(spender, amount), "USDT: approve failed");
    }
    
    /**
     * @dev Override decimals to return 6 for USDT
     */
    function decimals() public pure override returns (uint8) {
        return 6;
    }
} 