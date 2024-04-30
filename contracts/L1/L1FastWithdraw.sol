// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL2FastWithdraw } from "../interfaces/IL2FastWithdraw.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L1FastWithdrawStorage } from "./L1FastWithdrawStorage.sol";
import { IOptimismPortal } from "../interfaces/IOptimismPortal.sol";

contract L1FastWithdraw is ProxyStorage, AccessibleCommon, L1FastWithdrawStorage {

    using SafeERC20 for IERC20;

    function provideFW(
        address _l1token,
        address _to,
        uint256 _amount,
        uint256 _saleCount,
        uint32 _minGasLimit
    )
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("claimFW(address,address,uint256,uint256)", 
            msg.sender,
            _to,
            _amount,
            _saleCount
        );

        // message = abi.encodeWithSelector(
        //     IL2FastWithdraw.claimFW.selector, 
        //     msg.sender,
        //     _to,
        //     _amount,
        //     _saleCount
        // );

        if (LEGACY_l1token == _l1token) {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, address(this), _amount);
            IERC20(_l1token).transfer(_to,_amount);
        } else if (LEGACY_ERC20_ETH == _l1token) {
            require(msg.value == _amount, "FW: ETH need same amount");
            payable(address(this)).call{value: msg.value};
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, _to, _amount);
        }
        
        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

    function provideFW2(
        address _l1token,
        address _to,
        uint256 _amount,
        uint256 _saleCount,
        uint32 _minGasLimit
    ) 
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("claimFW(address,address,uint256,uint256)", 
            msg.sender,
            _to,
            _amount,
            _saleCount
        );

        if (LEGACY_l1token == _l1token) {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, address(this), _amount);
            IERC20(_l1token).transfer(_to,_amount);
        } else if (LEGACY_ERC20_ETH == _l1token) {
            require(msg.value == _amount, "FW: ETH need same amount");
            payable(address(this)).call{value: msg.value};
            (bool sent, ) = payable(_to).call{value: msg.value}("");
            require(sent, "claim fail");
        } else {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, _to, _amount);
        }

        uint256 messageNonce = IL1CrossDomainMessenger(crossDomainMessenger).messageNonce();
        uint64 baseGas = IL1CrossDomainMessenger(crossDomainMessenger).baseGas(message, _minGasLimit);

        IOptimismPortal(portal).depositTransaction(
            l2fastWithdrawContract,
            0,
            baseGas,
            abi.encodeWithSelector(
                IL1CrossDomainMessenger.relayMessage.selector, messageNonce, msg.sender, l2fastWithdrawContract, msg.value, _minGasLimit, message
            )
        );
    }

    function cancel(
        uint256 _salecount,
        uint32 _minGasLimit
    )
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("cancelFW(address,address,uint256)", 
            msg.sender,
            address(this),
            _salecount
        );

        // message1 = abi.encodeWithSelector(
        //     IL2FastWithdraw.cancelFW.selector, 
        //     msg.sender,
        //     address(this),
        //     _salecount
        // );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

    function edit(
        uint256 _salecount,
        uint256 _fwAmount,
        uint256 _totalAmount,
        uint32 _minGasLimit
    )  
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("editFW(address,uint256,uint256,uint256)", 
            msg.sender,
            _fwAmount,
            _totalAmount,
            _salecount
        );

        // message2 = abi.encodeWithSelector(
        //     IL2FastWithdraw.editFW.selector, 
        //     msg.sender,
        //     _totalAmount,
        //     _fwAmount,
        //     _salecount
        // );
        

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

}