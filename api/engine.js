// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "POST required" });
    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    try {
        let { data: user } = await supabase.from('users').select('*').eq('id', userId).single();

        // ক্রেডিট না থাকলে বা নতুন ইউজার হলে
        if (!user) {
            const { data: newUser } = await supabase.from('users').insert([{ id: userId, total_credits: 10, updated_count: 0 }]).select().single();
            user = newUser;
        }

        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // এআই কল (Stable & Faster Vision Model)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview", 
                messages: [{ role: "user", content: [
                    { type: "text", text: ELITE_PROMPT },
                    { type: "image_url", image_url: { url: `data:image/png;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "AI Failed");

        // ক্রেডিট আপডেট
        await supabase.from('users').update({ updated_count: user.updated_count + 1 }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices, // সবসময় choices প্রপার্টি নিশ্চিত করা
            updated_count: user.updated_count + 1, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
