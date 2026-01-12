// api/engine.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "POST required" });
    
    const keysString = process.env.GROQ_KEYS;
    const keyPool = keysString.split(',').map(k => k.trim());
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    const { imageB64, userInfo } = req.body;

    try {
        // High-Precision Prompt for Math Columns & Diagrams
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${selectedKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct", 
                messages: [{ role: "user", content: [
                    { type: "text", text: "ACT AS AN ELITE EXAM ARCHITECT. RECONSTRUCT THIS MATH MCQ PAPER. 1. USE A 2-COLUMN CSS GRID LAYOUT. 2. USE LATEX FOR ALL MATH/TRIGONOMETRY. 3. FOR DIAGRAMS/GRAPHS, CREATE A PLACEHOLDER BOX WITH A TEXT DESCRIPTION OF THE GEOMETRY. 4. ENSURE TABLES ARE RENDERED AS PROPER HTML TABLES." },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        const { data: user } = await supabase.from('users').select('*').eq('id', userInfo.id).single();
        const newCount = (user?.updated_count || 0) + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userInfo.id);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user?.total_credits || 10 
        });

    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
