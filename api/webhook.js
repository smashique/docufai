// api/webhook.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Denied');

    const data = req.body;
    // UddoktaPay থেকে আসা পেমেন্ট স্ট্যাটাস চেক
    if (data.status === 'COMPLETED') {
        const userId = data.metadata.user_id;

        try {
            // ১. ডাটাবেস থেকে ইউজারের বর্তমান ক্রেডিট আনা
            let { data: user, error } = await supabase.from('users').select('total_credits').eq('id', userId).single();

            if (user) {
                // ২. বর্তমান ক্রেডিটের সাথে ১০০ পেজ যোগ করা
                const updatedCredits = (user.total_credits || 0) + 100;

                await supabase.from('users').update({ 
                    total_credits: updatedCredits 
                }).eq('id', userId);

                console.log(`Success: Added 100 credits to ${userId}`);
                return res.status(200).send("Success");
            }
        } catch (err) {
            console.error("Webhook Database Error:", err.message);
            return res.status(500).send("DB Error");
        }
    }
    
    res.status(400).send("Invalid Status");
}
