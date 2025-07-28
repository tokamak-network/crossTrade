// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./helpers/TestHelperL2.sol";
import "./mocks/MockUSDT.sol";

contract L2toL2CrossTradeTest is TestHelperL2 {
    
    event RequestCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hashValue
    );
    
    event ProvideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );
    
    event ProviderClaimCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requester,
        address _provider,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 indexed _saleCount,
        uint256 _l1ChainId,
        uint256 indexed _l2SourceChainId,
        uint256 indexed _l2DestinationChainId,
        bytes32 _hash
    );
    
    function test_RegisteredTokenL2toL2_ERC20() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        uint256 editedctAmount = 0 ether;
        
        // Record initial balances
        uint256 requesterInitialBalance = l2aSourceToken.balanceOf(requester);
        uint256 providerInitialBalance = l1Token.balanceOf(provider);
        
        // Execute the complete flow
        vm.chainId(L2A_CHAIN_ID);
        bytes32 hash = executeL2toL2Flow(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            editedctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify balances
        vm.chainId(L2A_CHAIN_ID);
        assertEq(
            l2aSourceToken.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2A tokens"
        );
        
        // Provider should have received the totalAmount on L2A
        assertEq(
            l2aSourceToken.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2A tokens"
        );
        
        // Check that bridge was called for L2B
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            getBridgedAmount(address(l1Token), address(l2bDestinationToken)),
            ctAmount,
            "Bridge should have bridged ctAmount to L2B"
        );
        
        // Verify L1 provider spent tokens
        assertEq(
            l1Token.balanceOf(provider),
            providerInitialBalance - ctAmount,
            "Provider should have spent ctAmount of L1 tokens"
        );
    }
    
    function test_RegisteredTokenL2toL2_USDC() public {
        uint256 totalAmount = 10000 * 10**6; // 10,000 USDC
        uint256 ctAmount = 5000 * 10**6;     // 5,000 USDC
        uint256 editedctAmount = 0;
        
        // Record initial balances
        uint256 requesterInitialBalance = l2aUSDC.balanceOf(requester);
        uint256 providerInitialBalance = usdc.balanceOf(provider);
        
        // Execute the complete USDC flow
        bytes32 hash = executeL2toL2Flow(
            address(usdc),
            address(l2aUSDC),
            address(l2bUSDC),
            totalAmount,
            ctAmount,
            editedctAmount,
            true // use registered token
        );
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify balances
        vm.chainId(L2A_CHAIN_ID);
        assertEq(
            l2aUSDC.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2A USDC"
        );
        
        // Provider should have received the totalAmount on L2A
        assertEq(
            l2aUSDC.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2A USDC"
        );
        
        // Check that USDC bridge was called for L2B
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            getBridgedAmount(address(usdc), address(l2bUSDC)),
            ctAmount,
            "USDC bridge should have bridged ctAmount to L2B"
        );
        
        // Verify L1 provider spent USDC
        assertEq(
            usdc.balanceOf(provider),
            providerInitialBalance - ctAmount,
            "Provider should have spent ctAmount of L1 USDC"
        );
    }
    
    function test_RegisteredTokenL2toL2_USDT() public {
        uint256 totalAmount = 10000 * 10**6; // 10,000 USDT
        uint256 ctAmount = 5000 * 10**6;     // 5,000 USDT
        uint256 editedctAmount = 0;
        
        // Record initial balances
        uint256 requesterInitialBalance = l2aUSDT.balanceOf(requester);
        uint256 providerInitialBalance = usdt.balanceOf(provider);
        
        // Execute the complete USDT flow
        bytes32 hash = executeL2toL2Flow(
            address(usdt),
            address(l2aUSDT),
            address(l2bUSDT),
            totalAmount,
            ctAmount,
            editedctAmount,
            true // use registered token
        );
        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify balances
        vm.chainId(L2A_CHAIN_ID);
        assertEq(
            l2aUSDT.balanceOf(requester),
            requesterInitialBalance - totalAmount,
            "Requester should have spent totalAmount of L2A USDT"
        );
        
        // Provider should have received the totalAmount on L2A
        assertEq(
            l2aUSDT.balanceOf(provider),
            totalAmount,
            "Provider should have received totalAmount of L2A USDT"
        );
        
        // Check that bridge was called for L2B (USDT uses standard bridge)
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            getBridgedAmount(address(usdt), address(l2bUSDT)),
            ctAmount,
            "Bridge should have bridged ctAmount USDT to L2B"
        );
        
        // Verify L1 provider spent USDT
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
    
    function test_NonRegisteredTokenL2toL2_ERC20() public {
        uint256 totalAmount = 75 ether;
        uint256 ctAmount = 30 ether;
        uint256 editedctAmount = 0;
        // Execute the complete flow with non-registered tokens
        bytes32 hash = executeL2toL2Flow(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            editedctAmount,
            false // use non-registered token
        );
        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Check that bridge was called
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            getBridgedAmount(address(l1Token), address(l2bDestinationToken)),
            ctAmount,
            "Bridge should have bridged ctAmount to L2B"
        );
    }
    
    function test_L2toL2_ETH() public {
        uint256 totalAmount = 5 ether;
        uint256 ctAmount = 2 ether;
        uint256 editedctAmount = 0;
        // Record initial ETH balances
        vm.chainId(L2A_CHAIN_ID);
        uint256 requesterInitialETHonL2A = l2aETH.balanceOf(requester);


        uint256 providerInitialETH = provider.balance;

        // Execute the complete flow with ETH
        bytes32 hash = executeL2toL2Flow(
            NATIVE_TOKEN, // L1 ETH
            address(l2aETH), // L2A ETH
            address(l2bETH), // L2B token
            totalAmount,
            ctAmount,
            editedctAmount,
            true // use registered token
        );


        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify ETH balances on L2A
        vm.chainId(L2A_CHAIN_ID);
        assertEq(
            l2aETH.balanceOf(requester),
            requesterInitialETHonL2A - totalAmount,
            "Requester should have spent totalAmount ETH"
        );
        
        // Provider should have received ETH on L2A
        assertEq(
            l2aETH.balanceOf(provider),
            totalAmount, // initial (0) + received
            "Provider should have received totalAmount ETH"
        );
        
        // verify provider spent ETH on L1
        assertEq(
            provider.balance,
            providerInitialETH - ctAmount,
            "Provider should have spent ctAmount ETH"
        );
        
        // Check that ETH bridge was called
        vm.chainId(L1_CHAIN_ID);
        assertEq(
            getBridgedAmount(NATIVE_TOKEN, address(l2bETH)),
            ctAmount,
            "Bridge should have bridged ctAmount ETH to L2B"
        );
    }
    
    function test_CancelRequest() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        uint256 editedctAmount = 0 ether;
        // Step 1: Make request on L2A
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        l2aSourceToken.approve(address(l2aCrossTrade), totalAmount);
        l2aCrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            requester,
            totalAmount,
            ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );

        assertEq(
            l2aSourceToken.balanceOf(requester),
            900 ether, // Should be back to original amount
            "Requester should have received refund"
        );

        // Step 2: Cancel on L1
        vm.chainId(L1_CHAIN_ID);

        l1CrossTrade.cancel(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();        
        // Verify the request was completed (cancelled)
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify tokens were returned to requester on L2A
        vm.chainId(L2A_CHAIN_ID);
        assertEq(
            l2aSourceToken.balanceOf(requester),
            1000 ether, // Should be back to original amount
            "Requester should have received refund"
        );
    }
    
    function test_EditFee() public {
        uint256 totalAmount = 100 ether;
        uint256 initialCtAmount = 50 ether;
        uint256 editedCtAmount = 40 ether; // Reduced fee
        
        // Step 1: Make request on L2A
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        l2aSourceToken.approve(address(l2aCrossTrade), totalAmount);
        l2aCrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            initialCtAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            requester,
            totalAmount,
            initialCtAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Step 2: Edit fee on L1
        vm.chainId(L1_CHAIN_ID);
        
        l1CrossTrade.editFee(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            initialCtAmount,
            editedCtAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            hash
        );
        vm.stopPrank();
        
        // Step 3: Provider provides with edited amount
        vm.startPrank(provider,provider);
        l1Token.approve(address(l1CrossTrade), editedCtAmount);
        
        l1CrossTrade.provideCT(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            requester,
            totalAmount,
            initialCtAmount, // original amount
            editedCtAmount,  // edited amount
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
        // Verify the request was completed
        assertTrue(isRequestCompleted(1, L2B_CHAIN_ID));
        
        // Verify correct amount was bridged (edited amount, not initial)
        assertEq(
            getBridgedAmount(address(l1Token), address(l2bDestinationToken)),
            editedCtAmount,
            "Bridge should have bridged editedCtAmount"
        );
    }
    
    function test_RevertWhen_InvalidHash() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        uint256 editedctAmount = 0;
        // Step 1: Make request on L2A
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        
        l2aSourceToken.approve(address(l2aCrossTrade), totalAmount);
        l2aCrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Step 2: Try to provide with wrong hash on L1
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider,provider);
        
        l1Token.approve(address(l1CrossTrade), ctAmount);
        
        bytes32 wrongHash = keccak256("wrong hash");
        
        vm.expectRevert("CT: Hash values do not match.");
        l1CrossTrade.provideCT(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            requester,
            totalAmount,
            ctAmount,
            ctAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            wrongHash
        );
        vm.stopPrank();
    }
    
    function test_RevertWhen_UnregisteredToken() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        uint256 editedctAmount = 0;
        
        // Try to use unregistered tokens with requestRegisteredToken   
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        
        MockERC20Token18 unregisteredToken = new MockERC20Token18("Unregistered", "UNREG");
        unregisteredToken.mint(requester, 1000 ether);
        unregisteredToken.approve(address(l2aCrossTrade), totalAmount);
        
        vm.expectRevert("CT: The tokens are not registered");
        l2aCrossTrade.requestRegisteredToken(
            address(unregisteredToken),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
    }
    
    function test_RevertWhen_InsufficientAmount() public {
        uint256 totalAmount = 50 ether;
        uint256 ctAmount = 100 ether; // More than total amount
        uint256 editedctAmount = 0;
        // Try to request with ctAmount > totalAmount
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        
        l2aSourceToken.approve(address(l2aCrossTrade), totalAmount);
        
        vm.expectRevert("CT: TotalAmount must be greater than ctAmount");
        l2aCrossTrade.requestRegisteredToken(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
    }
   
    function test_MockContractsFunctionality() public {
        // Test that our mock contracts work correctly
        uint256 amount = 1000 * 10**6; // 1000 USDC
        
        // Test USDT double approval
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider,provider);
        
        usdt.safeApprove(address(l1StandardBridge), amount);
        assertEq(usdt.allowance(provider, address(l1StandardBridge)), amount);
        
        // Test that regular approve fails for USDT
        vm.expectRevert("USDT: approve from non-zero to non-zero allowance");
        usdt.approve(address(l1StandardBridge), amount * 2);
        
        vm.stopPrank();
    }
    
    function test_BridgeMockFunctionality() public {
        // Test that our bridge mocks work correctly
        uint256 amount = 1000 * 10**6;
        
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider,provider);
        
        // Test USDC bridge
        usdc.approve(address(l1USDCBridge), amount);
        l1USDCBridge.bridgeERC20To(
            address(usdc),
            address(l2bUSDC),
            requester,
            amount,
            200000,
            "0x"
        );
        
        assertEq(l1USDCBridge.getBridgedUSDC(address(usdc), requester, address(l2bUSDC)), amount);
        
        // Test standard bridge
        l1Token.approve(address(l1StandardBridge), amount);
        l1StandardBridge.bridgeERC20To(
            address(l1Token),
            address(l2bDestinationToken),
            requester,
            amount,
            200000,
            "0x"
        );
        
        assertEq(l1StandardBridge.getBridgedERC20(address(l1Token), requester, address(l2bDestinationToken)), amount);
        
        vm.stopPrank();
    }
} 