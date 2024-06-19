# CrossTrade
[Contract Composition](https://viewer.diagrams.net/?tags=%7B%7D#G1xUNgKjUPN_JHC7JbFmRUcwzWW6Crd4PQ)


This is a contract that utilizes standardBridge to enable fast trade through messages rather than time-consuming transactions.

# How to Test
1. Configure L1 and L2 using docker
2. Copy env.example to .env and set the contents
3. Change the contracts-bedrock/deployments value to suit the environment.
4. Change test/data/deployed.devnetL1.json value to suit the environment.
5. npx hardhat test test/0.FWbasicTest.ts --network devnetL1
6. npx harhdat test test/Available for testing from 1 to 8
