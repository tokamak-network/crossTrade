# CrossTrade
[Contract Composition](https://viewer.diagrams.net/?tags=%7B%7D#G1xUNgKjUPN_JHC7JbFmRUcwzWW6Crd4PQ)

It consists of a CrossTrade-related proxy and logic contract in L1, and a CrossTrade-related proxy and logic contract in L2.

CrossTrade requests can be made in L2, and editing, canceling, and providing can only be done in L1.

One thing to note is that L1 cannot check the information in L2.
So, when creating a transaction in L1, the hash value generated in L2 is also included and goes through a process to check whether the information entered in L1 is the correct value.

If you have already called the provideCT function, but the transaction failed in L2 and you paid in L1 but did not receive the money in L2, you can call the function in L2 again using reprovideCT.

And after providingCT is called, you cannot edit or cancel.

## Contract function

### L1CrossTradeContract

### `chainInfo`

Store information about chainId (onlyOwner)

**Parameters:**
- `_crossDomainMessenger`: crossDomainMessenger address for chainId
- `_l2CrossTrade`: L2CrossTradeProxy address for chainId
- `_legacyERC20`: legacyERC20 address for chainId
- `_l1legacyERC20`: l1legacyERC20 address for chainId
- `_l2chainId`: store chainId

```solidity
function chainInfo(
    address _crossDomainMessenger,
    address _l2CrossTrade,
    address _legacyERC20,
    address _l1legacyERC20,
    uint256 _l2chainId
)
    external
    onlyOwner
```


### `provideCT`

Provides information that matches the hash value requested in L2

**Parameters:**
- `_l1token`: Address of requested l1token
- `_l2token`: Address of requested l2token
- `_to`: requester's address
- `_totalAmount`: Total amount requested by l2
- `_fwAmount`: The amount the requester wants to receive in l1
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId
- `_minGasLimit`: minGasLimit
- `_hash`: Hash value generated upon request


```solidity
function provideCT(
    address _l1token,
    address _l2token,
    address _to,
    uint256 _totalAmount,
    uint256 _fwAmount,
    uint256 _salecount,
    uint256 _l2chainId,
    uint32 _minGasLimit,
    bytes32 _hash
)
    external
    payable
    nonReentrant
```

### `reprovideCT`

If provide is successful in L1 but the transaction fails in L2, this is a function that can recreate the transaction in L2.

**Parameters:**
- `_fwAmount`: The amount the requester wants to receive in l1
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId
- `_minGasLimit`: minGasLimit
- `_hash`: Hash value generated upon request

```solidity
function reprovideCT(
    uint256 _fwAmount,
    uint256 _salecount,
    uint256 _l2chainId,
    uint32 _minGasLimit,
    bytes32 _hash
)
    external
    nonReentrant
```

### `cancel`

Cancels the request requested by the requester.

**Parameters:**
- `_l1token`: Address of requested l1token
- `_l2token`: Address of requested l2token
- `_totalAmount`: Total amount requested by l2
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId
- `_minGasLimit`: minGasLimit
- `_hash`: Hash value generated upon request


```solidity
function cancel( 
    address _l1token,
    address _l2token,
    uint256 _totalAmount,
    uint256 _salecount,
    uint256 _l2chainId,
    uint32 _minGasLimit,
    bytes32 _hash
)
    external
    nonReentrant
```

### `resendCancel`

If the cancel function succeeds in L1 but fails in L2, this function calls the transaction in L2 again.


**Parameters:**
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId
- `_minGasLimit`: minGasLimit
- `_hash`: Hash value generated upon request


```solidity
function resendCancel(
    uint256 _salecount,
    uint256 _l2chainId,
    uint32 _minGasLimit,
    bytes32 _hash
)
    external
    nonReentrant
```

### `edit`

This is a function that changes the value that the requester wants to receive.

**Parameters:**
- `_l1token`: Address of requested l1token
- `_l2token`: Address of requested l2token
- `_totalAmount`: Total amount requested by l2
- `_fwAmount`: The amount the requester wants to receive in l1
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId
- `_hash`: Hash value generated upon request


```solidity
function edit(
    address _l1token,
    address _l2token,
    uint256 _totalAmount,
    uint256 _fwAmount,
    uint256 _salecount,
    uint256 _l2chainId,
    bytes32 _hash
)  
    external
    payable
    nonReentrant
```

### `getHash`

Create a Hash value and check if it matches the Hash value created upon request in L2.

**Parameters:**
- `_l1token`: Address of requested l1token
- `_l2token`: Address of requested l2token
- `_to`: This is the address of the request.
- `_totalAmount`: Total amount requested by l2
- `_salecount`: Number generated upon request
- `_l2chainId`: request requested chainId


```solidity
function getHash(
    address _l1token,
    address _l2token,
    address _to,
    uint256 _totalAmount,
    uint256 _saleCount,
    uint256 _l2chainId
)
    public
    view
    returns (bytes32)
```

### `makeEncodeWithSignature`

This is a function that creates encodeWithSignature according to each function.

**Parameters:**
- `number`: A number that determines what type of function to create
- `to`: This is the address of the request.
- `amount`: The amount the requester wants to receive in l1
- `saleCount`: Number generated upon request
- `byteValue`: Hash value generated upon request
- `_edit`: Check whether the edit function was executed


```solidity
function makeEncodeWithSignature(
    uint8 number,
    address to, 
    uint256 amount,
    uint256 saleCount,
    bytes32 byteValue,
    bool _edit
)
    public
    view
    returns (bytes memory)
```

### `_approve`

Function that returns the chainId of the current contract

**Parameters:**
- `_sender`: sender applying to provide
- `_l1token`: l1token address applying to provide
- `_fwAmount`: Amount provided

```solidity
function _approve(
    address _sender,
    address _l1token,
    uint256 _fwAmount
) 
    internal 
    view
```


### L2CrossTradeContract


# How to Test
1. Configure L1 and L2 using docker
2. Copy env.example to .env and set the contents
3. Change the contracts-bedrock/deployments value to suit the environment.
4. Change test/data/deployed.devnetL1.json value to suit the environment.
5. npx hardhat test test/0.FWbasicTest.ts --network devnetL1
6. npx harhdat test test/Available for testing from 1 to 8
