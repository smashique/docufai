// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_MATH_PROMPT } from './prompts.js'; // নিশ্চিত করুন ফাইলটি api ফোল্ডারেই আছে

export default async function handler(req, res) {
    // ব্রাউজারকে জানানো হচ্ছে যে আমরা JSON পাঠাবো
    res.setHeader('Content-Type', 'application/json');

    try {
        if (req.method !== 'POST') return res.status(405).json({ error: "Only POST requests are allowed." });

        // ১. Environment Variables ভ্যালিডেশন
        if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            throw new Error("Missing Supabase Configuration in Vercel settings.");
        }
        if (!process.env.GROQ_KEYS) {
            throw new Error("Missing GROQ_KEYS in Vercel settings.");
        }

        const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const { imageB64, userInfo } = req.body;
        const userId = userInfo?.id;

        if (!userId) throw new Error("Client Error: User ID is missing.");
        if (!imageB64) throw new Error("Client Error: Image data is missing.");

        // ২. ডাটাবেস চেক
        let { data: user, error: dbError } = await supabase.from('users').select('*').eq('id', userId).single();
        
        if (dbError && dbError.code !== 'PGRST116') {
            throw new Error(`Supabase Fetch Error: ${dbError.message}`);
        }

        if (!user) {
            const { data: newUser, error: insError } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            if (insError) throw new Error(`User Creation Failed: ${insError.message}`);
            user = newUser;
        }

        // ৩. AI কল লজিক
        const keyPool = process.env.GROQ_KEYS.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

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
        if (!groqRes.ok) throw new Error(aiData.error?.message || "AI API processing error.");

        // ৪. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        // এই এরর মেসেজটিই এখন সরাসরি আপনার ব্রাউজার পপ-আপে আসবে
        return res.status(500).json({ error: "ENGINE_CRASH: " + err.message });
    }
}
