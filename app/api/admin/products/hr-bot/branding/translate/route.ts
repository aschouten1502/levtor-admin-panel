/**
 * ========================================
 * ADMIN BRANDING API - Translate UI Texts
 * ========================================
 * POST /api/admin/branding/translate - Vertaal Nederlandse teksten naar 11 talen
 */

import { NextRequest, NextResponse } from 'next/server';
import { translateUITexts, retranslateLanguage, LanguageCode } from '@/lib/admin/translation-service';
import { LanguageTexts } from '@/lib/admin/branding-types';

/**
 * POST /api/admin/branding/translate
 * Vertaal Nederlandse UI teksten naar alle ondersteunde talen
 *
 * Body:
 * {
 *   dutchTexts: LanguageTexts,    // Nederlandse bronteksten
 *   targetLanguage?: string       // Optioneel: vertaal alleen naar deze taal
 * }
 */
export async function POST(request: NextRequest) {
  try {
    console.log('🌍 [API] POST /api/admin/branding/translate');

    const body = await request.json();
    const { dutchTexts, targetLanguage } = body as {
      dutchTexts: LanguageTexts;
      targetLanguage?: LanguageCode;
    };

    // Validatie
    if (!dutchTexts) {
      return NextResponse.json(
        { error: 'Missing required field: dutchTexts' },
        { status: 400 }
      );
    }

    // Valideer dat alle vereiste velden aanwezig zijn
    const requiredFields = [
      'appTitle', 'appSubtitle', 'welcomeTitle', 'welcomeSubtitle',
      'languageHint', 'exampleLabel', 'examples', 'inputPlaceholder',
      'citationsLabel', 'pageLabel', 'viewButton'
    ];

    for (const field of requiredFields) {
      if (!(field in dutchTexts)) {
        return NextResponse.json(
          { error: `Missing required text field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Valideer examples array
    if (!Array.isArray(dutchTexts.examples) || dutchTexts.examples.length !== 4) {
      return NextResponse.json(
        { error: 'examples must be an array with exactly 4 items' },
        { status: 400 }
      );
    }

    let result;

    if (targetLanguage) {
      // Vertaal alleen naar één specifieke taal
      console.log(`🌍 [API] Translating to single language: ${targetLanguage}`);
      const translated = await retranslateLanguage(dutchTexts, targetLanguage);
      result = { [targetLanguage]: translated };
    } else {
      // Vertaal naar alle talen
      console.log('🌍 [API] Translating to all 11 languages');
      result = await translateUITexts(dutchTexts);
    }

    console.log('✅ [API] Translation complete');
    return NextResponse.json({ translations: result });

  } catch (error) {
    console.error('❌ [API] Error translating texts:', error);
    return NextResponse.json(
      { error: 'Failed to translate texts', details: (error as Error).message },
      { status: 500 }
    );
  }
}
