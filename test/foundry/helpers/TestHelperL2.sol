// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../../../contracts/L1/L2toL2CrossTradeL1.sol";
import "../../../contracts/L2/L2toL2CrossTradeL2.sol";
import "../../../contracts/L1/L2toL2CrossTradeProxyL1.sol";
import "../../../contracts/L2/L2toL2CrossTradeProxy.sol";
import "../../../contracts/MockERC20Token.sol";
import "../mocks/MockCrossDomainMessenger.sol";
import "../mocks/MockL1StandardBridge.sol";
import "../mocks/MockUSDCBridge.sol";
import "../mocks/MockUSDT.sol";
import "../../../contracts/proxy/Proxy.sol";
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

contract TestHelperL2 is Test {
    
    // Chain IDs for testing
    uint256 constant L1_CHAIN_ID = 1;
    uint256 constant L2A_CHAIN_ID = 10;  // Source L2
    uint256 constant L2B_CHAIN_ID = 420; // Destination L2
    
    // Contracts
    L2toL2CrossTradeL1 public l1CrossTrade;
    L2toL2CrossTradeL2 public l2aCrossTrade;  // Source L2
    L2toL2CrossTradeL2 public l2bCrossTrade;  // Destination L2

    L2toL2CrossTradeProxyL1 public l1CrossTradeProxy;
    L2toL2CrossTradeProxy public l2aCrossTradeProxy;
    L2toL2CrossTradeProxy public l2bCrossTradeProxy;
    
    // Mock contracts
    MockCrossDomainMessenger public l1ToL2aMessenger;
    MockCrossDomainMessenger public l1ToL2bMessenger;
    MockL1StandardBridge public l1StandardBridge;
    MockUSDCBridge public l1USDCBridge;
    
    // Tokens
    MockERC20Token18 public l1Token;
    MockERC20Token18 public l2aSourceToken;
    MockERC20Token18 public l2bDestinationToken;
    MockERC20Token6 public usdc;
    MockUSDT public usdt;
    MockERC20Token6 public l2aUSDC;
    MockERC20Token6 public l2bUSDC;
    MockERC20Token6 public l2aUSDT;
    MockERC20Token6 public l2bUSDT;
    MockERC20Token18 public l2aETH;
    MockERC20Token18 public l2bETH;
    
    // Test addresses
    address public requester = makeAddr("requester");
    address public provider = makeAddr("provider");
    address public owner = makeAddr("owner");
    
    // Native token constant
    address constant NATIVE_TOKEN = 0x0000000000000000000000000000000000000000;

    
    function setUp() public virtual {
        vm.label(requester, "Requester");
        vm.label(provider, "Provider");
        vm.label(owner, "Owner");
        
        // Deploy mock bridges and messengers
        l1ToL2aMessenger = new MockCrossDomainMessenger();
        l1ToL2bMessenger = new MockCrossDomainMessenger();
        l1StandardBridge = new MockL1StandardBridge();
        l1USDCBridge = new MockUSDCBridge();
        
        // Deploy tokens
        l1Token = new MockERC20Token18("L1Token", "L1T");
        l2aSourceToken = new MockERC20Token18("L2AToken", "L2AT");
        l2bDestinationToken = new MockERC20Token18("L2BToken", "L2BT");
        usdc = new MockERC20Token6("USD Coin", "USDC");
        usdt = new MockUSDT();
        l2aETH = new MockERC20Token18("L2AETH", "L2AETH");
        l2bETH = new MockERC20Token18("L2BETH", "L2BETH");
        
        // Deploy L2 versions of USDC and USDT
        l2aUSDC = new MockERC20Token6("L2A USDC", "L2A.USDC");
        l2bUSDC = new MockERC20Token6("L2B USDC", "L2B.USDC");
        l2aUSDT = new MockERC20Token6("L2A USDT", "L2A.USDT");
        l2bUSDT = new MockERC20Token6("L2B USDT", "L2B.USDT");
        
        // Mint initial tokens
        l1Token.mint(provider, 1000 ether);
        l2aSourceToken.mint(requester, 1000 ether);
        usdc.mint(provider, 1000000 * 10**6); // 1M USDC
        usdt.mint(provider, 1000000 * 10**6); // 1M USDT
        
        // Mint L2 tokens for testing
        l2aUSDC.mint(requester, 1000000 * 10**6);
        l2aUSDT.mint(requester, 1000000 * 10**6);
        
        // Mint L2 ETH tokens for testing
        l2aETH.mint(requester, 200 ether);
        
        // Deploy cross-trade contracts
        _deployL1Contract();
        _deployL2Contracts();
        
        // Set up cross-trade configuration
        _configureContracts();
        
        // Give some ETH to test accounts
        vm.deal(requester, 100 ether);
        vm.deal(provider, 100 ether);
        vm.deal(address(l1StandardBridge), 100 ether);
    }
    
    function _deployL1Contract() internal {
        // Deploy L1 cross-trade contract as owner
        vm.startPrank(owner);
        L2toL2CrossTradeL1 impl = new L2toL2CrossTradeL1();
        l1CrossTradeProxy = new L2toL2CrossTradeProxyL1();
        
        l1CrossTradeProxy.upgradeTo(address(impl));
        l1CrossTrade = L2toL2CrossTradeL1(payable(address(l1CrossTradeProxy)));
        
        // Initialize the L1 proxy with chain and token addresses
        l1CrossTradeProxy.initialize(
            address(usdc), // usdcAddress
            address(usdt)  // usdtAddress
        );
        
        vm.stopPrank();
    }
    
    function _deployL2Contracts() internal {
        // Deploy L2A contract as owner
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(owner);
        L2toL2CrossTradeL2 implA = new L2toL2CrossTradeL2();
        l2aCrossTradeProxy = new L2toL2CrossTradeProxy();
        l2aCrossTradeProxy.upgradeTo(address(implA));
        l2aCrossTrade = L2toL2CrossTradeL2(payable(address(l2aCrossTradeProxy)));
        vm.stopPrank();
        
        // Deploy L2B contract as owner
        vm.chainId(L2B_CHAIN_ID);
        vm.startPrank(owner);
        L2toL2CrossTradeL2 implB = new L2toL2CrossTradeL2();
        l2bCrossTradeProxy = new L2toL2CrossTradeProxy();
        l2bCrossTradeProxy.upgradeTo(address(implB));
        l2bCrossTrade = L2toL2CrossTradeL2(payable(address(l2bCrossTradeProxy)));
        vm.stopPrank();
        
        // Return to L1 for further setup
        vm.chainId(L1_CHAIN_ID);
    }
    
    function _configureContracts() internal {
        // Register tokens for testing on L2A using owner
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(owner);
        l2aCrossTrade.registerToken(
            address(l1Token),
            address(l2aSourceToken),
            address(l2bDestinationToken),
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Register USDC tokens
        l2aCrossTrade.registerToken(
            address(usdc),
            address(l2aUSDC),
            address(l2bUSDC),
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Register USDT tokens
        l2aCrossTrade.registerToken(
            address(usdt),
            address(l2aUSDT),
            address(l2bUSDT),
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );

        // Register ETH tokens
        l2aCrossTrade.registerToken(
            address(NATIVE_TOKEN),
            address(l2aETH),
            address(l2bETH),
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );

        vm.stopPrank();
        
        // Configure chain data on L1 contract
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(owner);
        
        // Set up L2A chain data
        l1CrossTradeProxy.setChainInfo(
            address(l1ToL2aMessenger),      // crossDomainMessenger
            address(l2aCrossTrade),          // l2CrossTrade
            address(0),                      // l2NativeTokenAddressOnL1 (not used for this test)
            address(l1StandardBridge),       // l1StandardBridge
            address(l1USDCBridge),           // l1USDCBridge
            L2A_CHAIN_ID,                    // l2ChainId
            false                            // usesSimplifiedBridge
        );
        
        // Set up L2B chain data
        l1CrossTradeProxy.setChainInfo(
            address(l1ToL2bMessenger),      // crossDomainMessenger
            address(l2bCrossTrade),          // l2CrossTrade
            address(0),                      // l2NativeTokenAddressOnL1 (not used for this test)
            address(l1StandardBridge),       // l1StandardBridge
            address(l1USDCBridge),           // l1USDCBridge
            L2B_CHAIN_ID,                    // l2ChainId
            false                            // usesSimplifiedBridge
        );
        
        vm.stopPrank();
        
        // Configure L2 contracts to know about L1 contract
        vm.chainId(L2A_CHAIN_ID);
        vm.startPrank(owner);
        l2aCrossTradeProxy.setChainInfo(
            address(l1CrossTradeProxy),      // l1CrossTrade
            L1_CHAIN_ID                      // chainId
        );
        // Initialize L2A with its cross-domain messenger
        l2aCrossTradeProxy.initialize(address(l1ToL2aMessenger));
        vm.stopPrank();
        
        vm.chainId(L2B_CHAIN_ID);
        vm.startPrank(owner);
        l2bCrossTradeProxy.setChainInfo(
            address(l1CrossTradeProxy),      // l1CrossTrade
            L1_CHAIN_ID                      // chainId
        );
        // Initialize L2B with its cross-domain messenger
        l2bCrossTradeProxy.initialize(address(l1ToL2bMessenger));
        vm.stopPrank();
        
        vm.chainId(L1_CHAIN_ID);
    }
    
    // Helper function to simulate the complete L2-to-L2 flow
    function executeL2toL2Flow(
        address _l1token,
        address _l2SourceToken,
        address _l2DestinationToken,
        uint256 _totalAmount,
        uint256 _ctAmount,
        uint256 _editedctAmount,
        bool _useRegisteredToken
    ) public returns (bytes32 hash) {
        
        // Step 1: Make request on L2A
        vm.chainId(L2A_CHAIN_ID);
        
        // Use vm.prank to simulate EOA calls
        vm.startPrank(requester, requester);
        
        if (_l2SourceToken == NATIVE_TOKEN) {
            vm.deal(requester, _totalAmount);
        } else {
            MockERC20Token(_l2SourceToken).approve(address(l2aCrossTrade), _totalAmount);
        }
        
        if (_useRegisteredToken) {
            if (_l2SourceToken == NATIVE_TOKEN) {
                l2aCrossTrade.requestRegisteredToken{value: _totalAmount}(
                    _l1token,
                    _l2SourceToken,
                    _l2DestinationToken,
                    requester, // receiver same as requester
                    _totalAmount,
                    _ctAmount,
                    L1_CHAIN_ID,
                    L2B_CHAIN_ID
                );
            } else {
                l2aCrossTrade.requestRegisteredToken(
                    _l1token,
                    _l2SourceToken,
                    _l2DestinationToken,
                    requester, // receiver same as requester
                    _totalAmount,
                    _ctAmount,
                    L1_CHAIN_ID,
                    L2B_CHAIN_ID
                );
            }
        } else {
            if (_l2SourceToken == NATIVE_TOKEN) {
                l2aCrossTrade.requestNonRegisteredToken{value: _totalAmount}(
                    _l1token,
                    _l2SourceToken,
                    _l2DestinationToken,
                    requester, // receiver same as requester
                    _totalAmount,
                    _ctAmount,
                    L1_CHAIN_ID,
                    L2B_CHAIN_ID
                );
            } else {
                l2aCrossTrade.requestNonRegisteredToken(
                    _l1token,
                    _l2SourceToken,
                    _l2DestinationToken,
                    requester, // receiver same as requester
                    _totalAmount,
                    _ctAmount,
                    L1_CHAIN_ID,
                    L2B_CHAIN_ID
                );
            }
        }
        vm.stopPrank();
        // Get the hash for this request
        hash = l1CrossTrade.getHash(
            _l1token,
            _l2SourceToken,
            _l2DestinationToken,
            requester,
            requester, // receiver same as requester
            _totalAmount,
            _ctAmount,
            1, // saleCount
            L1_CHAIN_ID,
            L2A_CHAIN_ID,
            L2B_CHAIN_ID
        );
        
        // Step 2: Provider provides on L1
        vm.chainId(L1_CHAIN_ID);
        vm.startPrank(provider, provider);
            
        if (_l1token == NATIVE_TOKEN) {
            l1CrossTrade.provideCT{value: _ctAmount}(
                _l1token,
                _l2SourceToken,
                _l2DestinationToken,
                requester,
                requester, // receiver same as requester
                _totalAmount,
                _ctAmount, // initialctAmount
                _editedctAmount, // editedctAmount (same as initial for now)
                1, // saleCount
                L2A_CHAIN_ID,
                L2B_CHAIN_ID,
                200000, // minGasLimit
                hash
            );
        } else if (_l1token == address(usdt)) {
            // Handle USDT's double approval pattern
            MockUSDT(usdt).safeApprove(address(l1CrossTrade), _ctAmount);
            l1CrossTrade.provideCT(
                _l1token,
                _l2SourceToken,
                _l2DestinationToken,
                requester,
                requester, // receiver same as requester
                _totalAmount,
                _ctAmount, // initialctAmount
                _editedctAmount, // editedctAmount (same as initial for now)
                1, // saleCount
                L2A_CHAIN_ID,
                L2B_CHAIN_ID,
                200000, // minGasLimit
                hash
            );
        } else {
            // Regular ERC20 or USDC
            MockERC20Token(_l1token).approve(address(l1CrossTrade), _ctAmount);
            console.log("l1CrossTrade regular token or usdc", address(l1CrossTrade));

            l1CrossTrade.provideCT(
                _l1token,
                _l2SourceToken,
                _l2DestinationToken,
                requester,
                requester, // receiver same as requester
                _totalAmount,
                _ctAmount, // initialctAmount
                _editedctAmount, // editedctAmount (same as initial for now)
                1, // saleCount
                L2A_CHAIN_ID,
                L2B_CHAIN_ID,
                200000, // minGasLimit
                hash
            );
        }
        vm.stopPrank();
        // The mock messenger should have automatically called claimCT on L2A
        // Return to L2A to verify the state
        vm.chainId(L2A_CHAIN_ID);
        
        return hash;
    }
    
    // Helper function to get the appropriate bridge address for verification
    function getBridgedAmount(address _l1token, address _l2DestinationToken) public returns (uint256) {
        if (_l1token == address(usdc)) {
            return l1USDCBridge.getBridgedUSDC(_l1token, requester, _l2DestinationToken);
        } else if (_l1token == NATIVE_TOKEN) {
            return l1StandardBridge.getBridgedETH(requester);
        } else {
            return l1StandardBridge.getBridgedERC20(_l1token, requester, _l2DestinationToken);
        }
    }
    
    // Helper to check if a request was completed
    function isRequestCompleted(uint256 _saleCount, uint256 _l2DestinationChainId) public returns (bool) {
        vm.chainId(L2A_CHAIN_ID);
        (, , , , , address providerAddress, , , , , ) = l2aCrossTrade.dealData(_l2DestinationChainId, _saleCount);
        return providerAddress != address(0);
    }

    // Test-specific EOA bypass for testing
    function bypassEOACheck() public pure returns (bool) {
        // For testing purposes, we'll consider the test contract as an EOA
        return true;
    }
    
    // Helper function to test EOA detection
    function testEOADetection() public view returns (bool) {
        return EOA.isSenderEOA();
    }
    
    // Helper function to simulate EOA calls properly
    function callAsEOA(address target, bytes memory data) public returns (bytes memory) {
        // This should make tx.origin == msg.sender for the call
        (bool success, bytes memory result) = target.call(data);
        require(success, "Call failed");
        return result;
    }
    
    // Helper function to simulate EOA calls properly
    function callAsEOAWithValue(address target, bytes memory data, uint256 value) public returns (bytes memory) {
        // This should make tx.origin == msg.sender for the call
        (bool success, bytes memory result) = target.call{value: value}(data);
        require(success, "Call failed");
        return result;
    }
} 