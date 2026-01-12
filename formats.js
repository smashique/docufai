// formats.js - Frontend Logic Engine

export const sharpenForAI = (canvas) => {
    const ctx = canvas.getContext('2d');
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
        const v = (d[i] * 0.3 + d[i+1] * 0.59 + d[i+2] * 0.11); 
        d[i] = d[i+1] = d[i+2] = v > 128 ? v + 30 : v - 30; // Contrast Boost
    }
    ctx.putImageData(imgData, 0, 0);
};

export const getEliteWordTemplate = (body, header = "", footer = "") => {
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset="utf-8">
        <style>
            @page { size: 21cm 29.7cm; margin: 1.27cm; mso-header: url("h1") h1; mso-footer: url("f1") f1; }
            body { font-family: 'Times New Roman', 'Siyam Rupali', serif; font-size: 10.5pt; line-height: 1.2; padding: 20px; color: #000; }
            .grid-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 8pt; }
            .col-item { display: table-cell; vertical-align: top; padding: 5pt; }
            .floating-box { border: 1.5pt solid #000; padding: 10pt; margin: 10pt 0; }
            table { border-collapse: collapse; width: 100%; border: 1pt solid #000; }
            td { border: 1pt solid #000; padding: 4pt; vertical-align: top; }
        </style>
    </head>
    <body>
        <div style='mso-element:header' id=h1><p style="text-align:center; font-size:9pt;">${header || 'Docufai Pro Elite Architecture'}</p></div>
        <main>${body}</main>
        <div style='mso-element:footer' id=f1><p style="text-align:center; font-size:9pt;">Page <span style="mso-field-code: PAGE "></span></p></div>
    </body></html>`;
};
