import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://pezqrxipcdmdwdvwbtyp.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBlenFyeGlwY2RtZHdkdndidHlwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MjA4NzUsImV4cCI6MjEwMjE5Njg3NX0.zG-IjS8xPCrN0Daw4spZ9eeLjK2U3yArF5RyNJ4_G6c'
);

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test2@uni.cart',
  password: 'test1234',
});

if (error) {
  console.error('Error:', error.message);
} else {
  console.log('Access token:\n', data.session.access_token);
}