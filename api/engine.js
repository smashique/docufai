// api/engine.js
import { createClient } from '@supabase/supabase-js';
// prompts.js ফাইলে ELITE_MATH_PROMPT এবং ELITE_MATH_REFINEMENT_PROMPT দুইটাই থাকতে হবে
import { ELITE_MATH_PROMPT, ELITE_MATH_REFINEMENT_PROMPT } from './prompts.js'; 

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

export default async function handler(req, res) {
    // প্রথমেই রেসপন্স হেডার সেট করা যাতে ক্র্যাশ করলেও JSON রিটার্ন করে
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'POST') return res.status(405).json({ error: "Method not allowed" });

    // ১. ডাটা এক্সট্রাকশন ও ভ্যালিডেশন
    const { imageB64, userInfo, prevHtml } = req.body; 
    const userId = userInfo?.id;

    if (!userId || !imageB64) {
        return res.status(400).json({ error: "Client Error: Missing User ID or Image Data" });
    }

    try {
        // ২. ইউজার ও ক্রেডিট চেক
        let { data: user, error: dbError } = await supabase.from('users').select('*').eq('id', userId).single();
        
        if (dbError && dbError.code !== 'PGRST116') throw new Error("DB Error: " + dbError.message);

        if (!user) {
            const { data: newUser, error: insError } = await supabase.from('users')
                .insert([{ id: userId, total_credits: 10, updated_count: 0 }])
                .select().single();
            if (insError) throw new Error("User Sync Failed: " + insError.message);
            user = newUser;
        }

        if (user.total_credits - user.updated_count <= 0) {
            return res.status(402).json({ error: "Credits exhausted!" });
        }

        // ৩. প্রম্পট সিলেকশন (Refinement Logic)
        // যদি ইউজার 'Make More Perfect' ক্লিক করে, তবে prevHtml পাঠানো হবে
        const basePrompt = prevHtml ? ELITE_MATH_REFINEMENT_PROMPT : ELITE_MATH_PROMPT;
        const finalPrompt = prevHtml ? `${basePrompt}\n\nPREVIOUS OUTPUT TO IMPROVE:\n${prevHtml}` : basePrompt;

        // ৪. GROQ_KEYS হ্যান্ডলিং
        const keysString = process.env.GROQ_KEYS;
        if (!keysString) throw new Error("Server Config Error: GROQ_KEYS is missing.");
        
        const keyPool = keysString.split(',').map(k => k.trim()).filter(k => k.length > 0);
        const selectedKey = keyPool[Math.floor(Math.random() * keyPool.length)];

        // ৫. Groq API কল (Llama 4 Scout)
        const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Authorization": `Bearer ${selectedKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
                model: "meta-llama/llama-4-scout-17b-16e-instruct", 
                messages: [{ role: "user", content: [
                    { type: "text", text: finalPrompt },
                    { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageB64}` } }
                ]}],
                temperature: 0.1
            })
        });

        const aiData = await groqRes.json();
        if (!groqRes.ok) throw new Error(aiData.error?.message || "Groq processing error.");

        // ৬. ক্রেডিট আপডেট
        const newCount = user.updated_count + 1;
        await supabase.from('users').update({ updated_count: newCount }).eq('id', userId);

        return res.status(200).json({ 
            choices: aiData.choices,
            updated_count: newCount, 
            total_credits: user.total_credits 
        });

    } catch (err) {
        console.error("Critical Engine Failure:", err.message);
        return res.status(500).json({ error: "Engine Crash: " + err.message });
    }
}
