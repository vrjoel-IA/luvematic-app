import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yrwcxvkjrujbqtdemfth.supabase.co';
const supabaseKey = 'sb_publishable_OXBBHNBcIdNv4BV006NJMw_WpVDiDaK'; // From read-users.js
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    const { data, error } = await supabase.from('Usuarios').select('*').order('created_at', { ascending: false });
    console.log("DATA:", data);
    console.log("ERROR:", error);
}

test();
