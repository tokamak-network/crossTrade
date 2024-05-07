// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { IL2FastWithdraw } from "../interfaces/IL2FastWithdraw.sol";
import { IL1CrossDomainMessenger } from "../interfaces/IL1CrossDomainMessenger.sol";
import { L1FastWithdrawStorage } from "./L1FastWithdrawStorage.sol";

contract L1FastWithdraw is ProxyStorage, AccessibleCommon, L1FastWithdrawStorage {

    using SafeERC20 for IERC20;

    function provideFW(
        address _l1token,
        address _to,
        uint256 _amount,
        uint256 _saleCount,
        uint256 _chainID,
        bytes32 _hash,
        uint32 _minGasLimit
    )
        external
        payable
    {

        bytes32 L2HashValue = getHash(
            _l1token,
            _to,
            _amount,
            _saleCount,
            _chainID
        );
        require(L2HashValue == _hash, "Hash values do not match.");

        bytes memory message;

        message = abi.encodeWithSignature("claimFW(address,address,address,uint256,uint256)", 
            _l1token,
            msg.sender,
            _to,
            _amount,
            _saleCount
        );

        if (nativeL1token == _l1token) {
            //need to approve
            IERC20(_l1token).transferFrom(msg.sender, address(this), _amount);
            IERC20(_l1token).transfer(_to,_amount);
        } else if (legacyERC20ETH == _l1token) {
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

    function cancel(
        uint256 _salecount,
        uint32 _minGasLimit
    )
        external
        payable
    {
        bytes memory message;

        message = abi.encodeWithSignature("cancelFW(address,uint256)", 
            msg.sender,
            _salecount
        );

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
        require(_totalAmount > _fwAmount, "need totalAmount over fwAmount");
        bytes memory message;

        message = abi.encodeWithSignature("editFW(address,uint256,uint256,uint256)", 
            msg.sender,
            _fwAmount,
            _totalAmount,
            _salecount
        );

        IL1CrossDomainMessenger(crossDomainMessenger).sendMessage(
            l2fastWithdrawContract, 
            message, 
            _minGasLimit
        );
    }

    function getHash(
        address _l1token,
        address _to,
        uint256 _amount,
        uint256 _saleCount,
        uint256 _chainID
    )
        public
        pure
        returns (bytes32)
    {
        return keccak256(
            abi.encode(_l1token, _to, _amount, _saleCount,_chainID)
        );
    }

    function _getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }

}