// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_MATH_PROMPT } from './prompts.js'; // Ensure file exists in the same folder

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // প্রথমেই হেডার সেট করা যাতে ক্র্যাশ করলেও JSON রিটার্ন হয়
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    if (!userId || !imageB64) {
        return res.status(400).json({ error: "Missing required data: ID or Image" });
    }

    try {
        // ১. ডাটাবেস কানেকশন এবং ইউজার চেক
        let { data: user, error: dbError } = await supabase.from('users').select('*').eq('id', userId).single();
        
        if (dbError && dbError.code === 'PGRST116') {
            // নতুন ইউজার তৈরি
            const { data: newUser, error: insError } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            if (insError) throw new Error("DB Insert Error: " + insError.message);
            user = newUser;
        } else if (dbError) {
            throw new Error("Supabase Connection Error: " + dbError.message);
        }

        // ২. ক্রেডিট লিমিট চেক
        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted! Please recharge." });
        }

        // ৩. এপিআই কী রোটেশন
        const keysString = process.env.GROQ_KEYS;
        if (!keysString) throw new Error("Server Error: GROQ_KEYS not found in Vercel.");
        
        const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

        // ৪. Groq এআই কল (Llama 4 Scout)
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
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq API Process Failed.");

        // ৫. সফল হলে ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        // এররটি সরাসরি JSON হিসেবে রিটার্ন করা হচ্ছে
        return res.status(500).json({ error: "Engine Crash Report: " + err.message });
    }
}
