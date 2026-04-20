# 🛡️ AI Smart Contract Auditor

A Next.js web application that uses Claude AI to perform security audits on Solidity smart contracts, following the **Trail of Bits Testing Handbook** methodology.

## ✨ Features

- **📤 Drag & Drop Upload**: Upload Solidity contracts and test files
- **🤖 AI-Powered Analysis**: Uses Claude for deep security analysis
- **📋 Professional Reports**: Generates two comprehensive audit reports:
  - `SECURITY_AUDIT_REPORT.md` - Executive summary for stakeholders
  - `VULNERABILITY_ANALYSIS.md` - Technical details for developers
- **👀 Live Preview**: View reports in rendered markdown or raw format
- **⬇️ Download**: Export reports as markdown files
- **🎨 Beautiful UI**: Modern, responsive design

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- An Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. **Install dependencies**:
   ```bash
   cd smart-contract-auditor
   npm install
   ```

2. **Configure your API key**:
   
   Create a `.env.local` file:
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` and add your Anthropic API key:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

3. **Start the development server**:
   ```bash
   npm run dev
   ```

4. **Open the app**:
   Visit [http://localhost:3000](http://localhost:3000)

## 📖 How to Use

1. **Upload Contracts**: Drag and drop your `.sol` files
2. **Add Tests (Optional)**: Upload test files for coverage analysis
3. **Describe Protocol (Optional)**: Add context about your protocol
4. **Click "Start Security Audit"**: AI analyzes your contracts
5. **Review Results**: View and download security reports

## 🔍 Audit Methodology

Follows **Trail of Bits Testing Handbook**, checking for:

- ✅ Access Control vulnerabilities
- ✅ Reentrancy issues
- ✅ Locked Ether problems
- ✅ Integer overflow/underflow
- ✅ Front-running vulnerabilities
- ✅ Input validation issues
- ✅ Proxy pattern safety

### Severity Classification

| Level | Emoji | Description |
|-------|-------|-------------|
| Critical | 🔴 | Complete loss of funds or control |
| High | 🟠 | Significant loss of funds or functionality |
| Medium | 🟡 | Limited loss or degraded functionality |
| Low | 🔵 | Minor issues, best practices |
| Info | ℹ️ | Code quality, gas optimization |

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **AI**: Anthropic Claude API
- **Icons**: Lucide React
- **Markdown**: react-markdown + remark-gfm

## 📁 Project Structure

```
smart-contract-auditor/
├── src/
│   ├── app/
│   │   ├── api/audit/route.ts  # Claude API endpoint
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Main audit form
│   │   └── globals.css
│   ├── components/
│   │   ├── Header.tsx
│   │   ├── FileUpload.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ReportPreview.tsx
│   └── lib/
│       ├── playbook.ts         # Audit methodology
│       └── types.ts
├── .env.example
└── package.json
```

## 🔧 Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

---

**⚠️ Disclaimer**: This tool provides AI-generated security analysis and should not replace professional security audits for production contracts.
