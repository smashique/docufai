// api/formats.js

// ইমেজ শার্পনার: এআই-এর জন্য ছবি পরিষ্কার করা
export const sharpenForAI = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11); // Grayscale
        d[i] = d[i+1] = d[i+2] = v > 128 ? v + 25 : v - 25; // Contrast Boost
    }
    ctx.putImageData(imgData, 0, 0);
};

// ইউনিভার্সাল ওয়ার্ড টেমপ্লেট
export const getEliteWordTemplate = (body, header = "", footer = "") => {
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8">
        <script>window.MathJax = { tex: { inlineMath: [['$', '$']] } };<\/script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async><\/script>
        <style>
            @page { size: 21cm 29.7cm; margin: 1.27cm; mso-header: url("h1") h1; mso-footer: url("f1") f1; }
            body { font-family: 'Times New Roman', 'Siyam Rupali', serif; font-size: 10.5pt; line-height: 1.2; color: #000; }
            .grid-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 8pt; }
            .col-item { display: table-cell; vertical-align: top; padding: 5pt; }
            .floating-box { border: 1.5pt solid #000; padding: 10pt; margin: 10pt 0; }
            table { border-collapse: collapse; width: 100%; border: 1pt solid #000; }
            td { border: 1pt solid #000; padding: 4pt; vertical-align: top; }
            #h1, #f1 { font-size: 9pt; text-align: center; border-bottom: 1px solid #ddd; }
            [dir="rtl"] { text-align: right; }
        </style>
    </head>
    <body>
        <div class="Section1">
            <header id="h1" style='mso-element:header'>${header || 'Docufai Pro Elite Architecture'}</header>
            <main>${body}</main>
            <footer id="f1" style='mso-element:footer'>Page <span style="mso-field-code: PAGE "></span></footer>
        </div>
    </body></html>`;
};
