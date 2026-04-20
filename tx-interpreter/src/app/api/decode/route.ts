// ============================================================================
// API Route — POST /api/decode
// Fetches transaction trace and runs AI interpretation
// ============================================================================

import { NextRequest, NextResponse } from "next/server";
import { fetchTransactionTrace } from "@/lib/blockchain";
import { interpretTransaction } from "@/lib/ai-service";
import { DecodeRequest, DecodeResponse } from "@/lib/types";
import { isValidTxHash } from "@/lib/utils";
import { SUPPORTED_CHAINS, AI_MODELS } from "@/lib/constants";

export async function POST(request: NextRequest) {
  try {
    const body: DecodeRequest = await request.json();
    const { txHash, chainId, aiModel } = body;

    // Validation
    if (!txHash || !isValidTxHash(txHash)) {
      return NextResponse.json<DecodeResponse>(
        {
          success: false,
          trace: null,
          interpretation: null,
          error: "Invalid transaction hash. Must be a 66-character hex string starting with 0x.",
        },
        { status: 400 }
      );
    }

    if (!chainId || !SUPPORTED_CHAINS.find((c) => c.id === chainId)) {
      return NextResponse.json<DecodeResponse>(
        {
          success: false,
          trace: null,
          interpretation: null,
          error: `Unsupported chain. Supported: ${SUPPORTED_CHAINS.map((c) => c.id).join(", ")}`,
        },
        { status: 400 }
      );
    }

    if (!aiModel || !AI_MODELS.find((m) => m.id === aiModel)) {
      return NextResponse.json<DecodeResponse>(
        {
          success: false,
          trace: null,
          interpretation: null,
          error: `Unknown AI model. Available: ${AI_MODELS.map((m) => m.id).join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Step 1: Fetch transaction trace
    const trace = await fetchTransactionTrace(txHash, chainId);

    // Step 2: Run AI interpretation
    const interpretation = await interpretTransaction(trace, aiModel);

    // Strip ABIs from response (too large for client)
    const cleanTrace = {
      ...trace,
      contracts: trace.contracts.map((c) => ({
        ...c,
        abi: null,
      })),
    };

    return NextResponse.json<DecodeResponse>({
      success: true,
      trace: cleanTrace,
      interpretation,
      error: null,
    });
  } catch (error) {
    console.error("Decode error:", error);

    const message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json<DecodeResponse>(
      {
        success: false,
        trace: null,
        interpretation: null,
        error: message,
      },
      { status: 500 }
    );
  }
}
