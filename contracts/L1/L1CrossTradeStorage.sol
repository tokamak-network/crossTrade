// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L1CrossTradeStorage {
    struct ChainIdData {
        address crossDomainMessenger;
        address l2CrossTradeContract;
        address legacyERC20ETH;
        address nativeL1token;
    }

    //hashValue => bool -> 해당 hash값이 거래했는지 안했는지
    mapping(bytes32 => bool) public successCT;
    //hashValue => bool -> hash값과 cancel을 요청한 address 저장
    mapping(bytes32 => address) public cancelL1;
    //hashValue => account
    mapping(bytes32 => address) public provideAccount;
    //hashValue => fwAmount 값 저장
    mapping(bytes32 => uint256) public editFwAmount;
    //chainId => Data
    mapping(uint256 => ChainIdData) public chainData;
}
