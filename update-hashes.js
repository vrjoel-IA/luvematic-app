import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yrwcxvkjrujbqtdemfth.supabase.co';
const supabaseKey = 'sb_publishable_OXBBHNBcIdNv4BV006NJMw_WpVDiDaK';
const sb = createClient(supabaseUrl, supabaseKey);

async function run() {
    const adminRes = await sb.from('Usuarios').update({ hash_contrasena: '$2b$10$wIKqQ94D4W99N1918a8vHuEKGWz/c65M6U40/FMjl/ymAaRawvD86' }).eq('email', 'admin@luvematic.com').select();
    console.log('Admin update:', adminRes.data, adminRes.error);

    const techRes = await sb.from('Usuarios').update({ hash_contrasena: '$2b$10$AUsh/MtjZu0jRgAppbExwujB3AL.LzS3ggywwRUwu6xQO2AREcPdy' }).eq('email', 'juan@luvematic.com').select();
    console.log('Tech update:', techRes.data, techRes.error);
}
run();
