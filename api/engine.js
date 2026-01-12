// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_MATH_PROMPT } from './prompts.js'; // নিশ্চিত করুন ফাইল নাম ঠিক আছে

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // এরর আসলেও যেন সেটি JSON ফরম্যাটে যায়
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    if (!userId || !imageB64) return res.status(400).json({ error: "Missing User ID or Image Data" });

    try {
        // ১. Supabase কানেকশন চেক
        const { data: user, error: dbError } = await supabase.from('users').select('*').eq('id', userId).single();
        
        if (dbError && dbError.code !== 'PGRST116') throw new Error("Database Error: " + dbError.message);

        let currentUser = user;
        if (!user) {
            const { data: newUser, error: insError } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            if (insError) throw new Error("User Creation Failed: " + insError.message);
            currentUser = newUser;
        }

        if (currentUser.total_credits - currentUser.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // ২. GROQ_KEYS চেক
        const keysString = process.env.GROQ_KEYS;
        if (!keysString) throw new Error("Environment Variable 'GROQ_KEYS' is missing in Vercel.");
        
        const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

        // ৩. Groq কল (Llama 4 Scout মডেল)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${selectedKey}`, "Content-Type": "application/json" },
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
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq API returned an error.");

        // ৪. ক্রেডিট আপডেট
        const newCount = currentUser.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: currentUser.total_credits 
        });

    } catch (err) {
        console.error("Critical Engine Error:", err.message);
        return res.status(500).json({ error: "Engine Crash: " + err.message });
    }
}
