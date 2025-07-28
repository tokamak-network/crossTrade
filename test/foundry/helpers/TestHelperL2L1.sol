// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../../contracts/L1/L1CrossTrade.sol";
import "../../../contracts/L1/L1CrossTradeProxy.sol";
import "../../../contracts/L2/L2CrossTrade.sol";
import "../../../contracts/L2/L2CrossTradeProxy.sol";
import "../../../contracts/L2/L2CrossTradeStorage.sol";
import "../mocks/MockCrossDomainMessenger.sol";
import "../../../contracts/MockERC20Token.sol";
import "forge-std/console.sol";

// Custom ERC20 token with 18 decimals
contract MockERC20Token18 is MockERC20Token {
    constructor(string memory name, string memory symbol) 
        MockERC20Token(name, symbol) {}
    
    function decimals() public pure override returns (uint8) {
        return 18;
    }
}

// Custom ERC20 token with 6 decimals (for USDC)
contract MockERC20Token6 is MockERC20Token {
    constructor(string memory name, string memory symbol) 
        MockERC20Token(name, symbol) {}
    
    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

contract TestHelperL2L1 is Test {
    
    // Chain IDs
    uint256 constant L1_CHAIN_ID = 11155111; // Sepolia
    uint256 constant L2_CHAIN_ID = 111551119090; // Thanos Sepolia
    
    // Addresses
    address public owner = makeAddr("owner");
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    
    // Contracts
    L1CrossTrade public l1CrossTrade;
    L1CrossTradeProxy public l1CrossTradeProxy;
    L2CrossTrade public l2CrossTrade;
    L2CrossTradeProxy public l2CrossTradeProxy;
    
    // Mock contracts
    MockCrossDomainMessenger public l1ToL2Messenger;
    MockCrossDomainMessenger public l2ToL1Messenger;
    MockERC20Token18 public l1Token;
    MockERC20Token18 public l2Token;
    
    // Constants
    address constant NATIVE_TOKEN = address(0);
    string constant TRANSFER_FROM_FAILED = "TRANSFER_FROM_FAILED";
    
    function setUp() public virtual {
        _deployContracts();
        _configureContracts();
        _mintTokens();
    }
    
    function _deployContracts() internal {
        // Deploy L1 contracts
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(owner);
        
        l1CrossTradeProxy = new L1CrossTradeProxy();
        L1CrossTrade l1Logic = new L1CrossTrade();
        l1CrossTradeProxy.upgradeTo(address(l1Logic));
        l1CrossTrade = L1CrossTrade(payable(address(l1CrossTradeProxy)));
        
        vm.stopPrank();
        
        // Deploy L2 contracts
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        
        l2CrossTradeProxy = new L2CrossTradeProxy();
        L2CrossTrade l2Logic = new L2CrossTrade();
        l2CrossTradeProxy.upgradeTo(address(l2Logic));
        l2CrossTrade = L2CrossTrade(payable(address(l2CrossTradeProxy)));
        
        vm.stopPrank();
        
        // Deploy mock messengers
        l1ToL2Messenger = new MockCrossDomainMessenger();
        l2ToL1Messenger = new MockCrossDomainMessenger();
        
        // Deploy mock tokens
        l1Token = new MockERC20Token18("L1Token", "L1T");
        l2Token = new MockERC20Token18("L2Token", "L2T");
    }
    
    function _configureContracts() internal {
        // Configure L1 contract with L2 chain info
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(owner);
        l1CrossTradeProxy.setChainInfo(
            address(l1ToL2Messenger), // crossDomainMessenger
            address(l2CrossTradeProxy), // l2CrossTrade
            L2_CHAIN_ID // l2chainId
        );
        vm.stopPrank();
        
        // Configure L2 contract with L1 chain info
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(owner);
        l2CrossTradeProxy.initialize(address(l2ToL1Messenger));
        l2CrossTradeProxy.setChainInfo(
            address(l1CrossTradeProxy), // l1CrossTrade
            L1_CHAIN_ID // chainId
        );
        vm.stopPrank();
        
        // Configure the messenger to recognize the L1CrossTrade as a valid sender
        l2ToL1Messenger.setValidSender(address(l1CrossTradeProxy), true);
    }
    
    function _mintTokens() internal {
        // Mint tokens to requester and provider
        l1Token.mint(requester, 1000 ether);
        l1Token.mint(provider, 1000 ether);
        l2Token.mint(requester, 1000 ether);
        l2Token.mint(provider, 1000 ether);
        
        // Give ETH to accounts
        vm.deal(requester, 1000 ether);
        vm.deal(provider, 1000 ether);
    }
    
    function executeL2toL1Flow(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _ctAmount,
        bool _useRegisteredToken
    ) internal returns (bytes32 hash) {
        // Step 1: Make request on L2
        vm.chainId(L2_CHAIN_ID);
        vm.startPrank(requester, requester);
        
        if (_l2token == NATIVE_TOKEN) {
            l2CrossTrade.requestRegisteredToken{value: _totalAmount}(
                _l1token,
                _l2token,
                _totalAmount,
                _ctAmount,
                L1_CHAIN_ID
            );
        } else {
            l2Token.approve(address(l2CrossTrade), _totalAmount);
            l2CrossTrade.requestRegisteredToken(
                _l1token,
                _l2token,
                _totalAmount,
                _ctAmount,
                L1_CHAIN_ID
            );
        }
        vm.stopPrank();
        
        // Get the hash for this request
        hash = l2CrossTrade.getHash(
            _l1token,
            _l2token,
            requester,
            _totalAmount,
            _ctAmount,
            1, // saleCount
            L2_CHAIN_ID,
            L1_CHAIN_ID
        );
        
        // Step 2: Provider provides on L1
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider, provider);
        
        if (_l1token == NATIVE_TOKEN) {
            l1CrossTrade.provideCT{value: _ctAmount}(
                _l1token,
                _l2token,
                requester,
                _totalAmount,
                _ctAmount,
                0, // editedctAmount (0 means no edit)
                1, // saleCount
                L2_CHAIN_ID,
                200000, // minGasLimit
                hash
            );
        } else {
            l1Token.approve(address(l1CrossTrade), _ctAmount);
            l1CrossTrade.provideCT(
                _l1token,
                _l2token,
                requester,
                _totalAmount,
                _ctAmount,
                0, // editedctAmount (0 means no edit)
                1, // saleCount
                L2_CHAIN_ID,
                200000, // minGasLimit
                hash
            );
        }
        vm.stopPrank();
        
        // Step 3: Simulate cross-domain message to L2
        vm.chainId(L2_CHAIN_ID);
        l2ToL1Messenger.manualRelayMessage(
            address(l2CrossTrade),
            address(l1CrossTradeProxy), // sender - must match chainData[_chainId]
            abi.encodeWithSignature(
                "claimCT(address,uint256,uint256,uint256,bytes32)",
                provider,
                _ctAmount,
                1, // saleCount
                L1_CHAIN_ID,
                hash
            )
        );
    }
    
    function isRequestCompleted(uint256 _saleCount) internal view returns (bool) {
        (address l1token, address l2token, address requester, address provider, uint256 totalAmount, uint256 ctAmount, uint256 chainId, bytes32 hashValue) = l2CrossTrade.dealData(_saleCount);
        return provider != address(0);
    }
    
    function getBridgedAmount(address _l1token, address _l2token) internal view returns (uint256) {
        // This would track bridge calls in a real implementation
        // For now, return the expected amount
        return 0;
    }
} 