// contracts/interfaces/IArbSys.sol
// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IArbSys {
    function arbBlockNumber() external view returns (uint256);
    function arbBlockHash(uint256 blockNumber) external view returns (bytes32);
    function arbOSVersion() external view returns (uint256);
    function isTopLevelCall() external view returns (bool);
    function wasMyCallersAddressAliased() external view returns (bool);
    function myCallersAddressWithoutAliasing() external view returns (address);
    function sendTxToL1(address destination, bytes calldata calldataForL1) external payable returns (uint256);
}