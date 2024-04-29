// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IOptimismPortal {
    function depositTransaction(
        address _to, 
        uint256 _value, 
        uint64 _gasLimit, 
        bytes calldata _data
    ) 
        external;
}