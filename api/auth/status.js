import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data } = await supabase
    .from('x_tokens')
    .select('id')
    .eq('id', 1)
    .maybeSingle();

  res.status(200).json({ connected: !!data });
}
