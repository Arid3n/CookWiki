import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function test() {
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: 'test@test.com', // I don't know the user's credentials
    password: 'password'
  });
}
test();
