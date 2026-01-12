// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_MATH_PROMPT } from './prompts.js'; // নিশ্চিত করুন ফাইলটি api ফোল্ডারেই আছে

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // ক্র্যাশ করলেও যেন ব্রাউজার JSON পায় তা নিশ্চিত করা
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    if (!userId || !imageB64) {
        return res.status(400).json({ error: "Missing User ID or Image Data" });
    }

    try {
        // ১. ডাটাবেস থেকে ইউজার চেক
        let { data: user, error: dbError } = await supabase.from('users').select('*').eq('id', userId).single();
        
        // যদি ইউজার না থাকে (PGRST116 মানে single রিকোয়েস্টে ডাটা নেই)
        if (dbError && dbError.code === 'PGRST116') {
            const { data: newUser, error: insError } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            if (insError) throw new Error("DB Insert Error: " + insError.message);
            user = newUser;
        } else if (dbError) {
            throw new Error("DB Fetch Error: " + dbError.message);
        }

        // ২. ক্রেডিট চেক
        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // ৩. Groq Keys হ্যান্ডলিং
        const keysString = process.env.GROQ_KEYS;
        if (!keysString) throw new Error("GROQ_KEYS is missing in Vercel settings.");
        
        const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

        // ৪. এআই কল (Llama 4 Scout)
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

        // রেসপন্স চেক
        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq API Error");

        // ৫. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        console.error("Critical Engine Error:", err.message);
        // নিশ্চিত করা হচ্ছে যে ক্যাচ ব্লক থেকে শুধু JSON ফেরত যায়
        return res.status(500).json({ error: "Engine Crash: " + err.message });
    }
}
