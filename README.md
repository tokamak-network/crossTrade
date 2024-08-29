# CrossTrade
Cross Trade is a new core service for optimistic rollups that complements standard withdrawals and fast withdrawals. Requester requests to cross trade their L2 assets with L1 assets and provider provides their L1 asset to the requester and is paid back on L2. 

# How to Test
1. Configure L1 and L2 using docker
2. Copy env.example to .env and set the contents
3. Change the contracts-bedrock/deployments value to suit the environment.
4. Change test/data/deployed.devnetL1.json value to suit the environment.
5. npx hardhat test test/0.FWbasicTest.ts --network devnetL1
6. npx harhdat test test/Available for testing from 1 to 8
