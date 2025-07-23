// SPDX-License-Identifier: Unlicense
pragma solidity 0.8.24;

contract L1CrossTradeStorage {

    uint8 internal constant CLAIM_CT = 1;
    uint8 internal constant CANCEL_CT = 2;
    address constant NATIVE_TOKEN = address(0);
    address public usdcAddress;

    struct ChainIdData {
        address crossDomainMessenger;
        address l2CrossTradeContract;
    }

    //hashValue => bool -> Check whether provision has been made using the hash value.
    mapping(bytes32 => bool) public completedCT;
    //hashValue => address -> Store address requesting cancel using hash value
    mapping(bytes32 => address) public cancelL1;
    //hashValue => address -> Record the address provided using the hash value
    mapping(bytes32 => address) public provideAccount;
    //hashValue => fwAmount -> When editing is done using the hash value, the change amount is saved.
    mapping(bytes32 => uint256) public editCtAmount;
    //chainId => Data
    mapping(uint256 => ChainIdData) public chainData;
}
