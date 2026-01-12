// api/formats.js

export const getEliteWordTemplate = (bodyContent, header = "", footer = "") => {
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <style>
            /* Universal Page Architecture */
            @page { size: 21cm 29.7cm; margin: 1.27cm; mso-header: url("h1") h1; mso-footer: url("f1") f1; }
            body { font-family: 'Times New Roman', 'Siyam Rupali', serif; font-size: 10.5pt; line-height: 1.15; }

            /* Structural Classes (Mapping from AI) */
            .grid-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 5pt; }
            .col-item { display: table-cell; vertical-align: top; padding: 5pt; }
            
            .floating-box { border: 1px solid #000; padding: 10px; margin: 10px 0; background: #fdfdfd; }
            .document-header { text-align: center; font-weight: bold; font-size: 14pt; margin-bottom: 20pt; }
            
            /* Math & Tables */
            table { border-collapse: collapse; width: 100%; }
            td { border: 1px solid #000; padding: 4pt; vertical-align: top; }
            
            /* SVG Rendering Fix */
            svg { display: block; margin: 0 auto; max-width: 100%; }
        </style>
    </head>
    <body>
        <div class="Section1">
            <header id="h1" style='mso-element:header'>${header}</header>
            <main>${bodyContent}</main>
            <footer id="f1" style='mso-element:footer'>${footer}</footer>
        </div>
    </body>
    </html>`;
};
