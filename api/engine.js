// api/engine.js
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
        // ১. ক্রেডিট চেক
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

        // ২. গ্রক এপিআই কল (Stable Vision Model)
        const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                // মডেল আপডেট: llama-3.2-11b-vision-preview
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
                temperature: 0.1,
                max_tokens: 4096
            })
        });

        const aiData = await groqResponse.json();

        // এপিআই লেভেলে কোনো এরর থাকলে তা ধরা
        if (!groqResponse.ok) {
            return res.status(groqResponse.status).json({ 
                error: aiData.error?.message || "Groq API Error: " + groqResponse.statusText 
            });
        }

        // আউটপুট চেক: choices না থাকলে এরর মেসেজ দেওয়া
        if (!aiData.choices || aiData.choices.length === 0) {
            return res.status(500).json({ error: "AI returned an empty response. Try resizing the image." });
        }

        // ৩. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({
            ...aiData,
            total_credits: user.total_credits,
            updated_count: newCount
        });

    } catch (err) {
        return res.status(500).json({ error: "Server Error: " + err.message });
    }
}
