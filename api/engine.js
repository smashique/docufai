// api/engine.js
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Denied');

    const { imageB64, userInfo } = req.body;
    const userId = userInfo.id;

    try {
        // ১. ডাটাবেস থেকে ইউজার চেক করা
        let { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();

        if (!user) {
            // নতুন ইউজার হলে ১০ ক্রেডিট দিয়ে তৈরি করা
            const { data: newUser } = await supabase.from('users').insert([{ id: userId, total_credits: 10, page_count: 0 }]).select().single();
            user = newUser;
        }

        // ২. ক্রেডিট চেক লজিক
        if (user.page_count >= user.total_credits) {
            return res.status(402).json({ error: "No Credits" });
        }

        // ৩. মাল্টি-এপিআই কী রোটেশন লজিক
        const keys = process.env.GROQ_KEYS.split(',');
        const MODEL_ID = process.env.CURRENT_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

        // ম্যাথ ফিক্স এবং ওয়ার্ড ফিডেলিটির জন্য মাস্টার প্রম্পট
        const MASTER_PROMPT = `
            # [PERSONA]: Word-Fidelity Document Architect
            # [STRICT MATH RULES]:
            - ALL math symbols/equations MUST be wrapped in LaTeX $...$ for inline or $$...$$ for blocks.
            - Ensure NO spaces between $ and content (e.g., $x+y$ not $ x+y $).
            - Replicate complex integrals, limits, and fractions using strict LaTeX notation.
            # [LAYOUT]:
            - Use HTML TABLES for any multi-column structure to ensure Word compatibility.
            - Start response DIRECTLY with <html> and end with </html>. No conversational text.
        `;

        let groqData = null;
        let lastError = "";

        // কী রোটেশন লুপ: প্রথমটি কাজ না করলে পরেরটি ট্রাই করবে
        for (let key of keys) {
            try {
                const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                    method: "POST",
                    headers: { 
                        "Authorization": `Bearer ${key.trim()}`, 
                        "Content-Type": "application/json" 
                    },
                    body: JSON.stringify({
                        model: MODEL_ID,
                        messages: [
                            { role: "user", content: [
                                { type: "text", text: MASTER_PROMPT },
                                { type: "image_url", image_url: { url: `data:image/png;base64,${imageB64}` } }
                            ]}
                        ],
                        temperature: 0.1
                    })
                });

                const result = await response.json();
                if (result.choices) {
                    groqData = result;
                    break; // সফল হলে লুপ বন্ধ হবে
                } else {
                    lastError = result.error?.message || "API Key error";
                }
            } catch (err) {
                lastError = err.message;
                continue; // এরর হলে পরের কী ট্রাই করবে
            }
        }

        if (!groqData) throw new Error("All API keys failed or exhausted: " + lastError);

        // ৪. সফল হলে ডাটাবেসে কাউন্টার আপডেট করা
        const newCount = (user.page_count || 0) + 1;
        await supabase.from('users').update({ page_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            ...groqData, 
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
