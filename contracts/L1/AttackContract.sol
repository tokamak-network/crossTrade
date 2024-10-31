// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";

contract AttackContract {
    
    address public crossDomainMessenger;
    address public l2fastWithdrawContract;

    function initialize(
        address _crossDomainMessenger,
        address _l2fastWithdrawContract
    )
        external
    {
        crossDomainMessenger = _crossDomainMessenger;
        l2fastWithdrawContract = _l2fastWithdrawContract;
    }

    function provideAttack(
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

        message = abi.encodeWithSignature("claimFW(address,address,address,uint256,uint256)", 
            _l1token,
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
        
        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

    function cancelAttack(
        address _msgSender,
        uint256 _salecount,
        uint32 _minGasLimit
    )
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("cancelFW(address,address,uint256)", 
            _msgSender,
            address(this),
            _salecount
        );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

    function editAttack(
        address _msgSender,
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
            _msgSender,
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