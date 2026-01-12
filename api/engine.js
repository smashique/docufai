// api/engine.js
import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// ১. প্রায়োরিটি অনুযায়ী মডেল লিস্ট (গ্রক ডকুমেন্টেশন অনুযায়ী সাজানো)
const VISION_MODEL_POOL = [
    "meta-llama/llama-4-scout-17b-16e-instruct", // বর্তমান সুপারিশকৃত
    "meta-llama/llama-4-maverick-17b-128e-instruct", // বিকল্প শক্তিশালী মডেল
    "llama-3.3-70b-versatile" // টেক্সট ও ভিশন ব্যাকআপ
];

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });
    
    const keysString = process.env.GROQ_KEYS;
    if (!keysString) return res.status(500).json({ error: "GROQ_KEYS missing in Vercel." });

    const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
    const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    try {
        // ২. ক্রেডিট চেক
        let { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (!user) {
            const { data: newUser } = await supabase.from('users').insert([{ id: userId, total_credits: 10, updated_count: 0 }]).select().single();
            user = newUser;
        }
        if (user.total_credits - user.updated_count <= 0) return res.status(402).json({ error: "Credits exhausted!" });

        // ৩. অটো-মডেল ট্রায়াল লুপ (Auto-Fallback Logic)
        let aiData = null;
        let lastError = "";

        for (const modelId of VISION_MODEL_POOL) {
            try {
                const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${selectedKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: modelId,
                        messages: [{ role: "user", content: [
                            { type: "text", text: ELITE_PROMPT },
                            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                        ]}],
                        temperature: 0.1
                    })
                });

                const result = await groqRes.json();

                // যদি মডেলটি decommissioned হয় বা কাজ না করে, তবে পরের মডেলে যাবে
                if (!groqRes.ok) {
                    lastError = result.error?.message || "Unknown error";
                    console.warn(`Model ${modelId} failed: ${lastError}. Trying next...`);
                    continue; 
                }

                aiData = result; // সফল হলে লুপ থেকে বের হয়ে যাবে
                break;
            } catch (e) {
                lastError = e.message;
                continue;
            }
        }

        if (!aiData) throw new Error("All models failed. Last Error: " + lastError);

        // ৪. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits,
            used_model: aiData.model // কোন মডেলটি কাজ করেছে তা ফ্রন্টএন্ডে জানানো
        });

    } catch (err) {
        return res.status(500).json({ error: "Engine Error: " + err.message });
    }
}
