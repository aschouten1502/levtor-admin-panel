/**
 * API Route: Extract Branding from URL
 *
 * POST /api/admin/branding/extract-from-url
 *
 * Extracts branding information (colors, logo, company name) from a website URL.
 */

import { NextRequest, NextResponse } from 'next/server';
import { extractBrandingFromUrl } from '@/lib/admin/url-extractor';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    // Validate URL
    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    // Basic URL validation
    const urlPattern = /^(https?:\/\/)?[\w.-]+\.[a-z]{2,}(\/.*)?$/i;
    if (!urlPattern.test(url.trim())) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      );
    }

    console.log(`🌐 [API] Extracting branding from: ${url}`);

    // Extract branding
    const result = await extractBrandingFromUrl(url);

    // Check if we got ANY useful data
    const hasAnyData = result.extracted.name ||
                       result.extracted.primary_color ||
                       result.extracted.logo_url ||
                       result.extracted.favicon_url;

    if (!result.success && !hasAnyData) {
      // Complete failure - couldn't fetch or parse at all
      console.error(`❌ [API] Extraction completely failed:`, result.errors);
      return NextResponse.json(
        {
          error: 'Failed to extract branding',
          error_type: result.error_type,
          details: result.errors,
          extracted: result.extracted,
        },
        { status: 422 }
      );
    }

    // Log what we found (even if partial)
    console.log(`✅ [API] Branding extracted:`, {
      name: result.extracted.name,
      primary_color: result.extracted.primary_color,
      has_logo: !!result.extracted.logo_url,
      has_favicon: !!result.extracted.favicon_url,
      partial: !result.success,
    });

    // Return success even with partial data
    return NextResponse.json({
      success: true,
      partial: !result.success, // Indicate if some extraction failed
      extracted: result.extracted,
      source_url: result.source_url,
      warnings: result.errors.length > 0 ? result.errors : undefined,
    });

  } catch (error: any) {
    console.error(`❌ [API] Error in extract-from-url:`, error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
