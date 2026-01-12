// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    // ১. Multi-Key হ্যান্ডলিং
    const keysString = process.env.GROQ_KEYS; // আপনার ভেরিয়েবল নাম
    if (!keysString) {
        return res.status(500).json({ error: "Engine Error: GROQ_KEYS is missing in Vercel settings." });
    }

    // কমা দিয়ে আলাদা করা কী-গুলোকে অ্যারেতে রূপান্তর এবং র‍্যান্ডম একটি সিলেক্ট করা
    const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    if (!userId || !imageB64) return res.status(400).json({ error: "Missing required data" });

    try {
        // ২. ক্রেডিট চেক ও ইউজার হ্যান্ডলিং
        let { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user || fetchError) {
            const { data: newUser } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            user = newUser;
        }

        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // ৩. Groq API কল (নির্বাচিত র‍্যান্ডম কী দিয়ে)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${selectedKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "llama-3.2-11b-vision-preview",
                messages: [{ role: "user", content: [
                    { type: "text", text: ELITE_PROMPT },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq API Error");

        // ৪. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        return res.status(500).json({ error: "Engine Error: " + err.message });
    }
}
