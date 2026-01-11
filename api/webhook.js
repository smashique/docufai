// api/webhook.js

import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

    const { amount, metadata, status } = req.body;

    if (status === 'Completed' && amount === '99') {
        const userId = metadata.user_id;

        // বর্তমান ক্রেডিট চেক করে ৩৩ যোগ করা
        const { data: user } = await supabase.from('users').select('total_credits').eq('id', userId).single();
        
        const newTotal = (user?.total_credits || 0) + 33;

        await supabase.from('users').update({ total_credits: newTotal }).eq('id', userId);
        
        return res.status(200).send("Credits Added Successfully");
    }

    res.status(400).send("Payment Incomplete or Invalid Amount");
}
