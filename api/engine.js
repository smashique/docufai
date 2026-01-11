// api/engine.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Denied');

    const { imageB64, userInfo } = req.body;
    const userId = userInfo.id;

    try {
        // ১. ডাটাবেস থেকে ইউজার চেক
        let { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();

        if (!user) {
            // নতুন ইউজার হলে ১০ ক্রেডিট দিয়ে তৈরি করা
            const { data: newUser } = await supabase.from('users').insert([{ id: userId, total_credits: 10 }]).select().single();
            user = newUser;
        }

        // ২. ক্রেডিট চেক লজিক
        if (user.page_count >= user.total_credits) {
            return res.status(402).json({ error: "No Credits" });
        }

        // ৩. Groq API কল (Key Rotation)
        const keys = process.env.GROQ_KEYS.split(',');
        const MASTER_PROMPT = "Recreate image as HTML using TABLES for layout. Word safe fonts only. LaTeX math in $...$. Start directly with <!DOCTYPE html>.";

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${keys[0].trim()}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: process.env.CURRENT_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct",
                messages: [{ role: "user", content: [{ type: "text", text: MASTER_PROMPT }, { type: "image_url", image_url: { url: `data:image/png;base64,${imageB64}` } }] }],
                temperature: 0.1
            })
        });

        const data = await response.json();

        // ৪. সফল হলে কাউন্টার আপডেট
        if (data.choices) {
            const newCount = user.page_count + 1;
            await supabase.from('users').update({ page_count: newCount }).eq('id', userId);
            return res.status(200).json({ ...data, updated_count: newCount, total_credits: user.total_credits });
        }

        throw new Error(data.error?.message || "Engine failure");

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
