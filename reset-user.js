require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function resetUser() {
  const { data, error } = await supabase
    .from('tribunal_credentials')
    .update({ status: 'active', retry_count: 0 })
    .eq('email', 'jevaristoz@gmail.com')
    .select();

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ User reset to active status');
    console.log('   Email:', data[0]?.email);
    console.log('   Status:', data[0]?.status);
    console.log('   Retry count:', data[0]?.retry_count);
  }
}

resetUser();
