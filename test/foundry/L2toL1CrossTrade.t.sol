// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./helpers/TestHelperL2L1.sol";

contract L2toL1CrossTradeTest is TestHelperL2L1 {
    
    event RequestCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _receiver,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hashValue
    );
    
    event ProvideCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _receiver,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );
    
    event ProviderClaimCT(
        address _l1token,
        address _l2token,
        address _requester,
        address _receiver,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l2chainId,
        bytes32 _hash
    );
    
    function test_RegisteredTokenL2toL1_ERC20() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Record initial balances
        uint256 requesterInitialBalance = l2Token.balanceOf(requester);
        uint256 providerInitialBalance = l1Token.balanceOf(provider);
        
        // Execute the complete flow
        bytes32 hash = executeL2toL1Flow(
            address(l1Token),
            address(l2Token),
            totalAmount,
            ctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify balances
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2Token.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2 tokens"
        );
        
        // Provider should have received the totalAmount on L2
        assertEq(
            l2Token.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2 tokens"
        );
        
        // Verify L1 provider spent tokens
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            l1Token.balanceOf(provider),
            providerInitialBalance - ctAmount,
            "Provider should have spent ctAmount of L1 tokens"
        );
    }
    
    function test_RegisteredTokenL2toL1_USDC() public {
        uint256 totalAmount = 10000 * 10**6; // 10,000 USDC
        uint256 ctAmount = 5000 * 10**6;     // 5,000 USDC
        
        // Register USDC tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(usdc),
            address(l2USDC),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Record initial balances
        uint256 requesterInitialBalance = l2USDC.balanceOf(requester);
        uint256 providerInitialBalance = usdc.balanceOf(provider);
        
        // Execute the complete USDC flow
        bytes32 hash = executeL2toL1Flow(
            address(usdc),
            address(l2USDC),
            totalAmount,
            ctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify balances
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2USDC.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2 USDC"
        );
        
        // Provider should have received the totalAmount on L2
        assertEq(
            l2USDC.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2 USDC"
        );
        
        // Verify L1 provider spent USDC
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            usdc.balanceOf(provider),
            providerInitialBalance - ctAmount,
            "Provider should have spent ctAmount of L1 USDC"
        );
    }
    
    function test_RegisteredTokenL2toL1_USDT() public {
        uint256 totalAmount = 10000 * 10**6; // 10,000 USDT
        uint256 ctAmount = 5000 * 10**6;     // 5,000 USDT
        
        // Register USDT tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(usdt),
            address(l2USDT),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Record initial balances
        uint256 requesterInitialBalance = l2USDT.balanceOf(requester);
        uint256 providerInitialBalance = usdt.balanceOf(provider);
        
        // Execute the complete USDT flow
        bytes32 hash = executeL2toL1Flow(
            address(usdt),
            address(l2USDT),
            totalAmount,
            ctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify balances
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2USDT.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2 USDT"
        );
        
        // Provider should have received the totalAmount on L2
        assertEq(
            l2USDT.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2 USDT"
        );
        
        // Verify L1 provider spent USDT
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            usdt.balanceOf(provider),
            providerInitialBalance - ctAmount,
            "Provider should have spent ctAmount of L1 USDT"
        );
    }
    
    function test_USDT_DoubleApprovalPattern() public {
        uint256 amount = 1000 * 10**6; // 1000 USDT
        
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider);
        
        // First approval should work
        usdt.safeApprove(address(l1CrossTrade), amount);
        assertEq(usdt.allowance(provider, address(l1CrossTrade)), amount);
        
        // Direct approve from non-zero to non-zero should fail
        vm.expectRevert("USDT: approve from non-zero to non-zero allowance");
        usdt.approve(address(l1CrossTrade), amount * 2);
        
        // But safeApprove should handle it correctly
        usdt.safeApprove(address(l1CrossTrade), amount * 2);
        assertEq(usdt.allowance(provider, address(l1CrossTrade)), amount * 2);
        
        vm.stopPrank();
    }
    
    function test_NonRegisteredTokenL2toL1_ERC20() public {
        uint256 totalAmount = 75 ether;
        uint256 ctAmount = 30 ether;
        
        // Execute the complete flow with non-registered tokens
        // For non-registered tokens, we need to call requestNonRegisteredToken directly
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        l2CrossTrade.requestNonRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Get the hash for this request
        bytes32 hash = l2CrossTrade.getHash(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            ctAmount,
            1, // saleCount
            L2_CHAIN_ID,
            L1_CHAIN_ID
        );
        
        // Provider provides on L1
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider, provider);
        l1Token.approve(address(l1CrossTrade), ctAmount);
        l1CrossTrade.provideCT(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            ctAmount,
            0, // editedctAmount (0 means no edit)
            1, // saleCount
            L2_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
        // Simulate cross-domain message to L2
        vm.chainId(L2_CHAIN_ID);
        l2ToL1Messenger.manualRelayMessage(
            address(l2CrossTrade),
            address(l1CrossTradeProxy), // sender - must match chainData[_chainId]
            abi.encodeWithSignature(
                "claimCT(address,uint256,uint256,uint256,bytes32)",
                provider,
                ctAmount,
                1, // saleCount
                L1_CHAIN_ID,
                hash
            )
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify balances
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2Token.balanceOf(requester),
            1000 ether - totalAmount,
            "Requester should have spent totalAmount of L2 tokens"
        );
        
        // Provider should have received the totalAmount on L2
        assertEq(
            l2Token.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2 tokens"
        );
    }
    
    function test_L2toL1_ETH() public {
        uint256 totalAmount = 5 ether;
        uint256 ctAmount = 2 ether;
        
        // Register ETH tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            NATIVE_TOKEN,
            address(l2ETH),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Record initial ETH balances
        vm.chainId(L2_CHAIN_ID);
        uint256 requesterInitialETH = l2ETH.balanceOf(requester);
        uint256 providerInitialETH = provider.balance;
        
        // Execute the complete flow with ETH
        bytes32 hash = executeL2toL1Flow(
            NATIVE_TOKEN, // L1 ETH
            address(l2ETH), // L2 ETH token
            totalAmount,
            ctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify ETH balances on L2
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2ETH.balanceOf(requester),
            requesterInitialETH - totalAmount,
            "Requester should have spent totalAmount ETH"
        );
        
        // Provider should have received ETH tokens on L2
        assertEq(
            l2ETH.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount ETH tokens"
        );
        
        // Verify provider spent ETH on L1
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            provider.balance,
            providerInitialETH - ctAmount,
            "Provider should have spent ctAmount ETH"
        );
    }
    
    function test_CancelRequest() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Step 1: Make request on L2
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        l2CrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            L1_CHAIN_ID
        );
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            ctAmount,
            1, // saleCount
            L2_CHAIN_ID,
            L1_CHAIN_ID
        );
        
        // Step 2: Cancel on L1
        vm.chainId(L1_CHAIN_ID);
        l1CrossTrade.cancel(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            1, // saleCount
            L2_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
        // Step 3: Simulate cross-domain message to L2
        vm.chainId(L2_CHAIN_ID);
        l2ToL1Messenger.manualRelayMessage(
            address(l2CrossTrade),
            address(l1CrossTradeProxy), // sender - must match chainData[_chainId]
            abi.encodeWithSignature(
                "cancelCT(address,uint256,uint256,bytes32)",
                requester,
                1, // saleCount
                L1_CHAIN_ID,
                hash
            )
        );
        
        // Verify the request was completed (cancelled)
        assertTrue(isRequestCompleted(1));
        
        // Verify tokens were returned to requester on L2
        vm.chainId(L2_CHAIN_ID);
        assertEq(
            l2Token.balanceOf(requester),
            1000 ether, // Should be back to original amount
            "Requester should have received refund"
        );
    }
    
    function test_EditFee() public {
        uint256 totalAmount = 100 ether;
        uint256 initialCtAmount = 50 ether;
        uint256 editedCtAmount = 40 ether; // Reduced fee
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Step 1: Make request on L2
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        l2CrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            initialCtAmount,
            L1_CHAIN_ID
        );
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            initialCtAmount,
            1, // saleCount
            L2_CHAIN_ID,
            L1_CHAIN_ID
        );
        
        // Step 2: Edit fee on L1
        vm.chainId(L1_CHAIN_ID);
        l1CrossTrade.editFee(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            initialCtAmount,
            editedCtAmount,
            1, // saleCount
            L2_CHAIN_ID,
            hash
        );
        vm.stopPrank();
        
        // Step 3: Provider provides with edited amount
        vm.startPrank(provider, provider);
        l1Token.approve(address(l1CrossTrade), editedCtAmount);
        
        l1CrossTrade.provideCT(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            initialCtAmount, // original amount
            editedCtAmount,  // edited amount
            1, // saleCount
            L2_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
        // Step 4: Simulate cross-domain message to L2
        vm.chainId(L2_CHAIN_ID);
        l2ToL1Messenger.manualRelayMessage(
            address(l2CrossTrade),
            address(l1CrossTradeProxy), // sender - must match chainData[_chainId]
            abi.encodeWithSignature(
                "claimCT(address,uint256,uint256,uint256,bytes32)",
                provider,
                editedCtAmount,
                1, // saleCount
                L1_CHAIN_ID,
                hash
            )
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1));
        
        // Verify provider spent the edited amount
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            l1Token.balanceOf(provider),
            1000 ether - editedCtAmount,
            "Provider should have spent editedCtAmount"
        );
    }
    
    function test_RevertWhen_InvalidHash() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Step 1: Make request on L2
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        l2CrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Step 2: Try to provide with wrong hash on L1
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider, provider);
        l1Token.approve(address(l1CrossTrade), ctAmount);
        
        bytes32 wrongHash = keccak256("wrong hash");
        
        vm.expectRevert("CT: Hash values do not match.");
        l1CrossTrade.provideCT(
            address(l1Token),
            address(l2Token),
            requester,
            requester, // receiver
            totalAmount,
            ctAmount,
            ctAmount, // editedctAmount
            1, // saleCount
            L2_CHAIN_ID,
            200000, // minGasLimit
            wrongHash
        );
        vm.stopPrank();
    }
    
    function test_RevertWhen_UnregisteredToken() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Try to use unregistered tokens with requestRegisteredToken   
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        
        vm.expectRevert("CT: The tokens are not registered");
        l2CrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            L1_CHAIN_ID
        );
        vm.stopPrank();
    }
    
    function test_RevertWhen_InsufficientAmount() public {
        uint256 totalAmount = 50 ether;
        uint256 ctAmount = 100 ether; // More than total amount
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Try to request with ctAmount > totalAmount
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        
        vm.expectRevert("CT: TotalAmount must be greater than ctAmount");
        l2CrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            L1_CHAIN_ID
        );
        vm.stopPrank();
    }
    
    function test_RevertWhen_UnsupportedChain() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Try to use non-registered tokens without chain support
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        l2Token.approve(address(l2CrossTrade), totalAmount);
        
        vm.expectRevert("CT: This chain is not supported.");
        l2CrossTrade.requestNonRegisteredToken(
            address(l1Token),
            address(l2Token),
            requester, // receiver
            totalAmount,
            ctAmount,
            999999 // Non-existent chain ID
        );
        vm.stopPrank();
    }
    
    function test_ResendMessage() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Register tokens first
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTrade.registerToken(
            address(l1Token),
            address(l2Token),
            L1_CHAIN_ID
        );
        vm.stopPrank();
        
        // Make request and provide
        bytes32 hash = executeL2toL1Flow(
            address(l1Token),
            address(l2Token),
            totalAmount,
            ctAmount,
            true
        );
        
        // Test resend provide message (this should work since the transaction was provided)
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider, provider);
        l1CrossTrade.resendProvideCTMessage(
            1, // saleCount
            L2_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
        // Note: We don't test resendCancelMessage here because this transaction was 
        // successfully provided, not cancelled. The cancelL1[hash] mapping would be empty.
        // A separate test should be created for cancel scenarios.
    }
    
    function test_MockContractsFunctionality() public {
        // Test that our mock contracts work correctly
        uint256 amount = 1000 * 10**6; // 1000 USDC
        
        // Test USDT double approval
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider);
        
        usdt.safeApprove(address(l1CrossTrade), amount);
        assertEq(usdt.allowance(provider, address(l1CrossTrade)), amount);
        
        // Test that regular approve fails for USDT
        vm.expectRevert("USDT: approve from non-zero to non-zero allowance");
        usdt.approve(address(l1CrossTrade), amount * 2);
        
        vm.stopPrank();
    }
    
    function test_BridgeMockFunctionality() public {
        // Test that our bridge mocks work correctly
        uint256 amount = 1000 * 10**6;
        
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider);
        
        // Test USDC bridge
        usdc.approve(address(l1USDCBridge), amount);
        l1USDCBridge.bridgeERC20To(
            address(usdc),
            address(l2USDC),
            requester,
            amount,
            200000,
            "0x"
        );
        
        assertEq(l1USDCBridge.getBridgedUSDC(address(usdc), requester, address(l2USDC)), amount);
        
        // Test standard bridge
        l1Token.approve(address(l1StandardBridge), amount);
        l1StandardBridge.bridgeERC20To(
            address(l1Token),
            address(l2Token),
            requester,
            amount,
            200000,
            "0x"
        );
        
        assertEq(l1StandardBridge.getBridgedERC20(address(l1Token), requester, address(l2Token)), amount);
        
        vm.stopPrank();
    }
} 