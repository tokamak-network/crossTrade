// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "../../../contracts/interfaces/IERC20.sol";

contract MockUSDCBridge {
    
    event USDCBridgeInitiated(
        address indexed localToken,
        address indexed remoteToken,
        address indexed from,
        address to,
        uint256 amount,
        bytes extraData
    );
    
    // Track bridged USDC amounts for testing
    mapping(address => mapping(address => mapping(address => uint256))) public bridgedUSDC; // token => to => remoteToken => amount
    
    function bridgeERC20To(
        address _localToken,
        address _remoteToken,
        address _to,
        uint256 _amount,
        uint32 _minGasLimit,
        bytes calldata _extraData
    ) external {
        // Transfer USDC from sender to bridge
        IERC20(_localToken).transferFrom(msg.sender, address(this), _amount);
        
        bridgedUSDC[_localToken][_to][_remoteToken] += _amount;
        emit USDCBridgeInitiated(_localToken, _remoteToken, msg.sender, _to, _amount, _extraData);
    }
    
    // Helper function for testing
    function getBridgedUSDC(address _token, address _to, address _remoteToken) external view returns (uint256) {
        return bridgedUSDC[_token][_to][_remoteToken];
    }
    
    // Function to simulate USDC arrival on L2 (for testing)
    function simulateUSDCArrival(address _token, address _to, uint256 _amount) external {
        IERC20(_token).transfer(_to, _amount);
    }
} 