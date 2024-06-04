// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L1CrossTradeStorage {
    struct ChainIdData {
        address l2fastWithdrawContract;
        address legacyERC20ETH;
        address nativeL1token;
        uint256 editTime;
    }

    address public crossDomainMessenger;

    //hashValue => bool -> 해당 hash값이 거래했는지 안했는지
    mapping(bytes32 => bool) public successFW;
    //hashValue => edit시간 측정
    mapping(bytes32 => uint256) public editEndTime;
    //hashValue => account
    mapping(bytes32 => address) public provideAccount;
    //chainId => Data
    mapping(uint256 => ChainIdData) public chainData;
}
