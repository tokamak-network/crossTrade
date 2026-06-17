import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import OpenAI from 'openai';
import { SYSTEM_PROMPT } from '@/lib/playbook';
import { AuditRequest } from '@/lib/types';

// ============================================================================
// CONFIGURATION - SUPPORTS BOTH ANTHROPIC AND OPENAI
// ============================================================================
// Set ONE of these API keys in your .env.local file:
//
//   ANTHROPIC_API_KEY=sk-ant-api03-...  (for Claude)
//   OPENAI_API_KEY=sk-...               (for GPT-4)
//
// The app will automatically use whichever key is available.
// If both are set, it will prefer Anthropic (Claude).
// ============================================================================

type AIProvider = 'anthropic' | 'openai';

function getProvider(requestedProvider?: string): { provider: AIProvider; apiKey: string } {
  // If user requested a specific provider, try to use it
  if (requestedProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (requestedProvider === 'openai' && process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }
  
  // Otherwise, auto-detect available provider
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: 'anthropic', apiKey: process.env.ANTHROPIC_API_KEY };
  }
  if (process.env.OPENAI_API_KEY) {
    return { provider: 'openai', apiKey: process.env.OPENAI_API_KEY };
  }
  throw new Error('No API key configured. Please add ANTHROPIC_API_KEY or OPENAI_API_KEY to .env.local');
}

async function callAnthropic(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  
  const message = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 16000,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  return message.content[0].type === 'text' ? message.content[0].text : '';
}

async function callOpenAI(apiKey: string, systemPrompt: string, userMessage: string): Promise<string> {
  const openai = new OpenAI({ apiKey });
  
  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',  // or 'gpt-4-turbo' or 'gpt-4'
    max_tokens: 16000,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  return completion.choices[0]?.message?.content || '';
}

export async function POST(request: NextRequest) {
  try {
    const body: AuditRequest & { provider?: string } = await request.json();
    const { contracts, tests, protocolDescription, provider: requestedProvider } = body;

    const { provider, apiKey } = getProvider(requestedProvider);
    console.log(`Using AI provider: ${provider}`);

    if (!contracts || contracts.length === 0) {
      return NextResponse.json(
        { error: 'At least one contract is required' },
        { status: 400 }
      );
    }

    // Build the user message with all contracts and context
    let userMessage = '# Smart Contract Security Audit Request\n\n';

    if (protocolDescription) {
      userMessage += '## Protocol Description\n';
      userMessage += protocolDescription + '\n\n';
    }

    userMessage += '## Contracts to Audit\n\n';
    for (const contract of contracts) {
      userMessage += `### ${contract.name}\n`;
      userMessage += '```solidity\n';
      userMessage += contract.content;
      userMessage += '\n```\n\n';
    }

    if (tests && tests.length > 0) {
      userMessage += '## Test Files (for coverage analysis)\n\n';
      for (const test of tests) {
        userMessage += `### ${test.name}\n`;
        userMessage += '```solidity\n';
        userMessage += test.content;
        userMessage += '\n```\n\n';
      }
    }

    userMessage += '## Instructions\n';
    userMessage += 'Please analyze these contracts following the Trail of Bits methodology and generate:\n';
    userMessage += '1. SECURITY_AUDIT_REPORT.md - Executive summary with findings\n';
    userMessage += '2. VULNERABILITY_ANALYSIS.md - Technical details with Before/After code\n';
    userMessage += '\nRespond with valid JSON containing both reports.';

    // Call the appropriate AI provider
    let responseText: string;
    if (provider === 'anthropic') {
      responseText = await callAnthropic(apiKey, SYSTEM_PROMPT, userMessage);
    } else {
      responseText = await callOpenAI(apiKey, SYSTEM_PROMPT, userMessage);
    }

    // Parse the JSON response
    let parsedResponse;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      console.error('Raw response:', responseText);
      
      return NextResponse.json({
        securityReport: `# Security Audit Report\n\n## Error\n\nFailed to parse AI response. Raw output:\n\n${responseText.substring(0, 5000)}`,
        vulnerabilityAnalysis: `# Vulnerability Analysis\n\n## Error\n\nParsing failed. Please try again.`,
      });
    }

    return NextResponse.json({
      securityReport: parsedResponse.securityReport || '# No security report generated',
      vulnerabilityAnalysis: parsedResponse.vulnerabilityAnalysis || '# No vulnerability analysis generated',
    });

  } catch (error) {
    console.error('Audit API error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return NextResponse.json(
      { error: `Audit failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}
