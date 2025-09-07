# Team Message: Cross-Trade Centralization Risk

## TL;DR
We've identified a critical centralization risk in our cross-trade system. **Providers are at risk if the L2 operator is malicious**, while requestors remain safe. This is inherent to L2-based cross-chain solutions.

## The Core Issue

### What Happens in Cross-Trade:
1. **Requestor** makes request on L2 → locks funds
2. **Provider** calls `provideCT()` on L1 → sends funds to requestor + sends message to L2
3. **Requestor** gets funds immediately (atomic transaction - SAFE)
4. **Provider** waits for message to be relayed to L2 to claim their funds

### The Risk:
- **Requestor**: Safe - gets funds immediately when provider calls `provideCT()`
- **Provider**: At Risk - depends on L2 operator to relay the message

### What Can Go Wrong:
If L2 operator is malicious or L2 chain is compromised:
- Message never gets relayed to L2
- Provider's funds remain locked in L2 contract
- Provider cannot claim their funds
- Requestor already has their funds (no risk)

## Why This Happens:
- Cross-trade security = L2 chain security
- If L2 operator is malicious, entire L2 chain is compromised
- Cross-trade becomes malicious by extension
- This is inherent to any L2-based cross-chain solution

## Current Mitigations:
1. **ResendProvideCT()** function - provider can retry (but still depends on L2 operator)
2. **Trust in L2 operator** - they stake TON tokens and have incentive to maintain integrity

## Proposed Solutions:
1. **Slashing Mechanism** (Recommended) - integrate with existing L2 operator slashing protocol
2. **Message Testing Function** - allow providers to test message relay before actual transaction
3. **Clear Disclaimers** - inform providers about the inherent risk

## Bottom Line:
- This is not a bug in our code - it's a fundamental limitation of L2 architectures
- Providers must trust the L2 operator, just like they trust any L2 chain
- The risk is similar to using any L2 chain or bridge
- We need to implement slashing mechanisms and provide clear risk disclosures

## Next Steps:
1. Discuss with Sunon about slashing mechanism integration
2. Implement message testing functions
3. Add clear disclaimers for providers
4. Prepare for external audit (they will likely raise this same issue)

**The cross-trade system provides value through fast cross-chain liquidity, but providers must accept the inherent risk of trusting the L2 operator.**





