// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L1CrossTradeStorage {
    struct ChainIdData {
        address crossDomainMessenger;
        address l2CrossTradeContract;
        address legacyERC20ETH;
        address nativeL1token;
    }

    //hashValue => bool -> Check whether provision has been made using the hash value.
    mapping(bytes32 => bool) public successCT;
    //hashValue => address -> Store address requesting cancel using hash value
    mapping(bytes32 => address) public cancelL1;
    //hashValue => address -> Record the address provided using the hash value
    mapping(bytes32 => address) public provideAccount;
    //hashValue => fwAmount -> When editing is done using the hash value, the change amount is saved.
    mapping(bytes32 => uint256) public editCtAmount;
    //chainId => Data
    mapping(uint256 => ChainIdData) public chainData;
}
