// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_MATH_PROMPT } from './prompts.js'; // আলাদা প্রম্পট ফাইল থেকে লোড হচ্ছে

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "POST required" });
    
    // ১. Multi-Key Rotation
    const keysString = process.env.GROQ_KEYS;
    const keyPool = keysString.split(',').map(k => k.trim());
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    const { imageB64, userInfo } = req.body;

    try {
        // ২. Groq API Call with Llama 4 Scout
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                "Authorization": `Bearer ${selectedKey}`, 
                "Content-Type": "application/json" 
            },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct", 
                messages: [{ role: "user", content: [
                    { type: "text", text: ELITE_MATH_PROMPT },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "AI Error");

        // ৩. ক্রেডিট আপডেট লজিক
        const { data: user } = await supabase.from('users').select('*').eq('id', userInfo.id).single();
        const newCount = (user?.updated_count || 0) + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userInfo.id);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user?.total_credits || 10 
        });

    } catch (err) {
        return res.status(500).json({ error: "Engine Error: " + err.message });
    }
}
