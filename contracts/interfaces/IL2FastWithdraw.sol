// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8.20;

interface IL2FastWithdraw {
    function claimFW(
        address _from,
        address _to,
        uint256 _amount,
        uint256 _saleCount
    )
        external
        payable;


    function cancelFW(
        address _msgSender,
        address _l1FastWithdraw,
        uint256 _salecount
    )
        external
        payable;

    function editFW(
        address _msgSender,
        uint256 _totalAmount,
        uint256 _fwAmount,
        uint256 _salecount
    )
        external
        payable;
}