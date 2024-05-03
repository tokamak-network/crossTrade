// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "../libraries/SafeERC20.sol";
import "../proxy/ProxyStorage.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2FastWithdrawStorage } from "./L2FastWithdrawStorage.sol";
import { IOptimismMintableERC20, ILegacyMintableERC20 } from "../interfaces/IOptimismMintableERC20.sol";
import { IL2CrossDomainMessenger } from "../interfaces/IL2CrossDomainMessenger.sol";
import { AddressAliasHelper } from "../libraries/AddressAliasHelper.sol";

// import "hardhat/console.sol";

contract L2FastWithdraw is ProxyStorage, AccessibleCommon, L2FastWithdrawStorage {

    using SafeERC20 for IERC20;

    //=======modifier========

    modifier onlyEOA() {
        require(!_isContract(msg.sender), "L2FW: function can only be called from an EOA");
        _;
    }

    modifier checkL1() {
        require(
            IL2CrossDomainMessenger(crossDomainMessenger).xDomainMessageSender() == l1fastWithdrawContract, 
            "only call l1FastWithdraw"
        );
        _;
    }

    modifier providerCheck(uint256 _saleCount) {
        require(dealData[_saleCount].provider == address(0), "already sold");
        _;
    }

    //=======external========

    // function registerToken(
    //     address _l1token,
    //     address _l2token
    // )
    //     external
    //     onlyOwner
    // {
    //     enteringToken[_l2token] = _l1token;
    //     checkToken[_l1token][_l2token] = true;
    // }

    // function deleteToken(
    //     address _l1token,
    //     address _l2token
    // )
    //     external
    //     onlyOwner
    // {
    //     // enteringToken[_l2token] = address(0);
    //     checkToken[_l1token][_l2token] = false;
    // }

    function requestFW(
        address _l1token,
        address _l2token,
        uint256 _totalAmount,
        uint256 _fwAmount
    )
        external
        payable
        onlyEOA
    {
        ++saleCount;

        if (_l2token == legacyERC20ETH) {
            require(msg.value == _totalAmount, "FW: nativeTON need amount");
            payable(address(this)).call{value: msg.value};
        } else {
            //need to approve
            IERC20(_l2token).transferFrom(msg.sender,address(this),_totalAmount);
        }

        dealData[saleCount] = RequestData({
            l1token: _l1token,
            l2token: _l2token,
            requester: msg.sender,
            provider: address(0),
            totalAmount: _totalAmount,
            fwAmount: _fwAmount
        });
    }
    
    function claimFW(
        address _l1token,
        address _from,
        address _to,
        uint256 _amount,
        uint256 _saleCount
    )
        external
        payable
        checkL1
        providerCheck(_saleCount)
    {
        require(dealData[_saleCount].requester == _to, "not match the seller");
        require(dealData[_saleCount].fwAmount <= _amount, "need to over minAmount");
        require(dealData[_saleCount].l1token == _l1token, "need same l1token");

        dealData[_saleCount].provider = _from;
        dealData[_saleCount].fwAmount = _amount;

        chainID = _getChainID();

        if(dealData[_saleCount].l2token == legacyERC20ETH) {
            (bool sent, ) = payable(_from).call{value: dealData[_saleCount].totalAmount}("");
            require(sent, "claim fail");
        } else {
            IERC20(dealData[_saleCount].l2token).transfer(_from,dealData[_saleCount].totalAmount);
        }
    }

    function cancelFW(
        address _msgSender,
        uint256 _salecount
    )
        external
        payable
        checkL1
        providerCheck(_salecount)
    {
        require(dealData[_salecount].requester == _msgSender, "your not seller");

        // msgSender = AddressAliasHelper.undoL1ToL2Alias(tx.origin);

        dealData[_salecount].provider = dealData[_salecount].requester;
        
        if (dealData[_salecount].l2token == legacyERC20ETH) {
            (bool sent, ) = payable(_msgSender).call{value: dealData[_salecount].totalAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_salecount].l2token).transfer(dealData[_salecount].requester,dealData[_salecount].totalAmount);
        }
    }

    function editFW(
        address _msgSender,
        uint256 _fwAmount,
        uint256 _totalAmount,
        uint256 _salecount
    )
        external
        payable
        checkL1
        providerCheck(_salecount)
    {
        require(dealData[_salecount].requester == _msgSender, "your not seller");
        require(dealData[_salecount].fwAmount > _fwAmount, "need before fwAmount over new fwAmount");
        require(dealData[_salecount].totalAmount > _totalAmount, "need before totalAmount over new totalAmount");

        uint256 refundAmount = dealData[_salecount].totalAmount - _totalAmount;
        
        dealData[_salecount].totalAmount = _totalAmount;
        dealData[_salecount].fwAmount = _fwAmount;


        if (dealData[_salecount].l2token == legacyERC20ETH) {
            (bool sent, ) = payable(_msgSender).call{value: refundAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_salecount].l2token).transfer(dealData[_salecount].requester,refundAmount);
        }
    }

    function getL1token(
        address _l2token
    )
        external
        view
        returns (address l1Token) 
    {
        if (_l2token == legacyERC20ETH) {
            return l1Token = nativeL1token;
        } else {
            return l1Token = ILegacyMintableERC20(_l2token).l1Token();
        }
    }

    //=======internal========

    function _isContract(address account) internal view returns (bool) {
        return account.code.length > 0;
    }

    function _getChainID() internal view returns (uint256) {
        uint256 id;
        assembly {
            id := chainid()
        }
        return id;
    }
}