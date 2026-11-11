import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@test.com', // Let's create a test user first?
    password: 'password123'
  });
  console.log(authErr);
}
test();
