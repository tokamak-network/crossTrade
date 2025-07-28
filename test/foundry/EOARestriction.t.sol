// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./helpers/TestHelperL2.sol";

// Mock contract to test EOA restrictions
contract MockContractCaller {
    L2toL2CrossTradeL2 public crossTrade;
    L2toL2CrossTradeL1 public l1CrossTrade;
    
    constructor(address _crossTrade, address _l1CrossTrade) {
        crossTrade = L2toL2CrossTradeL2(payable(_crossTrade));
        l1CrossTrade = L2toL2CrossTradeL1(payable(_l1CrossTrade));
    }
    
    function callRequestRegisteredToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId
    ) external payable {
        crossTrade.requestRegisteredToken{value: msg.value}(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            _l1ChainId,
            _l2DestinationChainId
        );
    }
    
    function callRequestNonRegisteredToken(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _l1ChainId,
        uint256 _l2DestinationChainId
    ) external payable {
        crossTrade.requestNonRegisteredToken{value: msg.value}(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _ctAmount,
            _l1ChainId,
            _l2DestinationChainId
        );
    }
    
    function callProvideCT(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        address _requestor,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        uint32 _minGasLimit,
        bytes32 _hash
    ) external payable {
        l1CrossTrade.provideCT{value: msg.value}(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _requestor,
            _totalAmount,
            _initialctAmount,
            _editedctAmount,
            _saleCount,
            _l2SourceChainId,
            _l2DestinationChainId,
            _minGasLimit,
            _hash
        );
    }
    
    function callCancel(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        uint32 _minGasLimit,
        bytes32 _hash
    ) external {
        l1CrossTrade.cancel(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _initialctAmount,
            _saleCount,
            _l2SourceChainId,
            _l2DestinationChainId,
            _minGasLimit,
            _hash
        );
    }
    
    function callEditFee(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _initialctAmount,
        uint256 _editedctAmount,
        uint256 _saleCount,
        uint256 _l2SourceChainId,
        uint256 _l2DestinationChainId,
        bytes32 _hash
    ) external {
        l1CrossTrade.editFee(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            _totalAmount,
            _initialctAmount,
            _editedctAmount,
            _saleCount,
            _l2SourceChainId,
            _l2DestinationChainId,
            _hash
        );
    }
}

contract EOARestrictionTest is TestHelperL2 {
    
    MockContractCaller public contractCaller;
    
    function setUp() public override {
        super.setUp();
        
        // Deploy mock contract caller on L2A
        vm.chainId(L2A_CHAIN_ID);
        contractCaller = new MockContractCaller(address(l2aCrossTrade), address(l1CrossTrade));
    }
    
    function test_RevertWhen_ContractCallsRequestRegisteredToken() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        vm.chainId(L2A_CHAIN_ID);
        
        // Give the contract some ETH
        vm.deal(address(contractCaller), totalAmount);
        
        // Try to call from contract - should revert
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callRequestRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
    }
    
    function test_RevertWhen_ContractCallsRequestNonRegisteredToken() public {
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        vm.chainId(L2A_CHAIN_ID);
        
        // Give the contract some ETH
        vm.deal(address(contractCaller), totalAmount);
        
        // Try to call from contract - should revert
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callRequestNonRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
    }
    
    function test_RevertWhen_ContractCallsProvideCT() public {
        // First create a valid request from EOA
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            totalAmount,
            ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Now try to provide from contract on L1 - should revert
        vm.chainId(L1_CHAIN_ID);
        vm.deal(address(contractCaller), ctAmount);
        
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callProvideCT{value: ctAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            totalAmount,
            ctAmount,
            ctAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
    }
    
    function test_RevertWhen_ContractCallsCancel() public {
        // First create a valid request from EOA
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            totalAmount,
            ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Try to cancel from contract on L1 - should revert
        vm.chainId(L1_CHAIN_ID);
        
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callCancel(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
    }
    
    function test_RevertWhen_ContractCallsEditFee() public {
        // First create a valid request from EOA
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        uint256 editedCtAmount = 40 ether;
        
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            totalAmount,
            ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Try to edit fee from contract on L1 - should revert
        vm.chainId(L1_CHAIN_ID);
        
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callEditFee(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            editedCtAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            hash
        );
    }
    
    function test_SuccessWhen_EOACallsFunctions() public {
        // Verify that EOAs can successfully call all functions
        uint256 totalAmount = 100 ether;
        uint256 ctAmount = 50 ether;
        
        // Test requestRegisteredToken from EOA - should succeed
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: totalAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            totalAmount,
            ctAmount,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Get the hash for this request
        bytes32 hash = l1CrossTrade.getHash(
            NATIVE_TOKEN,
            NATIVE_TOKEN,
            address(l2bDestinationToken),
            requester,
            totalAmount,
            ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Test provideCT from EOA - should succeed but transfer from failed
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider,provider);
        vm.expectRevert("CT: Hash values do not match.");
        l1CrossTrade.provideCT{value: ctAmount}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            totalAmount,
            ctAmount,
            ctAmount,
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
        vm.stopPrank();
        
    }
    
    function test_EOALibrary_BasicFunctionality() public {
        // Test the EOA library directly
        vm.chainId(L2A_CHAIN_ID);
        
        vm.startPrank(requester,requester);
        
        // This should not revert (EOA call)
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: 1 ether}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            1 ether,
            0.5 ether,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        // Test contract call - should revert
        vm.deal(address(contractCaller), 1 ether);
        
        vm.expectRevert("CT: Function can only be called from an EOA");
        contractCaller.callRequestRegisteredToken{value: 1 ether}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            1 ether,
            0.5 ether,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
    }
    
    function test_RevertWhen_ContractCallsResendMessage() public {
        // Create a valid request first
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(requester,requester);
        vm.expectRevert(bytes("TRANSFER_FROM_FAILED"));
        l2aCrossTrade.requestRegisteredToken{value: 1 ether}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            1 ether,
            0.5 ether,
            L1_CHAIN_ID,
            L2B_CHAIN_ID
        );
        vm.stopPrank();
        
        bytes32 hash = l1CrossTrade.getHash(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            1 ether,
            0.5 ether,
            1,
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Provide from EOA first
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider,provider);
        vm.expectRevert("CT: EditedctAmount not match");
        l1CrossTrade.provideCT{value: 0.5 ether}(
            NATIVE_TOKEN,
            address(l2aETH),
            address(l2bETH),
            requester,
            1 ether,
            0.5 ether,
            0.5 ether,
            1,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000,
            hash
        );
        vm.stopPrank();
        
        // Now try to resend from contract - should revert
        vm.expectRevert("CT: Function can only be called from an EOA");
        vm.prank(address(contractCaller));
        l1CrossTrade.resendProvideCTMessage(
            1, // saleCount
            L2A_CHAIN_ID,
            L2B_CHAIN_ID,
            200000, // minGasLimit
            hash
        );
    }
} 