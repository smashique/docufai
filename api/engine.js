// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const VISION_MODEL_POOL = [
    "meta-llama/llama-4-scout-17b-16e-instruct", 
    "meta-llama/llama-4-maverick-17b-128e-instruct"
];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const keysString = process.env.GROQ_KEYS; // Support for 5-10 keys
    if (!keysString) return res.status(500).json({ error: "GROQ_KEYS missing." });

    const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    try {
        let { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (!user) {
            const { data: newUser } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            user = newUser;
        }

        if (user.total_credits - user.updated_count <= 0) return res.status(402).json({ error: "Credits exhausted!" });

        // Math-Specific Reconstruction Logic
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${selectedKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: VISION_MODEL_POOL[0], 
                messages: [{ role: "user", content: [
                    { type: "text", text: "ACT AS AN ELITE MATH ARCHITECT. RECONSTRUCT THE ATTACHED MCQ PAPER INTO PROFESSIONAL HTML/CSS. USE LATEX FOR ALL EQUATIONS. MAINTAIN COLUMN LAYOUT. IF GRAPHS EXIST, DESCRIBE THEM ACCURATELY IN TEXT." },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq API Error");

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
