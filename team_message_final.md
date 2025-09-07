# Cross-Trade / L2-Chain Centralization Risk - Team Discussion

Hello Everyone,

After our internal audit discussion, we ended up with a critical risk in our cross-trade system. The security of cross-trade fundamentally relies on the security and trustworthiness of the L2 chain and the operator, creating a potential risk for providers (the actors that fulfill requests inside the Cross-Trade).

I'll describe everything here in a thread and also include the only possible solutions we can have. If you think about any other solution please share.

This is an issue that is not only valid for cross-trade but for the entire L2 chain and I know we have a slashing solution that is WIP and maybe we can apply that to the Cross-Trade as well.

---

## The Problem: Provider Risk in Cross-Trade Flow

### Normal Cross-Trade Flow:
```
1. Requestor makes request on L2
   ├── Locks funds in L2 contract
   └── Waits for provider to fulfill

2. Provider calls provideCT() on L1
   ├── Sends funds to requestor (atomic transaction)
   ├── Sends message to L2 via cross-domain messenger
   └── Requestor receives funds immediately
   - All in one transaction
   - At this point the requestor is safe, he received the funds, for him the flow ended

3. Message relay to L2
   ├── Cross-domain messenger relays message to L2
   └── L2 contract releases locked funds to provider
```

### The Risk Scenario:
```
Provider calls provideCT() on L1:
✅ Requestor gets funds (atomic - guaranteed)
✅ Message sent to L2 (atomic - guaranteed)
❌ Message relay to L2 (NOT guaranteed - depends on L2 operator)

If L2 operator is malicious or L2 chain is compromised:
- Message never gets relayed to L2
- Provider's funds remain locked in L2 contract
- Provider cannot claim their funds
- Requestor already has their funds (no risk to them)
```

## Key Points:

### 1. Requestor is Safe
- Requestor receives funds immediately when provider calls provideCT()
- This is an atomic transaction on L1
- No risk to requestor regardless of L2 status

### 2. Provider is at Risk
- Provider relies on L2 operator to relay the message
- If L2 operator is malicious, provider loses funds
- Provider has no recourse except resendProvideCT() function => he can try to resend the message again, that might work or not
- Even resendProvideCT() depends on L2 operator cooperation

### 3. The Problem
- Cross-trade security = L2 chain security
- If L2 operator is malicious, entire L2 chain is compromised
- Cross-trade becomes malicious by extension
- This is inherent to any L2-based cross-chain solution

## Current Mitigations:

### 1. ResendProvideCT() Function
- Provider can retry sending the message
- Multiple attempts possible
- But still depends on L2 operator

### 2. Trust in L2 Operator
- L2 operator stakes TON tokens
- Operator has incentive to maintain chain integrity

## Proposed Solutions:

### 1. Slashing Mechanism
- Integrate with existing L2 operator slashing protocol
- Allow providers to prove malicious behavior
- On-chain verification and automatic slashing
- Similar to Arbitrum's/OP challenge mechanism

### 2. Operator Bonding (Alternative)
- Require L2 operator to lock funds in L1 contract
- Providers can claim from bond if message relay fails
- But requires separate mechanism from general slashing

### 3. Message Testing Function
- Allow providers to test message relay before actual transaction
- Not 100% secure but provides additional confidence
- Simple implementation with view functions

## Risk Assessment:

### High Risk Scenarios:
- L2 operator becomes malicious
- L2 chain gets compromised
- Cross-domain messenger fails
- L2 chain goes offline

### Low Risk Scenarios:
- Temporary network congestion
- Gas price fluctuations
- Normal L2 operation delays

## Conclusion:

The centralization risk is inherent to L2-based cross-chain solutions. The provider must trust the L2 operator, just as they trust the L2 chain itself. This is not unique to our cross-trade system - it's a fundamental limitation of current L2 architectures.

**The cross-trade system provides value through fast cross-chain liquidity, but providers must accept the inherent risk of trusting the L2 operator.**

## Important Note:
This is a critical risk but doesn't have to be implemented immediately. The provider can take the risk to provide (of course they are not taking the risk for free, they are taking the risk for a profit, they get a fee for fulfilling the requests.). If they take the risk to use the L2 chain, then they can take the risk to use the cross-trade because their security are dependent on each other.

Please share your thoughts and any additional solutions you might have!
