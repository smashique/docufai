// api/engine.js
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).send('Access Denied');

    const { imageB64, userInfo } = req.body;

    // ১. ইনকগনিটো চেক
    if (userInfo.isIncognito) {
        return res.status(403).json({ error: "Architect Pro does not support Incognito mode." });
    }

    // ২. মাল্টি-এপিআই কী রোটেশন
    const keys = process.env.GROQ_KEYS ? process.env.GROQ_KEYS.split(',') : [];
    const MODEL_ID = process.env.CURRENT_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

    const MASTER_PROMPT = `
# [PERSONA]: Word-Fidelity Document Architect
Recreate images as HTML documents optimized for Microsoft Word export.
# [STRICT LAYOUT]:
- USE HTML TABLES for all structures (columns, sidebars, headers).
- APPLY ALL STYLES INLINE.
- Use standard fonts like 'Times New Roman'.
- Math in LaTeX strictly in $...$.
# [USER INFO]: ID: ${userInfo.id}
`;

    for (let key of keys) {
        try {
            const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: { "Authorization": `Bearer ${key.trim()}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: MODEL_ID,
                    messages: [{ role: "user", content: [
                        { type: "text", text: MASTER_PROMPT },
                        { type: "image_url", image_url: { url: `data:image/png;base64,${imageB64}` } }
                    ]}],
                    temperature: 0.1
                })
            });
            const data = await response.json();
            if (data.choices) return res.status(200).json(data);
        } catch (err) { continue; }
    }
    res.status(500).json({ error: "All engine keys exhausted." });
}
