// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../../contracts/interfaces/IERC20.sol";

contract MockL1StandardBridge {
    
    event ETHBridgeInitiated(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes extraData
    );
    
    event ERC20BridgeInitiated(
        address indexed localToken,
        address indexed remoteToken,
        address indexed from,
        address to,
        uint256 amount,
        bytes extraData
    );
    
    event NativeTokenBridgeInitiated(
        address indexed from,
        address indexed to,
        uint256 amount,
        bytes extraData
    );
    
    event USDTDoubleApproval(
        address indexed token,
        address indexed from,
        uint256 firstApproval,
        uint256 secondApproval
    );
    
    // Track bridged amounts for testing
    mapping(address => mapping(address => uint256)) public bridgedETH; // to => amount
    mapping(address => mapping(address => mapping(address => uint256))) public bridgedERC20; // token => to => amount
    mapping(address => uint256) public bridgedNativeToken; // to => amount
    
    // Track approvals to verify USDT's double approval pattern
    mapping(address => mapping(address => uint256)) public lastApproval; // token => spender => amount
    mapping(address => uint256) public approvalCount; // token => count
    
    function bridgeETHTo(
        address _to,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external payable {
        bridgedETH[_to][address(0)] += msg.value;
        emit ETHBridgeInitiated(msg.sender, _to, msg.value, _extraData);
    }
    
    // Optimism style bridgeETHTo (4 params)
    function bridgeETHTo(
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external payable {
        require(msg.value == _amount, "MockL1StandardBridge: ETH amount mismatch");
        bridgedETH[_to][address(0)] += _amount;
        emit ETHBridgeInitiated(msg.sender, _to, _amount, _extraData);
    }
    
    function bridgeERC20To(
        address _localToken,
        address _remoteToken,
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external {
        // Check if this is USDT with double approval pattern
        uint256 allowance = IERC20(_localToken).allowance(msg.sender, address(this));
        
        // For USDT, we expect it to be approved to 0 first, then to the amount
        if (approvalCount[_localToken] >= 2) {
            emit USDTDoubleApproval(_localToken, msg.sender, 0, _amount);
        }
        
        // Transfer tokens from sender to bridge
        IERC20(_localToken).transferFrom(msg.sender, address(this), _amount);
        
        bridgedERC20[_localToken][_to][_remoteToken] += _amount;
        emit ERC20BridgeInitiated(_localToken, _remoteToken, msg.sender, _to, _amount, _extraData);
    }
    
    function bridgeNativeTokenTo(
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external {
        // This would typically handle native token of the L2 (e.g., TON)
        bridgedNativeToken[_to] += _amount;
        emit NativeTokenBridgeInitiated(msg.sender, _to, _amount, _extraData);
    }
    
    // Helper functions for testing
    function getBridgedETH(address _to) external view returns (uint256) {
        return bridgedETH[_to][address(0)];
    }
    
    function getBridgedERC20(address _token, address _to, address _remoteToken) external view returns (uint256) {
        return bridgedERC20[_token][_to][_remoteToken];
    }
    
    function getBridgedNativeToken(address _to) external view returns (uint256) {
        return bridgedNativeToken[_to];
    }
    
    // Function to simulate token arrival on L2 (for testing)
    function simulateTokenArrival(address _token, address _to, uint256 _amount) external {
        if (_token == address(0)) {
            // ETH
            payable(_to).transfer(_amount);
        } else {
            // ERC20
            IERC20(_token).transfer(_to, _amount);
        }
    }
    
    // Track approvals for USDT testing
    function trackApproval(address _token, address _spender, uint256 _amount) external {
        lastApproval[_token][_spender] = _amount;
        approvalCount[_token]++;
    }
    
    receive() external payable {}
} 