// api/engine.js - The Modular Connection Bridge

import { createClient } from '@supabase/supabase-js';
import { ELITE_PROMPT } from './prompts.js'; 

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    const { imageB64, userInfo } = req.body;
    const userId = userInfo?.id;

    if (!userId || !imageB64) {
        return res.status(400).json({ error: "Missing User ID or Image Data" });
    }

    try {
        // ১. ক্রেডিট চেক (Database Security)
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('total_credits, updated_count')
            .eq('id', userId)
            .single();

        if (userError || !user) {
            await supabase.from('users').insert([{ id: userId, total_credits: 10, updated_count: 0 }]);
            return res.status(200).json({ info: "First time user, credits initialized. Please retry." });
        }

        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted. Please recharge." });
        }

        // ২. গ্রক এপিআই কল (AI Brain - Stable Vision Model Updated)
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // মডেল আপডেট করা হয়েছে: llama-3.2-11b-vision-preview
                model: "llama-3.2-11b-vision-preview", 
                messages: [
                    {
                        role: "user",
                        content: [
                            { type: "text", text: ELITE_PROMPT },
                            {
                                type: "image_url",
                                image_url: { url: `data:image/png;base64,${imageB64}` }
                            }
                        ]
                    }
                ],
                temperature: 0.1, // একুরেসি বাড়ানোর জন্য লো টেম্পারেচার
                max_tokens: 4096
            })
        });

        const aiData = await groqResponse.json();

        // এপিআই এরর বা খালি রেসপন্স হ্যান্ডলিং
        if (!groqResponse.ok) {
            throw new Error(aiData.error?.message || "Groq API processing failed");
        }

        if (!aiData.choices || aiData.choices.length === 0) {
            throw new Error("AI returned an empty response. Please try with a clearer image.");
        }

        // ৩. ক্রেডিট আপডেট (Billing Automation)
        const newCount = user.updated_count + 1;
        await supabase
            .from('users')
            .update({ updated_count: newCount })
            .eq('id', userId);

        // ৪. ফ্রন্টএন্ডে ডাটা পাঠানো
        return res.status(200).json({
            ...aiData,
            total_credits: user.total_credits,
            updated_count: newCount
        });

    } catch (err) {
        console.error("Engine Error:", err.message);
        return res.status(500).json({ error: err.message });
    }
}
