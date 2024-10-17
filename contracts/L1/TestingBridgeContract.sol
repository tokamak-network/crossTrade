// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { IL1StandardBridge } from "./IL1StandardBridge.sol";


contract TestingBridgeContract {

    using SafeERC20 for IERC20;

    function testDeposit(
       uint256 ctAmount,   
       uint32 _minGasLimit,
       address _l1token,
       address _l2DestinationToken,    
       address bridge,
       address _requestor

    )
        external
        payable
    {

            IERC20(_l1token).safeTransferFrom(msg.sender, address(this), ctAmount);
            IERC20(_l1token).approve(bridge,ctAmount);
            IL1StandardBridge(bridge).depositERC20To(
                _l1token,
                _l2DestinationToken,
                _requestor,
                ctAmount,
                _minGasLimit,
                "0x" // encode the hash
            );
        }
    }


   
