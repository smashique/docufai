// api/formats.js

export const generateEliteReplica = (bodyContent, header = "", footer = "") => {
    return `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
        <meta charset="utf-8">
        <title>Docufai Pro Architecture</title>
        <script>window.MathJax = { tex: { inlineMath: [['$', '$']] } };<\/script>
        <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async><\/script>
        
        <style>
            /* A4 Page Setup for MS Word */
            @page {
                size: 21cm 29.7cm;
                margin: 1.27cm 1.27cm 1.27cm 1.27cm;
                mso-page-orientation: portrait;
                mso-header: url("h1") h1;
                mso-footer: url("f1") f1;
            }
            @page Section1 { mso-header-margin:0.5in; mso-footer-margin:0.5in; mso-header:h1; mso-footer:f1; }
            div.Section1 { page: Section1; }

            /* Elite Typography & Layout */
            body { 
                font-family: 'Times New Roman', 'Siyam Rupali', serif; 
                font-size: 10.5pt; 
                line-height: 1.15; 
                color: #000;
            }
            
            /* Two-Column Matrix for Replica */
            .replica-grid { display: table; width: 100%; table-layout: fixed; }
            .replica-col { display: table-cell; width: 50%; padding: 10px; vertical-align: top; border-left: 1px solid #eee; }

            /* Question Paper Styling (Pabna Sadar Style) */
            .q-table { border-collapse: collapse; width: 100%; border: 1px solid #000; margin: 8pt 0; }
            .q-table td { border: 1px solid #000; padding: 4pt; vertical-align: top; }
            .options-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; font-weight: bold; }
            
            /* Header & Footer Styling */
            header#h1 { font-size: 9pt; text-align: center; border-bottom: 1px solid #ddd; margin-bottom: 10pt; }
            footer#f1 { font-size: 9pt; text-align: center; border-top: 1px solid #ddd; margin-top: 10pt; }
        </style>
    </head>
    <body>
        <div class="Section1">
            <header id="h1">${header || 'Computer Compose & IT Service'}</header>
            <main class="replica-grid">${bodyContent}</main>
            <footer id="f1">${footer || 'Page <span style="mso-field-code: PAGE "></span>'}</footer>
        </div>
    </body>
    </html>`;
};
