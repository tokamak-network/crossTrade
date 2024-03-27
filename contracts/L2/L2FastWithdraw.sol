// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.20;

import "../libraries/SafeERC20.sol";

import { AccessibleCommon } from "../common/AccessibleCommon.sol";
import { L2FastWithdrawStorage } from "./L2FastWithdrawStorage.sol";

contract L2FastWithdraw is AccessibleCommon, L2FastWithdrawStorage {

    using SafeERC20 for IERC20;

    function registerToken(
        address _l1token,
        address _l2token
    )
        external
        onlyOwner
    {
        enteringToken[_l2token] = _l1token;
        checkToken[_l1token][_l2token] = true;
    }

    function deleteToken(
        address _l1token,
        address _l2token
    )
        external
        onlyOwner
    {
        // enteringToken[_l2token] = address(0);
        checkToken[_l1token][_l2token] = false;
    }

    function requestFW(
        address _l2token,
        uint256 _amount,
        uint256 _minAmount
    )
        external
        payable
    {
        address l1token = enteringToken[_l2token];
        require(checkToken[l1token][_l2token], "not entering token");
        
        ++salecount;

        dealData[salecount] = RequestData({
            l2token: _l2token,
            seller: msg.sender,
            buyer: msg.sender,
            sellAmount: _amount,
            minAmount: _minAmount,
            buyAmount: 0
        });

        if (dealData[salecount].l2token == LEGACY_ERC20_ETH) {
            payable(address(this)).call{value: msg.value};
        } else {
            //need to approve
            IERC20(dealData[salecount].l2token).safeTransferFrom(msg.sender,address(this),dealData[salecount].sellAmount);
        }
    }
    
    function buyFW(

    )
        external
    {

    }

    function cancelFW(
        uint256 _salecount
    )
        external
        payable
    {
        require(dealData[_salecount].seller == dealData[_salecount].buyer && dealData[_salecount].buyAmount == 0, "already been sold");
        require(dealData[_salecount].seller == msg.sender, "your not seller");
        
        if (dealData[_salecount].l2token == LEGACY_ERC20_ETH) {
            (bool sent, ) = payable(msg.sender).call{value: dealData[_salecount].sellAmount}("");
            require(sent, "cancel refund fail");
        } else {
            IERC20(dealData[_salecount].l2token).safeTransfer(msg.sender,dealData[_salecount].sellAmount);
        }
    }
}