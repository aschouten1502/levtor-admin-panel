/**
 * ========================================
 * ADMIN BRANDING API - Extract Fun Facts from PDF
 * ========================================
 * POST /api/admin/branding/extract-facts - Extract fun facts uit een PDF
 *
 * v2.4: Added cost logging to branding_logs table
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractFunFactsFromText } from '@/lib/admin/translation-service';
import {
  logBrandingOperation,
  estimateTokens,
  calculateGPT4oCost
} from '@/lib/admin/branding-service';
// Note: We use pdf-parse which is already installed for RAG processing
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require('pdf-parse');

/**
 * POST /api/admin/branding/extract-facts
 * Extract fun facts uit een geüpload PDF document
 *
 * Body: FormData with 'file' and 'tenant_id' fields
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    console.log('📄 [API] POST /api/admin/branding/extract-facts');

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tenantId = formData.get('tenant_id') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a PDF file.' },
        { status: 400 }
      );
    }

    if (!tenantId) {
      return NextResponse.json(
        { error: 'No tenant_id provided.' },
        { status: 400 }
      );
    }

    // Valideer bestandstype
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      return NextResponse.json(
        { error: 'Invalid file type. Only PDF files are supported.' },
        { status: 400 }
      );
    }

    // Valideer bestandsgrootte (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 10MB.' },
        { status: 400 }
      );
    }

    console.log(`📄 [API] Processing PDF: ${file.name} (${Math.round(file.size / 1024)}KB)`);

    // Lees PDF content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let pdfText: string;
    try {
      const pdfData = await pdfParse(buffer);
      pdfText = pdfData.text;
    } catch (parseError) {
      console.error('❌ [API] Failed to parse PDF:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse PDF file. Please ensure the file is not corrupted.' },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 100) {
      return NextResponse.json(
        { error: 'PDF contains too little text. Please upload a document with more content.' },
        { status: 400 }
      );
    }

    console.log(`📄 [API] Extracted ${pdfText.length} characters from PDF`);

    // Extract fun facts met OpenAI
    const facts = await extractFunFactsFromText(pdfText);

    // Calculate costs - max 10KB text is sent to OpenAI
    const truncatedText = pdfText.substring(0, 10000);
    const inputTokens = estimateTokens(truncatedText) + 200; // +200 for system prompt
    const outputTokens = estimateTokens(JSON.stringify(facts));
    const costUsd = calculateGPT4oCost(inputTokens, outputTokens);
    const durationMs = Date.now() - startTime;

    // Log the operation for cost tracking (v2.4)
    await logBrandingOperation({
      tenantId,
      operationType: 'fun_facts',
      sourceFile: file.name,
      inputTokens,
      outputTokens,
      costUsd,
      extractedData: { facts, facts_count: facts.length },
      durationMs,
      success: facts.length > 0,
    });

    if (facts.length === 0) {
      return NextResponse.json(
        {
          error: 'Could not extract any fun facts from this document. Try a document with more company information.',
          facts: [],
          cost: costUsd
        },
        { status: 200 }
      );
    }

    console.log(`✅ [API] Extracted ${facts.length} fun facts (cost: $${costUsd.toFixed(6)})`);
    return NextResponse.json({
      facts,
      message: `Successfully extracted ${facts.length} fun facts from the document.`,
      cost: costUsd
    });

  } catch (error) {
    console.error('❌ [API] Error extracting fun facts:', error);
    return NextResponse.json(
      { error: 'Failed to extract fun facts', details: (error as Error).message },
      { status: 500 }
    );
  }
}
