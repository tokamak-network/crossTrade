// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/console.sol";
import "../../../contracts/interfaces/IL2CrossDomainMessenger.sol";

contract MockCrossDomainMessenger is IL2CrossDomainMessenger {
    mapping(address => bool) public isValidSender;
    address private _xDomainMessageSender;
    
    event SentMessage(
        address indexed target,
        address sender,
        bytes message,
        uint256 messageNonce,
        uint256 gasLimit
    );
    
    event MessageExecutionFailed(
        address indexed target,
        address indexed sender,
        bytes message,
        bytes returnData
    );
    
    constructor() {
        // Set up initial valid senders
        isValidSender[address(this)] = true;
    }
    
    function xDomainMessageSender() external view override returns (address) {
        return _xDomainMessageSender;
    }
    
    function sendMessage(
        address _target,
        bytes calldata _message,
        uint32 _gasLimit
    ) external {
        console.log("sender11", msg.sender);
        emit SentMessage(_target, msg.sender, _message, 0, _gasLimit);
        
        // For testing, we'll immediately "relay" the message
        // In reality, this would happen on the other chain
        _relayMessage(_target, msg.sender, _message);
    }
    
    function _relayMessage(
        address _target,
        address _sender,
        bytes memory _message
    ) internal {
        // Set the cross-domain message sender
        _xDomainMessageSender = _sender;
        
        // Execute the message on the target
        (bool success, bytes memory returnData) = _target.call(_message);
        
        // In a real cross-domain messenger, failed messages are handled gracefully
        // For testing, we'll emit an event but not revert the transaction
        if (!success) {
            emit MessageExecutionFailed(_target, _sender, _message, returnData);
        }
        
        // Reset the sender
        _xDomainMessageSender = address(0);
    }
    
    // Function to manually relay messages (for testing scenarios where immediate relay isn't desired)
    function manualRelayMessage(
        address _target,
        address _sender,
        bytes calldata _message
    ) external {
        _relayMessage(_target, _sender, _message);
    }
    
    function setValidSender(address _sender, bool _valid) external {
        isValidSender[_sender] = _valid;
    }
} 