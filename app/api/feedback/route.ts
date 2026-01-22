/**
 * ========================================
 * FEEDBACK API ROUTE
 * ========================================
 *
 * Endpoint voor het opslaan van gebruikersfeedback (thumbs up/down)
 * op chatbot antwoorden.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/shared/supabase/supabase-client';
import { DATABASE_CONFIG } from '@/lib/shared/supabase/config';

export async function POST(request: NextRequest) {
  console.log('👍 [Feedback API] Received feedback request');

  try {
    const body = await request.json();
    const { logId, feedback, comment } = body;

    console.log('📝 [Feedback API] Log ID:', logId);
    console.log('📝 [Feedback API] Feedback:', feedback);
    console.log('📝 [Feedback API] Comment:', comment || 'No comment');

    // Validatie
    if (!logId || !feedback) {
      console.error('❌ [Feedback API] Missing required fields');
      return NextResponse.json(
        { error: 'logId and feedback are required' },
        { status: 400 }
      );
    }

    if (!['positive', 'negative'].includes(feedback)) {
      console.error('❌ [Feedback API] Invalid feedback value:', feedback);
      return NextResponse.json(
        { error: 'feedback must be "positive" or "negative"' },
        { status: 400 }
      );
    }

    // Skip if Supabase is not configured
    if (!supabase) {
      console.warn('⚠️ [Feedback API] Supabase not configured');
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }

    // Update de feedback in de database
    const { data, error } = await supabase
      .from(DATABASE_CONFIG.tableName)
      .update({
        feedback: feedback,
        feedback_comment: comment || null,
        feedback_timestamp: new Date().toISOString(),
      })
      .eq('id', logId)
      .select();

    if (error) {
      console.error('❌ [Feedback API] Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save feedback', details: error.message },
        { status: 500 }
      );
    }

    if (!data || data.length === 0) {
      console.error('❌ [Feedback API] Log not found:', logId);
      return NextResponse.json(
        { error: 'Log entry not found' },
        { status: 404 }
      );
    }

    console.log('✅ [Feedback API] Feedback saved successfully');
    return NextResponse.json({
      success: true,
      message: 'Feedback saved successfully'
    });

  } catch (error: any) {
    console.error('❌ [Feedback API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
