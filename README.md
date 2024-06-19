# CrossTrade
[Contract Composition](https://viewer.diagrams.net/?tags=%7B%7D#G1xUNgKjUPN_JHC7JbFmRUcwzWW6Crd4PQ)

It consists of a CrossTrade-related proxy and logic contract in L1, and a CrossTrade-related proxy and logic contract in L2.

CrossTrade requests can be made in L2, and editing, canceling, and providing can only be done in L1.

One thing to note is that L1 cannot check the information in L2.
So, when creating a transaction in L1, the hash value generated in L2 is also included and goes through a process to check whether the information entered in L1 is the correct value.

If you have already called the provideCT function, but the transaction failed in L2 and you paid in L1 but did not receive the money in L2, you can call the function in L2 again using reprovideCT.

And after providingCT is called, you cannot edit or cancel.

## Contract function

## OnlyOwner

### L1CrossTradeContract

### `chainInfo`

Store information about chainId

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
{
```


# How to Test
1. Configure L1 and L2 using docker
2. Copy env.example to .env and set the contents
3. Change the contracts-bedrock/deployments value to suit the environment.
4. Change test/data/deployed.devnetL1.json value to suit the environment.
5. npx hardhat test test/0.FWbasicTest.ts --network devnetL1
6. npx harhdat test test/Available for testing from 1 to 8
