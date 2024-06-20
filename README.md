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

### `initialize`

L2CrossTrade initial settings (onlyOwner)

**Parameters:**
- `_crossDomainMessenger`: crossDomainMessenger address for chainId
- `_legacyERC20`: legacyERC20 address for chainId

```solidity
function initialize(
    address _crossDomainMessenger,
    address _legacyERC20
)
    external
    onlyOwner
```

### `chainInfo`

Store addresses for chainId (onlyOwner)

**Parameters:**
- `_l1CrossTrade`: L1CrossTradeProxy address for chainId
- `_l1legacyERC20`: l1legacyERC20 address for chainId
- `_chainId`: store chainId

```solidity
function chainInfo(
    address _l1CrossTrade,
    address _l1legacyERC20,
    uint256 _chainId
)
    external
    onlyOwner
```

### `registerToken`

Register L1token and L2token and use them in requestRegisteredToken (onlyOwner)

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_l1chainId`: store chainId

```solidity
function registerToken(
    address _l1token,
    address _l2token,
    uint256 _l1chainId
)
    external
    onlyOwner
```

### `deleteToken`

Function to delete registered token (onlyOwner)

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_l1chainId`: chainId of l1token

```solidity
function deleteToken(
    address _l1token,
    address _l2token,
    uint256 _l1chainId
)
    external
    onlyOwner
```

### `requestRegisteredToken`

Token transaction request registered in register

**Parameters:**
- `_l2token`: l2token Address
- `_totalAmount`: Amount provided to L2
- `_fwAmount`: Amount to be received from L1
- `_l1chainId`: chainId of l1token

```solidity
function requestRegisteredToken(
    address _l2token,
    uint256 _totalAmount,
    uint256 _fwAmount,
    uint256 _l1chainId
)
    external
    payable
    nonReentrant
```

### `requestNonRegisteredToken`

Token transaction request not registered in register

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_totalAmount`: Amount provided to L2
- `_fwAmount`: Amount to be received from L1
- `_l1chainId`: chainId of l1token

```solidity
function requestNonRegisteredToken(
    address _l2token,
    uint256 _totalAmount,
    uint256 _fwAmount,
    uint256 _l1chainId
)
    external
    payable
    nonReentrant
```

### `claimCT`

When providing a function called from L1, the amount is given to the provider.

**Parameters:**
- `_from`: provider Address
- `_amount`: Amount paid by L1
- `_saleCount`: Number generated upon request
- `_chainId`: chainId of l1token
- `_hash`: Hash value generated upon request
- `_edit`: Whether edit was executed in L1


```solidity
function claimCT(
    address _from,
    uint256 _amount,
    uint256 _saleCount,
    uint256 _chainId,
    bytes32 _hash,
    bool _edit
)
    external
    payable
    nonReentrant
    checkL1(_chainId)
    providerCheck(_saleCount)
```

### `cancelCT`

When canceling a function called from L1, the amount is given to the requester.

**Parameters:**
- `_msgSender`: Address where cancellation was requested
- `_saleCount`: Number generated upon request
- `_chainId`: chainId of l1token

```solidity
function cancelCT(
    address _msgSender,
    uint256 _salecount,
    uint256 _chainId
)
    external
    payable
    nonReentrant
    checkL1(_chainId)
    providerCheck(_salecount)
```


### `getHash`

Function that calculates hash value in L2CrossTradeContract

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_to`: requester's address
- `_totalAmount`: Amount provided to L2
- `_saleCount`: Number generated upon request
- `_l1chainId`: chainId of l1token

```solidity
function getHash(
    address _l1token,
    address _l2token,
    address _to,
    uint256 _totalAmount,
    uint256 _saleCount,
    uint256 _l1chainId
)
    public
    view
    returns (bytes32)
```

### `getEnterHash`

Function to calculate l1token, l2token register hash value

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_l1chainId`: chainId of l1token

```solidity
function getEnterHash(
    address _l1token,
    address _l2token,
    uint256 _l1chainId
)
    public
    pure
    returns (bytes32)
```

### `_approve`

Function to check approve

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

### `_request`

Token transaction request not registered in register

**Parameters:**
- `_l1token`: l1token Address
- `_l2token`: l2token Address
- `_fwAmount`: Amount to be received from L1
- `_totalAmount`: Amount provided to L2
- `_saleCount`: Number generated upon request
- `_l1chainId`: chainId of l1token

```solidity
function _request(
    address _l1token,
    address _l2token,
    uint256 _fwAmount,
    uint256 _totalAmount,
    uint256 _saleCount,
    uint256 _l1chainId
)
    internal
```


## How to Test
1. **docker environment configuration**
    - git clone https://github.com/tokamak-network/tokamak-thanos/tree/OR-1257-Update-smart-contracts-for-deposit-TON-in-L1 
    - make build
    - make devnet-up
    - Check execution results
    - (https://file.notion.so/f/f/64903c51-687e-448d-8297-662b977d8aa9/d65e1b5d-924b-4aba-91ab-85297abc3046/Untitled.png?id=c806c744-254c-4a58-8dfc-18450dba3631&table=block&spaceId=64903c51-687e-448d-8297-662b977d8aa9&expirationTimestamp=1719014400000&signature=ieKqSfeHBeVEIsjr1XhjGlg3hQ-9MCb4ze-fuhMiM7M&downloadName=Untitled.png)

2. **crossTrade Test**
    - git clone https://github.com/tokamak-network/crossTrade/tree/2nd_Audit 
    - .env.example copy .env and setting
    - update json
    ```solidity
    #tokamak-thanos git
    tokamak/contracts-bedrock/deployments folder copy

    #crossTrade git
    contracts-bedrock/deployments folder paste

    #tokamak-thanos git
    tokamak/contracts-bedrock/deployments/devnetL1/.deploy contents of the file copy

    #crossTrade git
    test/data/deployed.devnetL1.json contents of the file paste
    ```
    - start the test
    ```solidity
    # get L1 ETH
    cast send --from 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 --rpc-url http://127.0.0.1:8545 --unlocked --value 9ether YOUR_PUBLICKEY
    cast send --from 0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266 --rpc-url http://127.0.0.1:8545 --unlocked --value 9ether YOUR_PUBLICKEY2

    # run test
    # 0. request, provide, reprovide test
    npx hardhat test test/addTest/0.reprovideCrossTradeTest.ts --network devnetL1 

    # 1. request, edit, provide test
    npx hardhat test test/addTest/1.EditingCrossTradeTest.ts --network devnetL1 

    # 2. registerToken, requestEnterToken, provide, deleteToken test
    npx hardhat test test/addTest/2.MappingCrossTradeTest.ts --network devnetL1

    ```