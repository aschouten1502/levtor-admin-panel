/**
 * Test script for Supabase MCP integration
 * This script tests the connection to Supabase and verifies the database schema
 */

const { createClient } = require('@supabase/supabase-js');

// Hardcoded credentials from .env.local (for testing purposes)
const supabaseUrl = 'https://mfkgbznzhydpittwxwiq.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ma2diem56aHlkcGl0dHd4d2lxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MTY3OTM1NywiZXhwIjoyMDc3MjU1MzU3fQ.Kn_UUKlb2h8b1McASlDLWKZBaVWwwWDmYl9IxKTR0kA';

console.log('🧪 Testing Supabase MCP Connection...\n');
console.log('📍 Supabase URL:', supabaseUrl);
console.log('🔑 Service Key:', supabaseKey ? '✅ Found' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log('1️⃣ Testing database connection...');

  try {
    // Test 1: Check connection with a simple query
    const { data, error } = await supabase
      .from('request_logs')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Database connection successful!\n');
    return true;
  } catch (err) {
    console.error('❌ Connection error:', err.message);
    return false;
  }
}

async function testTableExists() {
  console.log('2️⃣ Checking database tables...');

  const tables = [
    'request_logs',
    'organizations',
    'subscriptions',
    'user_profiles',
    'api_keys',
    'documents',
    'feedback',
    'usage_metrics',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);

      if (error) {
        if (error.message.includes('does not exist')) {
          console.log(`   ⚠️  Table "${table}" does not exist (needs migration)`);
        } else {
          console.log(`   ❌ Error checking "${table}":`, error.message);
        }
      } else {
        console.log(`   ✅ Table "${table}" exists`);
      }
    } catch (err) {
      console.log(`   ❌ Error checking "${table}":`, err.message);
    }
  }
  console.log('');
}

async function testRequestLogs() {
  console.log('3️⃣ Testing request_logs table...');

  try {
    const { data, error, count } = await supabase
      .from('request_logs')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('   ❌ Failed to query request_logs:', error.message);
      return;
    }

    console.log(`   ✅ Found ${count || 0} request logs in database`);

    // Get recent logs
    const { data: recentLogs, error: recentError } = await supabase
      .from('request_logs')
      .select('timestamp, question, response_time_ms, total_cost')
      .order('timestamp', { ascending: false })
      .limit(5);

    if (recentError) {
      console.error('   ❌ Failed to fetch recent logs:', recentError.message);
      return;
    }

    if (recentLogs && recentLogs.length > 0) {
      console.log(`\n   📊 Recent requests (last ${recentLogs.length}):`);
      recentLogs.forEach((log, i) => {
        console.log(`      ${i + 1}. ${new Date(log.timestamp).toLocaleString()}`);
        console.log(`         Q: ${log.question?.substring(0, 60)}...`);
        console.log(`         ⏱️  ${log.response_time_ms}ms | 💰 €${log.total_cost?.toFixed(4) || '0.0000'}`);
      });
    }
    console.log('');
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
}

async function testInsert() {
  console.log('4️⃣ Testing database write (insert test record)...');

  try {
    const testRecord = {
      timestamp: new Date().toISOString(),
      question: 'Test question from Supabase MCP test script',
      answer: 'Test answer',
      language: 'en',
      response_time_seconds: 1.5,
      response_time_ms: 1500,
      pinecone_tokens: 100,
      pinecone_cost: 0.0005,
      openai_input_tokens: 200,
      openai_output_tokens: 150,
      openai_total_tokens: 350,
      openai_cost: 0.0018,
      total_cost: 0.0023,
      snippets_used: 3,
      citations_count: 2,
      conversation_history_length: 1,
      blocked: false,
      event_type: 'mcp_test'
    };

    const { data, error } = await supabase
      .from('request_logs')
      .insert([testRecord])
      .select();

    if (error) {
      console.error('   ❌ Insert failed:', error.message);
      return;
    }

    console.log('   ✅ Successfully inserted test record');
    console.log('   📝 Record ID:', data[0]?.id);

    // Clean up test record
    if (data[0]?.id) {
      const { error: deleteError } = await supabase
        .from('request_logs')
        .delete()
        .eq('id', data[0].id);

      if (!deleteError) {
        console.log('   🧹 Test record cleaned up');
      }
    }
    console.log('');
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
}

async function testMigrationStatus() {
  console.log('5️⃣ Checking migration status...');

  try {
    // Check if organizations table exists (from migration 001)
    const { data: orgs, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, slug, subscription_tier')
      .limit(5);

    if (orgError) {
      if (orgError.message.includes('does not exist')) {
        console.log('   ⚠️  Multi-tenant migrations NOT yet applied');
        console.log('   💡 Run migrations from: ./supabase/migrations/');
        console.log('   📖 See: ./supabase/DEPLOYMENT_GUIDE.md');
      } else {
        console.error('   ❌ Error:', orgError.message);
      }
    } else {
      console.log('   ✅ Multi-tenant schema is active');
      if (orgs && orgs.length > 0) {
        console.log(`   🏢 Found ${orgs.length} organization(s):`);
        orgs.forEach(org => {
          console.log(`      - ${org.name} (${org.slug}) - ${org.subscription_tier}`);
        });
      } else {
        console.log('   ℹ️  No organizations yet (ready for first setup)');
      }
    }
    console.log('');
  } catch (err) {
    console.error('   ❌ Error:', err.message);
  }
}

async function runAllTests() {
  console.log('═══════════════════════════════════════════════════════════');
  console.log('          SUPABASE MCP CONNECTION TEST SUITE');
  console.log('═══════════════════════════════════════════════════════════\n');

  const connected = await testConnection();
  if (!connected) {
    console.log('❌ Cannot proceed - connection failed\n');
    process.exit(1);
  }

  await testTableExists();
  await testRequestLogs();
  await testInsert();
  await testMigrationStatus();

  console.log('═══════════════════════════════════════════════════════════');
  console.log('✅ All tests completed!');
  console.log('═══════════════════════════════════════════════════════════\n');

  console.log('📋 Next steps:');
  console.log('   1. If migrations are pending, run: supabase db push');
  console.log('   2. Review deployment guide: ./supabase/DEPLOYMENT_GUIDE.md');
  console.log('   3. Configure organizations and users');
  console.log('');
}

// Run tests
runAllTests().catch(err => {
  console.error('💥 Fatal error:', err);
  process.exit(1);
});
