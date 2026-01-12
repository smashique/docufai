// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    // এপিআই কী চেক (সার্ভার লগে দেখা যাবে কী-টি লোড হয়েছে কি না)
    const rawApiKey = process.env.GROQ_API_KEY;
    if (!rawApiKey) {
        return res.status(500).json({ error: "Engine Error: GROQ_API_KEY is missing in Vercel settings." });
    }

    if (!userId || !imageB64) return res.status(400).json({ error: "Missing required data" });

    try {
        // ১. ক্রেডিট চেক ও ইউজার হ্যান্ডলিং
        let { data: user, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .eq('id', userId)
            .single();

        if (!user || fetchError) {
            const { data: newUser, error: insertError } = await supabase
                .from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            
            if (insertError) throw new Error("Database sync failed: " + insertError.message);
            user = newUser;
        }

        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // ২. Groq API কল (Safety Trimming যুক্ত করা হয়েছে)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { 
                // .trim() ব্যবহার করা হয়েছে যাতে কোনো স্পেস এরর না হয়
                "Authorization": `Bearer ${rawApiKey.trim()}`, 
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
        
        // Groq থেকে সুনির্দিষ্ট এরর মেসেজ ধরা
        if (!groqRes.ok) {
            throw new Error(aiData.error?.message || `Groq API Error: ${groqRes.status}`);
        }

        // ৩. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        console.error("Engine Crash Log:", err.message);
        return res.status(500).json({ error: "Engine Error: " + err.message });
    }
}
