import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yrwcxvkjrujbqtdemfth.supabase.co';
const supabaseKey = 'sb_publishable_OXBBHNBcIdNv4BV006NJMw_WpVDiDaK';
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
    const users = await sb.from('Usuarios').select('*');
    console.log('Users:', users.data, users.error);
}
run();
