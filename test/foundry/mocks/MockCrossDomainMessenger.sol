// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;
import "forge-std/console.sol";
contract MockCrossDomainMessenger {
    mapping(address => bool) public isValidSender;
    address public xDomainMessageSender;
    
    event SentMessage(
        address indexed target,
        address sender,
        bytes message,
        uint256 messageNonce,
        uint256 gasLimit
    );
    
    constructor() {
        // Set up initial valid senders
        isValidSender[address(this)] = true;
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
        xDomainMessageSender = _sender;
        
        // Execute the message on the target
        (bool success, ) = _target.call(_message);
        require(success, "MockCrossDomainMessenger: message execution failed");
        
        // Reset the sender
        xDomainMessageSender = address(0);
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