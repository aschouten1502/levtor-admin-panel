/**
 * Add session_id column to request_logs table via raw SQL
 */

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://mfkgbznzhydpittwxwiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma2diem56aHlkcGl0dHd4d2lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3OTM1NywiZXhwIjoyMDc3MjU1MzU3fQ.Kn_UUKlb2h8b1McASlDLWKZBaVWwwWDmYl9IxKTR0kA';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🔧 Adding session_id column to request_logs table...\n');

async function executeMigration() {
  console.log('Step 1: Checking if session_id column exists...\n');

  // Use the REST API to execute raw SQL via a stored procedure
  // First, let's check if we can query the column (if it exists, query succeeds)
  const { data: checkData, error: checkError } = await supabase
    .from('request_logs')
    .select('session_id')
    .limit(0);

  if (checkError && checkError.message.includes('does not exist')) {
    console.log('   ⚠️  Column "session_id" does not exist yet\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('   MANUAL ACTION REQUIRED');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log('Please open your Supabase Dashboard SQL Editor and run:\n');
    console.log('🔗 https://supabase.com/dashboard/project/mfkgbznzhydpittwxwiq/sql/new\n');
    console.log('─'.repeat(60));
    console.log(`
-- Add session_id column to request_logs table
ALTER TABLE request_logs
ADD COLUMN IF NOT EXISTS session_id TEXT;

-- Add an index for better query performance
CREATE INDEX IF NOT EXISTS idx_request_logs_session_id
ON request_logs(session_id);

-- Add a comment to document the column
COMMENT ON COLUMN request_logs.session_id IS 'Unique identifier for grouping multiple requests in the same user session';
    `);
    console.log('─'.repeat(60));
    console.log('\n📋 After running the SQL, run this script again to verify\n');
    process.exit(0);
  } else if (checkError) {
    console.error('   ❌ Unexpected error:', checkError.message);
    process.exit(1);
  } else {
      console.log('   ✅ session_id column already exists!\n');

      // Test that it works by doing a test insert
      console.log('Step 2: Testing insert with session_id...');

      const testRecord = {
        session_id: 'test-' + Date.now(),
        timestamp: new Date().toISOString(),
        question: 'Test session_id migration',
        answer: 'This is a test to verify session_id column works',
        language: 'nl',
        response_time_seconds: 1.0,
        response_time_ms: 1000,
        pinecone_tokens: 50,
        pinecone_cost: 0.00025,
        openai_input_tokens: 100,
        openai_output_tokens: 75,
        openai_total_tokens: 175,
        openai_cost: 0.001,
        total_cost: 0.00125,
        snippets_used: 2,
        citations_count: 1,
        conversation_history_length: 1,
        blocked: false,
        event_type: 'chat_request'
      };

      const { data: insertData, error: insertError } = await supabase
        .from('request_logs')
        .insert([testRecord])
        .select();

      if (insertError) {
        console.error('   ❌ Insert test failed:', insertError.message);
        process.exit(1);
      }

      console.log('   ✅ Successfully inserted test record');
      console.log('   📝 Session ID:', testRecord.session_id);

      // Clean up test record
      if (insertData && insertData[0]?.id) {
        const { error: deleteError } = await supabase
          .from('request_logs')
          .delete()
          .eq('id', insertData[0].id);

        if (!deleteError) {
          console.log('   🧹 Test record cleaned up\n');
        }
      }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ Migration completed successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n✨ Your application can now track session_id in logs!\n');
  }
}

executeMigration();