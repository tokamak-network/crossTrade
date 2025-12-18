# Request Pool Tooltips

## Page Elements Tooltips

### **Page Title: "Cross Trade Requests"**
**Tooltip**: "View all pending cross-chain trade requests. Provide liquidity on L1 to earn fees and receive tokens on L2."

### **Page Subtitle**
**Tooltip**: "When you provide liquidity, you send tokens on L1 (Ethereum) and receive the requester's tokens plus a service fee on L2."

---

## Table Header Tooltips

### **Token Column**
**Tooltip**: "The token type being traded. This shows what token you'll provide on L1 and receive on L2."

### **Provide On Column** 
**Tooltip**: "Amount you need to provide on L1 (Ethereum). This is the amount you'll send from your L1 wallet."

### **Reward On Column**
**Tooltip**: "Amount you'll receive on L2, including your profit margin. The green percentage shows your profit from the service fee."

### **Request On Column**
**Tooltip**: "Total amount the requester is offering on L2. This includes both your reward and the service fee."

### **Action Column (Provide Button)**
**Tooltip**: "Click to provide liquidity for this request. You'll send tokens on L1 and receive more tokens on L2."

---

## Filter Controls Tooltips

### **Token Filter - ALL**
**Tooltip**: "Show requests for all token types"

### **Token Filter - USDC**
**Tooltip**: "Show only USDC trading requests"

### **Token Filter - USDT** 
**Tooltip**: "Show only USDT trading requests"

### **Token Filter - ETH**
**Tooltip**: "Show only ETH trading requests"

### **Token Filter - TON**
**Tooltip**: "Show only TON trading requests"

### **Reward On Filter - All**
**Tooltip**: "Show requests for all destination chains"

### **Reward On Filter - Thanos**
**Tooltip**: "Show requests where you'll receive rewards on Thanos Sepolia"

### **Reward On Filter - Optimism**
**Tooltip**: "Show requests where you'll receive rewards on Optimism"

### **Reward On Filter - Monica**
**Tooltip**: "Show requests where you'll receive rewards on Monica Chain"

---

## Status Indicators Tooltips

### **Profit Badge (Green %)**
**Tooltip**: "Your profit percentage from the service fee. This is how much extra you earn compared to what you provide."

### **Chain Icons**
**Tooltip**: 
- 🔵 "Thanos Sepolia"
- 🔴 "Optimism" 
- 🟢 "Monica Chain"
- ⚪ "Ethereum"
- 🟣 "George Chain"

### **Token Icons**
**Tooltip**:
- 🔵 "USDC - USD Coin"
- 🟢 "USDT - Tether USD"
- ⚪ "ETH - Ethereum"
- 💎 "TON - Tokamak Network Token"

---

## Action Buttons Tooltips

### **Refresh Button**
**Tooltip**: "Refresh the list to check for new requests and updated statuses"

### **Full Refresh Button**
**Tooltip**: "Force refresh all data, including previously fulfilled requests (slower but more thorough)"

### **Provide Button**
**Tooltip**: "Start the process to provide liquidity for this cross-trade request. You'll review details before confirming."

---

## Advanced Tooltips (Technical Details)

### **Request ID/Sale Count**
**Tooltip**: "Unique identifier for this cross-trade request. Used to track the transaction across chains."

### **Hash Value**
**Tooltip**: "Cryptographic hash that ensures the integrity of the cross-trade request parameters."

### **Gas Limit**
**Tooltip**: "Minimum gas required for the cross-chain message. Higher values increase success probability but cost more."

---

## Risk/Warning Tooltips

### **General Risk Warning**
**Tooltip**: "⚠️ Cross-chain trades involve risks: message delays, network congestion, or technical failures could temporarily lock funds. Only provide liquidity you can afford to have temporarily inaccessible."

### **Message Failure Warning**
**Tooltip**: "⚠️ If the cross-chain message fails, your funds may be temporarily locked. Use the 'Resend Message' feature or contact support if this occurs."

### **Slippage Warning**
**Tooltip**: "⚠️ Token prices may change between request creation and fulfillment. Check current market rates before providing."

---

## Success/Completion Tooltips

### **Transaction Success**
**Tooltip**: "✅ Transaction successful! Your tokens have been sent on L1. You'll receive your reward on L2 once the cross-chain message is processed."

### **Claim Success**
**Tooltip**: "✅ Cross-trade completed! You've received your tokens plus service fee on L2."

---

## Loading States Tooltips

### **Loading Requests**
**Tooltip**: "Fetching the latest cross-trade requests from the blockchain..."

### **Processing Transaction**
**Tooltip**: "Your transaction is being processed. This may take a few minutes for cross-chain confirmation."

---

## Empty States Tooltips

### **No Requests**
**Tooltip**: "No pending cross-trade requests found. Check back later or create your own request."

### **No Matching Filters**
**Tooltip**: "No requests match your current filters. Try adjusting the token type or destination chain filters."

---

## Technical Implementation Notes for Developers

```typescript
// Example tooltip implementation
const tooltips = {
  tokenColumn: "The token type being traded. This shows what token you'll provide on L1 and receive on L2.",
  provideColumn: "Amount you need to provide on L1 (Ethereum). This is the amount you'll send from your L1 wallet.",
  rewardColumn: "Amount you'll receive on L2, including your profit margin. The green percentage shows your profit from the service fee.",
  provideButton: "Click to provide liquidity for this request. You'll send tokens on L1 and receive more tokens on L2.",
  riskWarning: "⚠️ Cross-chain trades involve risks: message delays, network congestion, or technical failures could temporarily lock funds."
}
```

## Priority Tooltips (Most Important)

1. **Provide Button** - Users need to understand what happens when they click
2. **Profit Badge** - Users want to understand their earnings
3. **Risk Warning** - Critical for user safety
4. **Provide/Reward Amounts** - Core functionality explanation
5. **Chain Information** - Users need to know where funds go

These tooltips will help users understand the cross-chain trading process and make informed decisions about providing liquidity.






