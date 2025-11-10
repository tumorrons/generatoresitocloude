        var data = {
            siteName: 'Il mio Sito',
            author: 'Il tuo nome',
            primaryColor: '#1a1a1a',
            secondaryColor: '#ffffff',
            accentColor: '#ff6b6b',
            headerHeight: 200,
            headerPosition: 'relative',
            fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
            customFontData: null,
            customFontName: null,
            header: {
                elements: []
            },
            pages: []
        };

        var nextPageId = 1, nextItemId = 1, nextHeaderId = 1, currentPageId = null;
        var selectedId = null, selectedHeaderId = null, editingHeaderId = null;
        var imageCounter = 0;

        // ===== GESTIONE PROGETTO =====
        function saveProject() {
            var json = JSON.stringify(data, null, 2);
            var blob = new Blob([json], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'progetto.json';
            a.click();
            alert('✅ Progetto salvato!');
        }

        function loadProject(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(ev) {
                data = JSON.parse(ev.target.result);
                nextPageId = Math.max(1, Math.max.apply(Math, data.pages.map(function(p) { return p.id; })) + 1);
                nextHeaderId = Math.max(1, Math.max.apply(Math, data.header.elements.map(function(e) { return e.id; })) + 1);
                document.getElementById('siteName').value = data.siteName;
                document.getElementById('author').value = data.author;
                document.getElementById('primaryColor').value = data.primaryColor;
                document.getElementById('secondaryColor').value = data.secondaryColor;
                document.getElementById('accentColor').value = data.accentColor;
                document.getElementById('headerHeightInput').value = data.headerHeight;
                document.getElementById('headerHeightValue').textContent = data.headerHeight;
                
                // Carica impostazioni font
                if (data.fontFamily) {
                    document.getElementById('fontFamily').value = data.fontFamily;
                    if (data.fontFamily === 'custom' && data.customFontName) {
                        document.getElementById('customFontSection').style.display = 'block';
                        document.getElementById('customFontName').textContent = '✅ Font caricato: ' + data.customFontName;
                    }
                }
                
                renderPagesList();
                renderHeaderList();
                updatePreview();
                alert('✅ Progetto caricato!');
            };
            reader.readAsText(file);
        }

        function updateSettings() {
            data.siteName = document.getElementById('siteName').value;
            data.author = document.getElementById('author').value;
            data.primaryColor = document.getElementById('primaryColor').value;
            data.secondaryColor = document.getElementById('secondaryColor').value;
            data.accentColor = document.getElementById('accentColor').value;
            data.headerPosition = document.getElementById('headerPosition').value;
            
            var fontSelect = document.getElementById('fontFamily');
            data.fontFamily = fontSelect.value;
            
            // Mostra/nascondi sezione font personalizzato
            var customSection = document.getElementById('customFontSection');
            if (fontSelect.value === 'custom') {
                customSection.style.display = 'block';
            } else {
                customSection.style.display = 'none';
            }
            
            updatePreview();
            alert('✅ Impostazioni salvate!');
        }
        
        function loadCustomFont(e) {
            var file = e.target.files[0];
            if (!file) return;
            
            var reader = new FileReader();
            reader.onload = function(ev) {
                data.customFontData = ev.target.result;
                data.customFontName = file.name.replace(/\.(ttf|woff|woff2)$/i, '');
                document.getElementById('customFontName').textContent = '✅ Font caricato: ' + file.name;
                data.fontFamily = 'custom';
                updatePreview();
            };
            reader.readAsDataURL(file);
            e.target.value = '';
        }
        
        function applyTheme() {
            var theme = document.getElementById('themePreset').value;
            var themes = {
                'dark': { primary: '#1a1a1a', secondary: '#ffffff', accent: '#ff6b6b' },
                'light': { primary: '#f5f5f5', secondary: '#333333', accent: '#2196F3' },
                'blue': { primary: '#0a192f', secondary: '#ccd6f6', accent: '#64ffda' },
                'warm': { primary: '#2c1810', secondary: '#f4e4d7', accent: '#ff9966' },
                'nature': { primary: '#1b4332', secondary: '#d8f3dc', accent: '#52b788' },
                'sunset': { primary: '#1a0f3d', secondary: '#ffd4a3', accent: '#ff6b9d' },
                'minimal': { primary: '#ffffff', secondary: '#000000', accent: '#666666' }
            };
            
            if (theme !== 'custom' && themes[theme]) {
                document.getElementById('primaryColor').value = themes[theme].primary;
                document.getElementById('secondaryColor').value = themes[theme].secondary;
                document.getElementById('accentColor').value = themes[theme].accent;
                data.primaryColor = themes[theme].primary;
                data.secondaryColor = themes[theme].secondary;
                data.accentColor = themes[theme].accent;
                updatePreview();
            }
        }

        // ===== EXPORT MULTIPAGE CON ZIP =====
        async function exportSite() {
            // Validazione pre-export
            if (data.pages.length === 0) {
                alert('⚠️ Impossibile esportare!\n\nNon ci sono pagine nel progetto.\nAggiungi almeno una pagina prima di esportare.');
                return;
            }

            // Verifica che ci sia almeno una pagina visibile
            var hasVisiblePage = data.pages.some(function(page) {
                if (page.type === 'gallery') {
                    return page.subPages && page.subPages.some(function(sub) { return sub.visible; });
                }
                return page.visible;
            });

            if (!hasVisiblePage) {
                alert('⚠️ Impossibile esportare!\n\nTutte le pagine sono nascoste.\nRendi visibile almeno una pagina prima di esportare.');
                return;
            }

            var progressDiv = document.getElementById('exportProgress');
            var progressBar = document.getElementById('progressBar');
            var progressFill = document.getElementById('progressFill');

            progressDiv.style.display = 'block';
            progressBar.style.display = 'block';
            updateProgress(0, 'Preparazione...');

            try {
                var zip = new JSZip();
                imageCounter = 0;
                var imageMap = {}; // Mappa base64 -> nome file
                
                updateProgress(10, 'Creazione CSS...');
                
                // CSS condiviso
                var css = generateCSS();
                zip.file('css/style.css', css);
                
                updateProgress(20, 'Raccolta immagini...');
                
                // Raccolta tutte le immagini
                var allImages = [];
                
                // Immagini header
                data.header.elements.forEach(function(el) {
                    if (el.type === 'image' && el.src) {
                        allImages.push({ src: el.src, type: 'header', id: el.id });
                    }
                });
                
                // Immagini pagine
                data.pages.forEach(function(page) {
                    if (page.backgroundImage) {
                        allImages.push({ src: page.backgroundImage, type: 'bg', pageId: page.id });
                    }
                    if (page.items) {
                        page.items.forEach(function(item) {
                            if (item.type === 'image' && item.src) {
                                allImages.push({ src: item.src, type: 'item', id: item.id });
                            }
                        });
                    }
                    if (page.subPages) {
                        page.subPages.forEach(function(sub) {
                            if (sub.backgroundImage) {
                                allImages.push({ src: sub.backgroundImage, type: 'bg', pageId: sub.id });
                            }
                            if (sub.items) {
                                sub.items.forEach(function(item) {
                                    if (item.type === 'image' && item.src) {
                                        allImages.push({ src: item.src, type: 'item', id: item.id });
                                    }
                                });
                            }
                        });
                    }
                });
                
                updateProgress(30, 'Salvando immagini...');
                
                // Salva immagini uniche
                for (var i = 0; i < allImages.length; i++) {
                    var imgData = allImages[i];
                    if (!imageMap[imgData.src]) {
                        var filename = 'image_' + (++imageCounter) + getImageExtension(imgData.src);
                        imageMap[imgData.src] = filename;
                        var base64Data = imgData.src.split(',')[1];
                        zip.file('images/' + filename, base64Data, { base64: true });
                    }
                }
                
                updateProgress(50, 'Generando pagine HTML...');
                
                // Genera tutte le pagine HTML
                var allPages = [];
                data.pages.forEach(function(page) {
                    if (page.type === 'gallery' && page.subPages) {
                        page.subPages.forEach(function(sub) {
                            if (sub.visible) allPages.push(sub);
                        });
                    } else if (page.visible) {
                        allPages.push(page);
                    }
                });
                
                // Homepage (index.html)
                if (allPages.length > 0) {
                    var indexPage = allPages[0];
                    var indexHTML = generatePageHTML(indexPage, imageMap, allPages, true);
                    zip.file('index.html', indexHTML);
                }
                
                // Altre pagine
                var pageProgress = 50;
                var progressStep = 40 / allPages.length;
                
                for (var i = 1; i < allPages.length; i++) {
                    var page = allPages[i];
                    var filename = sanitizeFilename(page.name) + '.html';
                    var html = generatePageHTML(page, imageMap, allPages, false);
                    zip.file(filename, html);
                    
                    pageProgress += progressStep;
                    updateProgress(Math.min(90, Math.round(pageProgress)), 'Generando pagine... (' + (i + 1) + '/' + allPages.length + ')');
                }
                
                updateProgress(95, 'Creando ZIP...');
                
                // Genera README
                var readme = generateReadme();
                zip.file('README.txt', readme);
                
                // Genera e scarica ZIP
                var content = await zip.generateAsync({ 
                    type: 'blob',
                    compression: 'DEFLATE',
                    compressionOptions: { level: 6 }
                });
                
                updateProgress(100, 'Completato!');
                
                saveAs(content, data.siteName.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.zip');
                
                setTimeout(function() {
                    progressDiv.style.display = 'none';
                    progressBar.style.display = 'none';
                }, 2000);
                
                alert('✅ Sito esportato come ZIP!\n\n📁 Struttura:\n• index.html (homepage)\n• altre-pagine.html\n• images/ (tutte le foto)\n• css/style.css\n\n🚀 Carica tutto su GitHub!');
                
            } catch (error) {
                console.error('Errore export:', error);
                var errorMsg = '❌ Errore durante l\'export!\n\n';
                errorMsg += 'Dettagli: ' + error.message + '\n\n';
                errorMsg += 'Suggerimenti:\n';
                errorMsg += '• Verifica che tutte le immagini siano caricate correttamente\n';
                errorMsg += '• Prova a ridurre il numero di immagini o la loro dimensione\n';
                errorMsg += '• Salva il progetto e riprova\n\n';
                errorMsg += 'Se il problema persiste, controlla la console del browser (F12).';
                alert(errorMsg);
                progressDiv.style.display = 'none';
                progressBar.style.display = 'none';
            }
        }
        
        function updateProgress(percent, message) {
            var progressFill = document.getElementById('progressFill');
            progressFill.style.width = percent + '%';
            progressFill.textContent = message;
        }
        
        function getImageExtension(base64) {
            if (base64.includes('data:image/png')) return '.png';
            if (base64.includes('data:image/gif')) return '.gif';
            if (base64.includes('data:image/webp')) return '.webp';
            return '.jpg';
        }
        
        function sanitizeFilename(name) {
            return name.toLowerCase()
                .replace(/[àáâãäå]/g, 'a')
                .replace(/[èéêë]/g, 'e')
                .replace(/[ìíîï]/g, 'i')
                .replace(/[òóôõö]/g, 'o')
                .replace(/[ùúûü]/g, 'u')
                .replace(/[^a-z0-9]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '');
        }
        
        function getPageFilename(page, allPages) {
            // Se è la prima pagina visibile, è index.html
            if (allPages && allPages.length > 0 && allPages[0].id === page.id) {
                return 'index.html';
            }
            return sanitizeFilename(page.name) + '.html';
        }
        
        function generateCSS() {
            var headerPositionCSS = data.headerPosition === 'sticky' 
                ? 'position: sticky; top: 0; z-index: 1000;' 
                : 'position: relative;';
            
            // Rimuovi font personalizzati per compatibilità GitHub Pages
            var fontFamilyCSS = data.fontFamily;
            if (data.fontFamily === 'custom') {
                fontFamilyCSS = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
            }
            
            return `/* ${data.siteName} - Generato con Photo Site Builder Pro */
/* Versione corretta per GitHub Pages */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: ${fontFamilyCSS};
    background: ${data.primaryColor} !important;
    color: ${data.secondaryColor} !important;
    line-height: 1.6;
    min-height: 100vh;
}

.container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

header {
    padding: 40px 20px;
    border-bottom: 2px solid ${data.accentColor};
    background: ${data.primaryColor} !important;
    ${headerPositionCSS}
    min-height: ${data.headerHeight}px;
}

header a {
    text-decoration: none;
    transition: color 0.3s;
    color: ${data.secondaryColor};
}

header a:hover {
    color: ${data.accentColor} !important;
}

/* Dropdown menu styles */
.dropdown {
    position: relative;
    display: inline-block;
}

.dropdown-content {
    display: none;
    position: absolute;
    background-color: ${data.primaryColor};
    min-width: 200px;
    box-shadow: 0px 8px 16px 0px rgba(0,0,0,0.4);
    z-index: 1000;
    border: 1px solid ${data.accentColor};
    border-radius: 4px;
    margin-top: 8px;
    padding: 5px 0;
    left: 0;
}

.dropdown-content a {
    color: ${data.secondaryColor} !important;
    padding: 12px 20px;
    text-decoration: none;
    display: block;
    transition: all 0.2s ease;
}

.dropdown-content a:hover {
    background-color: ${data.accentColor} !important;
    color: ${data.primaryColor} !important;
}

.dropdown:hover .dropdown-content {
    display: block;
}

.dropdown > span {
    cursor: pointer;
    padding: 5px 10px;
    display: inline-block;
    user-select: none;
    color: ${data.secondaryColor};
}

.dropdown > span:hover {
    color: ${data.accentColor};
}

/* Bridge area - creates invisible area between dropdown trigger and menu */
.dropdown::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 100%;
    height: 10px;
}

h2 {
    margin: 40px 0 20px;
    color: ${data.accentColor} !important;
    font-size: 2em;
    font-weight: 300;
}

.canvas {
    position: relative;
    background: rgba(255, 255, 255, 0.05) !important;
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 40px;
}

.text-box {
    padding: 10px;
    background: rgba(0, 0, 0, 0.8);
    border-radius: 4px;
    max-width: 300px;
}

img {
    border-radius: 4px;
    max-width: 100%;
    height: auto;
}

/* Blank mode styles */
.blank-canvas {
    width: 100vw;
    min-height: 100vh;
    position: relative;
    background: ${data.primaryColor} !important;
}

@media (max-width: 768px) {
    .container {
        padding: 10px;
    }
    
    header {
        padding: 20px 10px;
        min-height: auto !important;
    }
    
    h2 {
        font-size: 1.5em;
    }
    
    .dropdown-content {
        min-width: 160px;
    }
}`;
        }
        
        function generatePageHTML(page, imageMap, allPages, isIndex) {
            var isBlankMode = page.layoutMode === 'blank';
            
            if (isBlankMode) {
                // Modalità completamente vuota - solo canvas senza header, container o titolo
                var pageContent = generatePageContent(page, imageMap, allPages, true); // true = blank mode
                
                return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name} - ${data.siteName}</title>
    <meta name="author" content="${data.author}">
    <link rel="stylesheet" href="css/style.css">
    <style>
        body { margin: 0; padding: 0; overflow-x: hidden; }
        .blank-canvas { 
            width: 100vw; 
            min-height: 100vh;
            position: relative;
        }
    </style>
</head>
<body>
    ${pageContent}
</body>
</html>`;
            } else {
                // Modalità normale con header e struttura
                var headerHTML = generateHeaderHTML(imageMap, allPages, isIndex);
                var pageContent = generatePageContent(page, imageMap, allPages, false);
                
                return `<!DOCTYPE html>
<html lang="it">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page.name} - ${data.siteName}</title>
    <meta name="author" content="${data.author}">
    <link rel="stylesheet" href="css/style.css">
</head>
<body>
    ${headerHTML}
    <div class="container">
        ${pageContent}
    </div>
</body>
</html>`;
            }
        }
        
        function generateHeaderHTML(imageMap, allPages, isIndex) {
            var html = '<header>';
            
            data.header.elements.forEach(function(el) {
                if (!el.visible) return;
                
                if (el.type === 'text') {
                    html += '<div style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ' !important;font-weight:' + (el.isTitle ? 'bold' : 'normal') + '">' + el.text + '</div>';
                } else if (el.type === 'menu') {
                    var href = '#';
                    if (el.linkType === 'page') {
                        var linkedPage = findPageById(el.linkPageId);
                        if (linkedPage) {
                            // Se il link punta alla prima pagina (homepage), usa sempre index.html
                            if (allPages.length > 0 && el.linkPageId === allPages[0].id) {
                                href = 'index.html';
                            } else {
                                href = sanitizeFilename(linkedPage.name) + '.html';
                            }
                        }
                    } else if (el.linkType === 'external') {
                        href = el.externalUrl;
                    }
                    
                    var target = el.linkType === 'external' ? ' target="_blank"' : '';
                    html += '<a href="' + href + '"' + target + ' style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ' !important">' + el.text + '</a>';
                } else if (el.type === 'dropdown') {
                    html += '<div class="dropdown" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ' !important;cursor:pointer;">';
                    html += '<span>' + el.text + ' ▼</span>';
                    html += '<div class="dropdown-content">';
                    
                    if (el.items && el.items.length > 0) {
                        el.items.forEach(function(item) {
                            var itemHref = '#';
                            var itemTarget = '';
                            
                            if (item.linkType === 'page') {
                                var linkedPage = findPageById(item.linkPageId);
                                if (linkedPage) {
                                    if (allPages.length > 0 && item.linkPageId === allPages[0].id) {
                                        itemHref = 'index.html';
                                    } else {
                                        itemHref = sanitizeFilename(linkedPage.name) + '.html';
                                    }
                                }
                            } else if (item.linkType === 'external') {
                                itemHref = item.externalUrl;
                                itemTarget = ' target="_blank"';
                            }
                            
                            html += '<a href="' + itemHref + '"' + itemTarget + '>' + item.text + '</a>';
                        });
                    } else {
                        html += '<a href="#" style="color:#999;cursor:default;">Nessun elemento</a>';
                    }
                    
                    html += '</div></div>';
                } else if (el.type === 'image') {
                    var imgSrc = imageMap[el.src] ? 'images/' + imageMap[el.src] : el.src;
                    html += '<img src="' + imgSrc + '" alt="Logo" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;width:' + el.width + 'px;height:' + el.height + 'px;object-fit:cover">';
                } else if (el.type === 'imageLink') {
                    var imgSrc = imageMap[el.src] ? 'images/' + imageMap[el.src] : el.src;
                    var href = '#';
                    var target = '';
                    
                    if (el.linkType === 'page') {
                        var linkedPage = findPageById(el.linkPageId);
                        if (linkedPage) {
                            if (allPages.length > 0 && el.linkPageId === allPages[0].id) {
                                href = 'index.html';
                            } else {
                                href = sanitizeFilename(linkedPage.name) + '.html';
                            }
                        }
                    } else if (el.linkType === 'external') {
                        href = el.externalUrl;
                        target = ' target="_blank"';
                    }
                    
                    html += '<a href="' + href + '"' + target + ' style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px"><img src="' + imgSrc + '" alt="Logo" style="width:' + el.width + 'px;height:' + el.height + 'px;object-fit:cover"></a>';
                }
            });
            
            html += '</header>';
            return html;
        }
        
        function generatePageContent(page, imageMap, allPages, isBlankMode) {
            var bgStyle = '';
            if (page.backgroundImage) {
                var bgSrc = imageMap[page.backgroundImage] ? 'images/' + imageMap[page.backgroundImage] : page.backgroundImage;
                bgStyle = 'background-image:url(' + bgSrc + ');background-size:cover;background-position:center;';
            }
            
            var itemsHTML = '';
            if (page.items) {
                itemsHTML = page.items.map(function(item) {
                    if (item.type === 'image') {
                        var imgSrc = imageMap[item.src] ? 'images/' + imageMap[item.src] : item.src;
                        return '<div style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;width:' + item.width + 'px;height:' + item.height + 'px"><img src="' + imgSrc + '" alt="" style="width:100%;height:100%;object-fit:cover;filter:brightness(' + item.brightness + '%) contrast(' + item.contrast + '%) saturate(' + item.saturation + '%) rotate(' + item.rotation + 'deg)"></div>';
                    } else if (item.type === 'freetext') {
                        return '<div style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ' !important;font-weight:' + item.fontWeight + '">' + item.text + '</div>';
                    } else if (item.type === 'freeimage') {
                        var imgSrc = imageMap[item.src] ? 'images/' + imageMap[item.src] : item.src;
                        return '<div style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;width:' + item.width + 'px;height:' + item.height + 'px"><img src="' + imgSrc + '" alt="" style="width:100%;height:100%;object-fit:cover"></div>';
                    } else if (item.type === 'pageimagelink') {
                        var imgSrc = imageMap[item.src] ? 'images/' + imageMap[item.src] : item.src;
                        var href = '#';
                        var target = '';
                        if (item.linkType === 'page') {
                            var linkedPage = findPageById(item.linkPageId);
                            if (linkedPage) {
                                // Se il link punta alla prima pagina (homepage), usa index.html
                                if (allPages && allPages.length > 0 && item.linkPageId === allPages[0].id) {
                                    href = 'index.html';
                                } else {
                                    href = sanitizeFilename(linkedPage.name) + '.html';
                                }
                            }
                        } else if (item.linkType === 'external') {
                            href = item.externalUrl;
                            target = ' target="_blank"';
                        }
                        return '<a href="' + href + '"' + target + ' style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px"><img src="' + imgSrc + '" alt="' + (item.name || '') + '" style="width:' + item.width + 'px;height:' + item.height + 'px;object-fit:cover"></a>';
                    } else if (item.type === 'menulink') {
                        var href = '#';
                        var target = '';
                        if (item.linkType === 'page') {
                            var linkedPage = findPageById(item.linkPageId);
                            if (linkedPage) {
                                // Se il link punta alla prima pagina (homepage), usa index.html
                                if (allPages && allPages.length > 0 && item.linkPageId === allPages[0].id) {
                                    href = 'index.html';
                                } else {
                                    href = sanitizeFilename(linkedPage.name) + '.html';
                                }
                            }
                        } else if (item.linkType === 'external') {
                            href = item.externalUrl;
                            target = ' target="_blank"';
                        }
                        return '<a href="' + href + '"' + target + ' style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ' !important;text-decoration:none">' + item.text + '</a>';
                    } else if (item.type === 'dropdown') {
                        var dropdownHTML = '<div class="dropdown" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ' !important;cursor:pointer;">';
                        dropdownHTML += '<span>' + item.text + ' ▼</span>';
                        dropdownHTML += '<div class="dropdown-content">';
                        if (item.items && item.items.length > 0) {
                            item.items.forEach(function(subItem) {
                                var subHref = '#';
                                var subTarget = '';
                                if (subItem.linkType === 'page') {
                                    var linkedPage = findPageById(subItem.linkPageId);
                                    if (linkedPage) {
                                        // Se il link punta alla prima pagina (homepage), usa index.html
                                        if (allPages && allPages.length > 0 && subItem.linkPageId === allPages[0].id) {
                                            subHref = 'index.html';
                                        } else {
                                            subHref = sanitizeFilename(linkedPage.name) + '.html';
                                        }
                                    }
                                } else if (subItem.linkType === 'external') {
                                    subHref = subItem.externalUrl;
                                    subTarget = ' target="_blank"';
                                }
                                dropdownHTML += '<a href="' + subHref + '"' + subTarget + '>' + subItem.text + '</a>';
                            });
                        }
                        dropdownHTML += '</div></div>';
                        return dropdownHTML;
                    }
                    return '<div class="text-box" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ' !important">' + item.text + '</div>';
                }).join('');
            }
            
            if (isBlankMode) {
                // Modalità vuota: solo canvas senza titolo
                return '<div class="blank-canvas" style="height:' + page.height + 'px;' + bgStyle + '">' + itemsHTML + '</div>';
            } else {
                // Modalità normale: con titolo
                return '<h2>' + page.name + '</h2><div class="canvas" style="height:' + page.height + 'px;' + bgStyle + '">' + itemsHTML + '</div>';
            }
        }
        
        function findPageById(id) {
            for (var i = 0; i < data.pages.length; i++) {
                if (data.pages[i].id === id) return data.pages[i];
                if (data.pages[i].subPages) {
                    for (var j = 0; j < data.pages[i].subPages.length; j++) {
                        if (data.pages[i].subPages[j].id === id) {
                            return data.pages[i].subPages[j];
                        }
                    }
                }
            }
            return null;
        }

        // Funzione helper riutilizzabile per selezionare una pagina tramite prompt
        function selectPageByPrompt(promptMessage) {
            if (data.pages.length === 0) {
                alert('Nessuna pagina disponibile! Crea prima delle pagine.');
                return null;
            }

            var pagesList = promptMessage || 'Scegli la pagina:\n\n';
            var pageIndex = 1;
            var pagesMap = []; // Mappa indice -> pageId

            data.pages.forEach(function(p) {
                if (p.type === 'normal') {
                    pagesList += pageIndex + '. ' + p.name + '\n';
                    pagesMap.push(p.id);
                    pageIndex++;
                } else if (p.type === 'gallery' && p.subPages) {
                    p.subPages.forEach(function(sub) {
                        pagesList += pageIndex + '. ' + p.name + ' → ' + sub.name + '\n';
                        pagesMap.push(sub.id);
                        pageIndex++;
                    });
                }
            });

            var choice = prompt(pagesList + '\nInserisci il numero:');
            if (!choice) return null;

            var choiceNum = parseInt(choice);
            if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > pagesMap.length) {
                alert('Numero non valido!');
                return null;
            }

            return pagesMap[choiceNum - 1]; // Ritorna il page ID
        }

        function generateReadme() {
            return `${data.siteName}
Creato con Photo Site Builder Pro

STRUTTURA DEL SITO:
==================
• index.html - Homepage (prima pagina)
• [nome-pagina].html - Altre pagine del sito
• images/ - Cartella con tutte le immagini
• css/style.css - File degli stili

COME CARICARE SU GITHUB:
========================
1. Crea un nuovo repository su GitHub
2. Estrai questo ZIP
3. Carica tutti i file mantenendo la struttura delle cartelle
4. Vai su Settings > Pages
5. Seleziona il branch main come source
6. Il tuo sito sarà pubblicato su: username.github.io/nome-repo

PERSONALIZZAZIONE:
=================
• Puoi modificare il CSS in css/style.css
• Le immagini sono nella cartella images/
• Ogni pagina è un file HTML separato

Autore: ${data.author}
Data: ${new Date().toLocaleDateString('it-IT')}
`;
        }

        // ===== TAB SWITCHING =====
        function switchTab(tab, e) {
            document.querySelectorAll('.section').forEach(function(s) { s.classList.remove('active'); });
            document.getElementById(tab).classList.add('active');
            document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
            if (e && e.target) e.target.classList.add('active');
            
            if (tab === 'structure') renderPagesList();
            if (tab === 'header') renderHeaderList();
            if (tab === 'settings') updateTotalProjectSize();
            if (tab === 'editor' && currentPageId) {
                document.getElementById('editorContent').style.display = 'block';
                showSelectedInfo();
                updatePageSizeInfo();
            }
        }

        // ===== GESTIONE PAGINE =====
        function renderPagesList() {
            var html = '';
            if (data.pages.length === 0) {
                html = '<div class="info-panel">Nessuna pagina. Inizia creando la tua prima pagina!</div>';
            } else {
                data.pages.forEach(function(p) {
                    var visIcon = p.visible ? '👁️' : '👁️‍🗨️';
                    if (p.type === 'gallery') {
                        html += '<div class="page-item"><span class="page-item-name">📁 ' + p.name + '</span><div class="page-item-actions">';
                        html += '<button class="icon-btn" onclick="toggleVisibility(' + p.id + ')">' + visIcon + '</button>';
                        html += '<button class="icon-btn" onclick="renamePage(' + p.id + ')">✏️</button>';
                        html += '<button class="icon-btn danger" onclick="deletePage(' + p.id + ')">🗑️</button>';
                        html += '</div></div>';
                        
                        if (p.subPages) {
                            p.subPages.forEach(function(sub) {
                                var subVisIcon = sub.visible ? '👁️' : '👁️‍🗨️';
                                html += '<div class="page-item sub-page"><span class="page-item-name">└ ' + sub.name + '</span><div class="page-item-actions">';
                                html += '<button class="icon-btn" onclick="selectPage(' + sub.id + ', ' + p.id + ')">📝</button>';
                                html += '<button class="icon-btn" onclick="toggleSubVisibility(' + p.id + ',' + sub.id + ')">' + subVisIcon + '</button>';
                                html += '<button class="icon-btn danger" onclick="deleteSubPage(' + p.id + ',' + sub.id + ')">🗑️</button>';
                                html += '</div></div>';
                            });
                        }
                        html += '<button class="button-primary" style="margin-left:30px;margin-bottom:15px;background:#9c27b0;padding:8px 12px" onclick="addSubPage(' + p.id + ')">+ Sottopagina</button>';
                    } else {
                        html += '<div class="page-item"><span class="page-item-name">📄 ' + p.name + '</span><div class="page-item-actions">';
                        html += '<button class="icon-btn" onclick="selectPage(' + p.id + ')">📝</button>';
                        html += '<button class="icon-btn" onclick="toggleVisibility(' + p.id + ')">' + visIcon + '</button>';
                        html += '<button class="icon-btn" onclick="renamePage(' + p.id + ')">✏️</button>';
                        html += '<button class="icon-btn danger" onclick="deletePage(' + p.id + ')">🗑️</button>';
                        html += '</div></div>';
                    }
                });
            }
            document.getElementById('pagesList').innerHTML = html;
        }

        function addPage(type) {
            var name = prompt(type === 'gallery' ? 'Nome galleria (es: Portfolio):' : 'Nome pagina (es: Chi Sono):');
            if (!name) return;
            
            if (type === 'gallery') {
                data.pages.push({
                    id: nextPageId++,
                    name: name,
                    type: 'gallery',
                    visible: true,
                    subPages: []
                });
            } else {
                data.pages.push({
                    id: nextPageId++,
                    name: name,
                    type: 'normal',
                    visible: true,
                    height: 1000,
                    items: [],
                    backgroundImage: null,
                    layoutMode: 'default' // 'default' con header, 'blank' completamente vuota
                });
            }
            renderPagesList();
        }

        function addSubPage(parentId) {
            var parent = data.pages.find(function(p) { return p.id === parentId; });
            if (!parent) return;
            var name = prompt('Nome sottopagina:');
            if (!name) return;
            parent.subPages.push({
                id: nextPageId++,
                name: name,
                visible: true,
                height: 1000,
                items: [],
                backgroundImage: null,
                layoutMode: 'default'
            });
            renderPagesList();
        }

        function selectPage(pageId, parentId) {
            currentPageId = pageId;
            switchTab('editor');
            var page = getCurrentPage();
            if (page) {
                document.getElementById('currentPageName').textContent = 'Modifica: ' + page.name;
                document.getElementById('editorContent').style.display = 'block';
                document.getElementById('canvasHeight').value = page.height;
                document.getElementById('canvasHeightValue').textContent = page.height;
                
                // Imposta la modalità layout
                if (!page.layoutMode) page.layoutMode = 'default';
                document.getElementById('layoutModeSelect').value = page.layoutMode;
                
                // Mostra/nascondi pulsanti modalità vuota
                var blankButtons = document.getElementById('blankModeButtons');
                if (page.layoutMode === 'blank') {
                    blankButtons.style.display = 'block';
                } else {
                    blankButtons.style.display = 'none';
                }
                
                renderPageElementsList();
                updatePreview();
                updatePageSizeInfo();
            }
        }

        function renamePage(pageId) {
            var page = data.pages.find(function(p) { return p.id === pageId; });
            if (!page) return;
            var newName = prompt('Nuovo nome:', page.name);
            if (newName) {
                page.name = newName;
                renderPagesList();
            }
        }

        function deletePage(pageId) {
            if (!confirm('Eliminare questa pagina?')) return;
            data.pages = data.pages.filter(function(p) { return p.id !== pageId; });
            if (currentPageId === pageId) currentPageId = null;
            renderPagesList();
            updatePreview();
        }

        function deleteSubPage(parentId, subId) {
            if (!confirm('Eliminare questa sottopagina?')) return;
            var parent = data.pages.find(function(p) { return p.id === parentId; });
            if (parent) {
                parent.subPages = parent.subPages.filter(function(s) { return s.id !== subId; });
                if (currentPageId === subId) currentPageId = null;
                renderPagesList();
                updatePreview();
            }
        }

        function toggleVisibility(pageId) {
            var page = data.pages.find(function(p) { return p.id === pageId; });
            if (page) {
                page.visible = !page.visible;
                renderPagesList();
            }
        }

        function toggleSubVisibility(parentId, subId) {
            var parent = data.pages.find(function(p) { return p.id === parentId; });
            if (parent) {
                var sub = parent.subPages.find(function(s) { return s.id === subId; });
                if (sub) {
                    sub.visible = !sub.visible;
                    renderPagesList();
                }
            }
        }

        function getCurrentPage() {
            for (var i = 0; i < data.pages.length; i++) {
                if (data.pages[i].id === currentPageId) return data.pages[i];
                if (data.pages[i].subPages) {
                    for (var j = 0; j < data.pages[i].subPages.length; j++) {
                        if (data.pages[i].subPages[j].id === currentPageId) {
                            return data.pages[i].subPages[j];
                        }
                    }
                }
            }
            return null;
        }

        // ===== GESTIONE HEADER (identico all'originale) =====
        function renderHeaderList() {
            var html = '';
            if (data.header.elements.length === 0) {
                html = '<div class="info-panel">Nessun elemento nell\'header. Inizia aggiungendo testo, menu o logo!</div>';
            } else {
                data.header.elements.forEach(function(el) {
                    var icon = el.type === 'text' ? '📝' : (el.type === 'image' || el.type === 'imageLink' ? '🖼️' : '🔗');
                    var displayText = '';
                    
                    if (el.type === 'image') {
                        displayText = (el.name || 'Immagine') + ' (' + el.width + 'x' + el.height + ')';
                    } else if (el.type === 'imageLink') {
                        displayText = (el.name || 'Immagine Link') + ' (' + el.width + 'x' + el.height + ')';
                        if (el.linkType === 'page') {
                            var linkedPage = findPageById(el.linkPageId);
                            if (linkedPage) displayText += ' → ' + linkedPage.name;
                        } else if (el.linkType === 'external') {
                            displayText += ' → Esterno';
                        }
                    } else {
                        displayText = el.text;
                    }
                    
                    var visIcon = el.visible ? '👁️' : '👁️‍🗨️';
                    
                    html += '<div class="header-item"><span class="page-item-name">' + icon + ' ' + displayText + '</span><div class="page-item-actions">';
                    html += '<button class="icon-btn" onclick="editHeaderElement(' + el.id + ')">✏️</button>';
                    html += '<button class="icon-btn" onclick="toggleHeaderVisibility(' + el.id + ')">' + visIcon + '</button>';
                    html += '<button class="icon-btn danger" onclick="deleteHeaderElement(' + el.id + ')">🗑️</button>';
                    html += '</div></div>';
                });
            }
            document.getElementById('headerList').innerHTML = html;
        }

        function addHeaderElement(type) {
            if (type === 'text') {
                var text = prompt('Testo header (es: IL MIO SITO):');
                if (!text) return;
                var isTitle = confirm('È il titolo principale del sito?');
                data.header.elements.push({
                    id: nextHeaderId++,
                    type: 'text',
                    text: text,
                    x: 50,
                    y: 80,
                    fontSize: isTitle ? 32 : 16,
                    color: '#ffffff',
                    visible: true,
                    isTitle: isTitle
                });
            } else if (type === 'menu') {
                var text = prompt('Testo menu (es: Home, Chi Sono):');
                if (!text) return;
                var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';
                
                var newEl = {
                    id: nextHeaderId++,
                    type: 'menu',
                    text: text,
                    x: 50,
                    y: 120,
                    fontSize: 16,
                    color: '#ffffff',
                    visible: true,
                    linkType: linkType
                };
                
                if (linkType === 'page' && data.pages.length > 0) {
                    newEl.linkPageId = data.pages[0].id;
                } else if (linkType === 'external') {
                    var url = prompt('URL (es: https://esempio.com):');
                    if (!url) return;
                    newEl.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                }
                
                data.header.elements.push(newEl);
            } else if (type === 'dropdown') {
                var text = prompt('Testo menu principale (es: Gallery, Portfolio):');
                if (!text) return;
                
                data.header.elements.push({
                    id: nextHeaderId++,
                    type: 'dropdown',
                    text: text,
                    x: 50,
                    y: 120,
                    fontSize: 16,
                    color: '#ffffff',
                    visible: true,
                    items: []
                });
            }
            renderHeaderList();
            updatePreview();
        }

        function addHeaderImage(e) {
            var file = e.target.files[0];
            if (!file) return;

            var imageName = prompt('Dai un nome a questa immagine (es: "Logo", "Banner"):', 'Logo');
            if (!imageName) imageName = 'Immagine ' + nextHeaderId;

            // Ottimizza l'immagine
            optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                data.header.elements.push({
                    id: nextHeaderId++,
                    type: 'image',
                    name: imageName,
                    src: optimizedSrc,
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    visible: true
                });
                renderHeaderList();
                updatePreview();
                updateTotalProjectSize();
            });
            e.target.value = '';
        }

        function addHeaderImageWithLink(e) {
            var file = e.target.files[0];
            if (!file) return;

            var imageName = prompt('Dai un nome a questa immagine con link (es: "Logo Home", "Banner Prodotti"):', 'Logo Link');
            if (!imageName) imageName = 'Immagine Link ' + nextHeaderId;

            var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';

            // Ottimizza l'immagine
            optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                var newEl = {
                    id: nextHeaderId++,
                    type: 'imageLink',
                    name: imageName,
                    src: optimizedSrc,
                    x: 50,
                    y: 50,
                    width: 100,
                    height: 100,
                    visible: true,
                    linkType: linkType
                };

                if (linkType === 'page' && data.pages.length > 0) {
                    newEl.linkPageId = data.pages[0].id;
                } else if (linkType === 'external') {
                    var url = prompt('URL (es: https://esempio.com):');
                    if (!url) return;
                    newEl.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                }

                data.header.elements.push(newEl);
                renderHeaderList();
                updatePreview();
                updateTotalProjectSize();
            });
            e.target.value = '';
        }

        function toggleImageLinkFields() {
            var linkType = document.getElementById('headerEditImageLinkType').value;
            document.getElementById('headerImageLinkPageGroup').style.display = linkType === 'page' ? 'block' : 'none';
            document.getElementById('headerImageLinkUrlGroup').style.display = linkType === 'external' ? 'block' : 'none';
        }
        
        function addDropdownItem() {
            var el = data.header.elements.find(function(e) { return e.id === editingHeaderId; });
            if (!el || el.type !== 'dropdown') return;
            
            var text = prompt('Testo sottomenu:');
            if (!text) return;
            
            var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';
            
            var newItem = {
                text: text,
                linkType: linkType
            };
            
            if (linkType === 'page') {
                // Usa la funzione helper per selezionare la pagina
                var selectedPageId = selectPageByPrompt('Scegli la pagina da collegare:\n\n');
                if (!selectedPageId) return;
                newItem.linkPageId = selectedPageId;
            } else if (linkType === 'external') {
                var url = prompt('URL (es: https://esempio.com):');
                if (!url) return;
                newItem.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
            }
            
            el.items.push(newItem);
            renderDropdownItems();
        }
        
        function renderDropdownItems() {
            var el = data.header.elements.find(function(e) { return e.id === editingHeaderId; });
            if (!el || el.type !== 'dropdown') return;
            
            var html = '';
            if (el.items && el.items.length > 0) {
                el.items.forEach(function(item, index) {
                    var linkInfo = '';
                    if (item.linkType === 'page') {
                        var linkedPage = findPageById(item.linkPageId);
                        linkInfo = linkedPage ? '🔗 ' + linkedPage.name : '🔗 Pagina';
                    } else {
                        linkInfo = '🌐 ' + (item.externalUrl || 'Esterno');
                    }
                    
                    html += '<div style="background:#fff; padding:8px; margin-bottom:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">';
                    html += '<div><strong>' + item.text + '</strong><br><small style="color:#666;">' + linkInfo + '</small></div>';
                    html += '<div><button class="icon-btn" onclick="editDropdownItemPage(' + index + ')" title="Modifica link">✏️</button>';
                    html += '<button class="icon-btn danger" onclick="removeDropdownItem(' + index + ')">🗑️</button></div>';
                    html += '</div>';
                });
            } else {
                html = '<p style="color:#999; font-size:0.9em;">Nessuna voce nel sottomenu</p>';
            }
            document.getElementById('dropdownItemsList').innerHTML = html;
        }
        
        function editDropdownItemPage(index) {
            var el = data.header.elements.find(function(e) { return e.id === editingHeaderId; });
            if (!el || el.type !== 'dropdown' || !el.items[index]) return;
            
            var item = el.items[index];
            
            if (item.linkType === 'page') {
                // Usa la funzione helper per selezionare la pagina
                var selectedPageId = selectPageByPrompt('Cambia pagina collegata a "' + item.text + '":\n\n');
                if (selectedPageId) {
                    item.linkPageId = selectedPageId;
                    renderDropdownItems();
                    updatePreview();
                }
            } else {
                // Cambia URL esterno
                var newUrl = prompt('Nuovo URL:', item.externalUrl || '');
                if (newUrl) {
                    item.externalUrl = newUrl.match(/^https?:\/\//) ? newUrl : 'https://' + newUrl;
                    renderDropdownItems();
                    updatePreview();
                }
            }
        }
        
        function removeDropdownItem(index) {
            var el = data.header.elements.find(function(e) { return e.id === editingHeaderId; });
            if (!el || el.type !== 'dropdown') return;
            
            if (confirm('Eliminare questa voce?')) {
                el.items.splice(index, 1);
                renderDropdownItems();
            }
        }

        function editHeaderElement(id) {
            var el = data.header.elements.find(function(e) { return e.id === id; });
            if (!el) return;
            
            editingHeaderId = id;
            document.getElementById('headerEditPanel').style.display = 'block';
            
            var isImageLink = el.type === 'imageLink';
            var isImage = el.type === 'image';
            
            document.getElementById('headerEditTitle').textContent = 'Modifica: ' + (isImage || isImageLink ? 'Immagine' : el.text);
            
            document.getElementById('headerTextGroup').style.display = el.type === 'text' || el.type === 'menu' || el.type === 'dropdown' ? 'block' : 'none';
            document.getElementById('headerMenuLinkGroup').style.display = el.type === 'menu' && el.linkType === 'page' ? 'block' : 'none';
            document.getElementById('headerExternalUrlGroup').style.display = el.type === 'menu' && el.linkType === 'external' ? 'block' : 'none';
            document.getElementById('headerFontSizeGroup').style.display = el.type !== 'image' && el.type !== 'imageLink' ? 'block' : 'none';
            document.getElementById('headerColorGroup').style.display = el.type !== 'image' && el.type !== 'imageLink' ? 'block' : 'none';
            document.getElementById('headerImageNameGroup').style.display = isImage || isImageLink ? 'block' : 'none';
            document.getElementById('headerImageWidthGroup').style.display = isImage || isImageLink ? 'block' : 'none';
            document.getElementById('headerImageHeightGroup').style.display = isImage || isImageLink ? 'block' : 'none';
            
            document.getElementById('headerImageLinkTypeGroup').style.display = isImageLink ? 'block' : 'none';
            document.getElementById('headerImageLinkPageGroup').style.display = 'none';
            document.getElementById('headerImageLinkUrlGroup').style.display = 'none';
            document.getElementById('headerDropdownGroup').style.display = el.type === 'dropdown' ? 'block' : 'none';
            
            if (el.type === 'text' || el.type === 'menu' || el.type === 'dropdown') {
                document.getElementById('headerEditText').value = el.text;
                document.getElementById('headerEditFontSize').value = el.fontSize;
                document.getElementById('headerEditFontSizeValue').textContent = el.fontSize;
                document.getElementById('headerEditColor').value = el.color;
                
                if (el.type === 'dropdown') {
                    renderDropdownItems();
                } else if (el.type === 'menu') {
                    if (el.linkType === 'page') {
                        var select = document.getElementById('headerEditMenuLink');
                        select.innerHTML = '';
                        data.pages.forEach(function(p) {
                            if (p.type === 'normal') {
                                var opt = document.createElement('option');
                                opt.value = p.id;
                                opt.textContent = p.name;
                                if (p.id === el.linkPageId) opt.selected = true;
                                select.appendChild(opt);
                            } else if (p.type === 'gallery' && p.subPages) {
                                p.subPages.forEach(function(sub) {
                                    var opt = document.createElement('option');
                                    opt.value = sub.id;
                                    opt.textContent = p.name + ' → ' + sub.name;
                                    if (sub.id === el.linkPageId) opt.selected = true;
                                    select.appendChild(opt);
                                });
                            }
                        });
                    } else if (el.linkType === 'external') {
                        document.getElementById('headerEditExternalUrl').value = el.externalUrl || '';
                    }
                }
            } else if (isImage || isImageLink) {
                document.getElementById('headerEditImageName').value = el.name || '';
                document.getElementById('headerEditWidth').value = el.width;
                document.getElementById('headerEditWidthValue').textContent = el.width;
                document.getElementById('headerEditHeight').value = el.height;
                document.getElementById('headerEditHeightValue').textContent = el.height;
                
                if (isImageLink) {
                    document.getElementById('headerEditImageLinkType').value = el.linkType || 'none';
                    
                    if (el.linkType === 'page') {
                        document.getElementById('headerImageLinkPageGroup').style.display = 'block';
                        var select = document.getElementById('headerEditImageLinkPage');
                        select.innerHTML = '';
                        data.pages.forEach(function(p) {
                            if (p.type === 'normal') {
                                var opt = document.createElement('option');
                                opt.value = p.id;
                                opt.textContent = p.name;
                                if (p.id === el.linkPageId) opt.selected = true;
                                select.appendChild(opt);
                            } else if (p.type === 'gallery' && p.subPages) {
                                p.subPages.forEach(function(sub) {
                                    var opt = document.createElement('option');
                                    opt.value = sub.id;
                                    opt.textContent = p.name + ' → ' + sub.name;
                                    if (sub.id === el.linkPageId) opt.selected = true;
                                    select.appendChild(opt);
                                });
                            }
                        });
                    } else if (el.linkType === 'external') {
                        document.getElementById('headerImageLinkUrlGroup').style.display = 'block';
                        document.getElementById('headerEditImageLinkUrl').value = el.externalUrl || '';
                    }
                }
            }
            
            document.getElementById('headerEditX').value = el.x;
            document.getElementById('headerEditXValue').textContent = el.x;
            document.getElementById('headerEditY').value = el.y;
            document.getElementById('headerEditYValue').textContent = el.y;
        }

        function saveHeaderEdit() {
            var el = data.header.elements.find(function(e) { return e.id === editingHeaderId; });
            if (!el) return;
            
            if (el.type === 'text' || el.type === 'menu' || el.type === 'dropdown') {
                el.text = document.getElementById('headerEditText').value;
                el.fontSize = parseInt(document.getElementById('headerEditFontSize').value);
                el.color = document.getElementById('headerEditColor').value;
                
                if (el.type === 'menu') {
                    if (el.linkType === 'page') {
                        el.linkPageId = parseInt(document.getElementById('headerEditMenuLink').value);
                    } else if (el.linkType === 'external') {
                        var url = document.getElementById('headerEditExternalUrl').value;
                        el.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                    }
                }
                // Dropdown items are already saved in el.items by addDropdownItem/removeDropdownItem
            } else if (el.type === 'image' || el.type === 'imageLink') {
                el.name = document.getElementById('headerEditImageName').value || 'Immagine';
                el.width = parseInt(document.getElementById('headerEditWidth').value);
                el.height = parseInt(document.getElementById('headerEditHeight').value);
                
                if (el.type === 'imageLink') {
                    var linkType = document.getElementById('headerEditImageLinkType').value;
                    el.linkType = linkType;
                    
                    if (linkType === 'page') {
                        el.linkPageId = parseInt(document.getElementById('headerEditImageLinkPage').value);
                        delete el.externalUrl;
                    } else if (linkType === 'external') {
                        var url = document.getElementById('headerEditImageLinkUrl').value;
                        el.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                        delete el.linkPageId;
                    } else {
                        delete el.linkPageId;
                        delete el.externalUrl;
                    }
                }
            }
            
            el.x = parseInt(document.getElementById('headerEditX').value);
            el.y = parseInt(document.getElementById('headerEditY').value);
            
            cancelHeaderEdit();
            renderHeaderList();
            updatePreview();
        }

        function cancelHeaderEdit() {
            document.getElementById('headerEditPanel').style.display = 'none';
            editingHeaderId = null;
        }

        function toggleHeaderVisibility(id) {
            var el = data.header.elements.find(function(e) { return e.id === id; });
            if (el) {
                el.visible = !el.visible;
                renderHeaderList();
                updatePreview();
            }
        }

        function deleteHeaderElement(id) {
            if (!confirm('Eliminare questo elemento?')) return;
            data.header.elements = data.header.elements.filter(function(e) { return e.id !== id; });
            renderHeaderList();
            updatePreview();
        }

        // ===== EDITOR CONTENUTI =====

        // Funzione helper per ottimizzare immagini
        function optimizeImage(file, maxWidth, maxHeight, quality, callback) {
            // Validazione dimensione file (max 10MB)
            var maxFileSize = 10 * 1024 * 1024; // 10MB
            if (file.size > maxFileSize) {
                alert('⚠️ Immagine troppo grande: ' + file.name + '\nDimensione: ' + (file.size / 1024 / 1024).toFixed(2) + ' MB\nMassimo consentito: 10 MB');
                return;
            }

            var reader = new FileReader();
            reader.onload = function(e) {
                var img = new Image();
                img.onload = function() {
                    var canvas = document.createElement('canvas');
                    var ctx = canvas.getContext('2d');

                    var width = img.width;
                    var height = img.height;

                    // Ridimensiona solo se supera i limiti
                    if (width > maxWidth || height > maxHeight) {
                        var ratio = Math.min(maxWidth / width, maxHeight / height);
                        width = Math.floor(width * ratio);
                        height = Math.floor(height * ratio);
                    }

                    canvas.width = width;
                    canvas.height = height;
                    ctx.drawImage(img, 0, 0, width, height);

                    // Converti in base64 con qualità specificata
                    var optimizedData = canvas.toDataURL('image/jpeg', quality);
                    callback(optimizedData);
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        function addPhoto(e) {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');

            Array.from(e.target.files).forEach(function(file) {
                // Ottimizza l'immagine prima di aggiungerla
                optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                    page.items.push({
                        id: nextItemId++,
                        type: 'image',
                        src: optimizedSrc,
                        x: 50,
                        y: 50,
                        width: 200,
                        height: 200,
                        brightness: 100,
                        contrast: 100,
                        saturation: 100,
                        rotation: 0
                    });
                    updatePreview();
                    updatePageSizeInfo();
                });
            });
            e.target.value = '';
        }

        function addTextBox() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            var text = prompt('Inserisci il testo:');
            if (!text) return;
            page.items.push({
                id: nextItemId++,
                type: 'text',
                text: text,
                x: 50,
                y: 50,
                fontSize: 16,
                color: '#ffffff'
            });
            updatePreview();
        }

        function addPageBackground(e) {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            var file = e.target.files[0];
            if (!file) return;

            // Ottimizza l'immagine di sfondo
            optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                page.backgroundImage = optimizedSrc;
                updatePreview();
                updatePageSizeInfo();
            });
            e.target.value = '';
        }
        
        function removePageBackground() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            if (!page.backgroundImage) return alert('Nessuno sfondo da rimuovere');
            
            if (confirm('Rimuovere lo sfondo della pagina?')) {
                page.backgroundImage = null;
                updatePreview();
                updatePageSizeInfo();
                alert('✅ Sfondo rimosso!');
            }
        }
        
        function changeLayoutMode() {
            var page = getCurrentPage();
            if (!page) return;
            
            page.layoutMode = document.getElementById('layoutModeSelect').value;
            
            // Mostra/nascondi pulsanti speciali per modalità vuota
            var blankButtons = document.getElementById('blankModeButtons');
            if (page.layoutMode === 'blank') {
                blankButtons.style.display = 'block';
            } else {
                blankButtons.style.display = 'none';
            }
            
            updatePreview();
            
            if (page.layoutMode === 'blank') {
                alert('✅ Modalità Canvas Libero attivata!\n\n📍 L\'header globale resta visibile\n📍 Il titolo della pagina è nascosto\n📍 Canvas libero per posizionare elementi ovunque!\n\nUsa "Elementi Solo per Questa Pagina" per aggiungere contenuti.');
            }
        }
        
        function addPageTextElement() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            var text = prompt('Inserisci il testo (es: IL MIO PORTFOLIO):');
            if (!text) return;
            
            var isLarge = confirm('Testo grande (titolo)?');
            
            page.items.push({
                id: nextItemId++,
                type: 'freetext',
                text: text,
                x: 50,
                y: 50,
                fontSize: isLarge ? 48 : 20,
                color: data.secondaryColor,
                fontWeight: isLarge ? 'bold' : 'normal'
            });
            updatePreview();
            updatePageSizeInfo();
        }
        
        function addPageImageElement(e) {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            var file = e.target.files[0];
            if (!file) return;

            // Ottimizza l'immagine
            optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                page.items.push({
                    id: nextItemId++,
                    type: 'freeimage',
                    src: optimizedSrc,
                    x: 50,
                    y: 50,
                    width: 150,
                    height: 150
                });
                updatePreview();
                updatePageSizeInfo();
            });
            e.target.value = '';
        }
        
        function renderPageElementsList() {
            var page = getCurrentPage();
            if (!page) {
                document.getElementById('pageElementsList').innerHTML = '';
                return;
            }
            
            var localElements = page.items.filter(function(item) {
                return item.type === 'freetext' || item.type === 'freeimage' || 
                       item.type === 'menulink' || item.type === 'dropdown' || 
                       item.type === 'pageimagelink';
            });
            
            var html = '';
            if (localElements.length === 0) {
                html = '<div class="info-panel" style="border-left-color:#999">Nessun elemento locale in questa pagina</div>';
            } else {
                localElements.forEach(function(el) {
                    var icon = '';
                    var displayText = '';
                    
                    if (el.type === 'freetext') {
                        icon = '📝';
                        displayText = 'Testo: ' + (el.text.length > 30 ? el.text.substring(0, 30) + '...' : el.text);
                    } else if (el.type === 'freeimage') {
                        icon = '🖼️';
                        displayText = 'Immagine (' + el.width + 'x' + el.height + ')';
                    } else if (el.type === 'pageimagelink') {
                        icon = '🖼️🔗';
                        displayText = (el.name || 'Immagine Link') + ' (' + el.width + 'x' + el.height + ')';
                        if (el.linkType === 'page') {
                            var linkedPage = findPageById(el.linkPageId);
                            if (linkedPage) displayText += ' → ' + linkedPage.name;
                        } else if (el.linkType === 'external') {
                            displayText += ' → Esterno';
                        }
                    } else if (el.type === 'menulink') {
                        icon = '🔗';
                        displayText = 'Link: ' + el.text;
                        if (el.linkType === 'page') {
                            var linkedPage = findPageById(el.linkPageId);
                            if (linkedPage) displayText += ' → ' + linkedPage.name;
                        } else {
                            displayText += ' → Esterno';
                        }
                    } else if (el.type === 'dropdown') {
                        icon = '📋';
                        var itemCount = el.items ? el.items.length : 0;
                        displayText = 'Menu: ' + el.text + ' (' + itemCount + ' voci)';
                    }
                    
                    html += '<div class="header-item" style="display:flex; justify-content:space-between; align-items:center; padding:10px; margin-bottom:8px; background:#fff; border-radius:4px; border:1px solid #ddd;">';
                    html += '<span class="page-item-name">' + icon + ' ' + displayText + '</span>';
                    html += '<div class="page-item-actions">';
                    html += '<button class="icon-btn" onclick="editPageElement(' + el.id + ')" title="Modifica">✏️</button>';
                    html += '<button class="icon-btn danger" onclick="deletePageElement(' + el.id + ')" title="Elimina">🗑️</button>';
                    html += '</div></div>';
                });
            }
            document.getElementById('pageElementsList').innerHTML = html;
        }
        
        function editPageElement(id) {
            var page = getCurrentPage();
            if (!page) return;
            var item = page.items.find(function(i) { return i.id === id; });
            if (!item) return;
            
            // Seleziona l'elemento nel canvas
            selectedId = id;
            updatePreview();
            showSelectedInfo();
        }
        
        function deletePageElement(id) {
            if (!confirm('Eliminare questo elemento?')) return;
            var page = getCurrentPage();
            if (!page) return;
            page.items = page.items.filter(function(i) { return i.id !== id; });
            selectedId = null;
            renderPageElementsList();
            updatePreview();
            showSelectedInfo();
            updatePageSizeInfo();
        }
        
        function addPageMenuLink() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            
            var text = prompt('Testo del link (es: Home, Contatti):');
            if (!text) return;
            
            var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';
            
            var newItem = {
                id: nextItemId++,
                type: 'menulink',
                text: text,
                x: 50,
                y: 50,
                fontSize: 18,
                color: data.secondaryColor,
                linkType: linkType
            };
            
            if (linkType === 'page' && data.pages.length > 0) {
                newItem.linkPageId = data.pages[0].id;
            } else if (linkType === 'external') {
                var url = prompt('URL (es: https://esempio.com):');
                if (!url) return;
                newItem.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
            }
            
            page.items.push(newItem);
            updatePreview();
            updatePageSizeInfo();
        }
        
        function addPageDropdown() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            
            var text = prompt('Testo menu principale (es: Portfolio, Gallery):');
            if (!text) return;
            
            page.items.push({
                id: nextItemId++,
                type: 'dropdown',
                text: text,
                x: 50,
                y: 50,
                fontSize: 18,
                color: data.secondaryColor,
                items: []
            });
            
            updatePreview();
            updatePageSizeInfo();
        }
        
        function addPageImageLink() {
            // Apre il file picker
            document.getElementById('pageImageLinkInput').click();
        }
        
        function addPageImageLinkElement(e) {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');

            var file = e.target.files[0];
            if (!file) return;

            var imageName = prompt('Nome per questa immagine (es: "Mappa Google", "Logo Partner"):', 'Immagine Link');
            if (!imageName) imageName = 'Immagine Link ' + nextItemId;

            var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';

            // Ottimizza l'immagine
            optimizeImage(file, 1920, 1920, 0.85, function(optimizedSrc) {
                var newItem = {
                    id: nextItemId++,
                    type: 'pageimagelink',
                    name: imageName,
                    src: optimizedSrc,
                    x: 50,
                    y: 50,
                    width: 150,
                    height: 150,
                    linkType: linkType
                };

                if (linkType === 'page') {
                    // Usa la funzione helper per selezionare la pagina
                    var selectedPageId = selectPageByPrompt('Scegli la pagina da collegare:\n\n');
                    if (!selectedPageId) return;
                    newItem.linkPageId = selectedPageId;
                } else if (linkType === 'external') {
                    var url = prompt('URL (es: https://maps.google.com o https://esempio.com):');
                    if (!url) return;
                    newItem.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                }

                page.items.push(newItem);
                renderPageElementsList();
                updatePreview();
                updatePageSizeInfo();
            });
            e.target.value = '';
        }
        
        function removePageBackground() {
            var page = getCurrentPage();
            if (!page) return alert('Seleziona prima una pagina');
            if (!page.backgroundImage) return alert('Nessuno sfondo da rimuovere');
            if (!confirm('Rimuovere lo sfondo di questa pagina?')) return;
            page.backgroundImage = null;
            updatePreview();
            updatePageSizeInfo();
        }

        function updateCanvasHeight() {
            var page = getCurrentPage();
            if (page) {
                page.height = parseInt(document.getElementById('canvasHeight').value);
                document.getElementById('canvasHeightValue').textContent = page.height;
                updatePreview();
                updatePageSizeInfo();
            }
        }
        
        function updatePageSizeInfo() {
            var page = getCurrentPage();
            if (!page) return;
            
            var totalSize = 0;
            var imageCount = 0;
            
            // Calcola dimensione immagini nella pagina
            if (page.backgroundImage) {
                totalSize += estimateBase64Size(page.backgroundImage);
                imageCount++;
            }
            
            if (page.items) {
                page.items.forEach(function(item) {
                    if ((item.type === 'image' || item.type === 'freeimage' || item.type === 'pageimagelink') && item.src) {
                        totalSize += estimateBase64Size(item.src);
                        imageCount++;
                    }
                });
            }
            
            // Aggiungi dimensione HTML stimata (circa 2KB per pagina base)
            totalSize += 2048;
            
            var sizeKB = (totalSize / 1024).toFixed(2);
            var sizeMB = (totalSize / (1024 * 1024)).toFixed(2);
            
            var sizeText = totalSize > 1048576 ? sizeMB + ' MB' : sizeKB + ' KB';
            
            document.getElementById('pageSize').innerHTML = 'Dimensione: <strong>' + sizeText + '</strong>';
            document.getElementById('pageImageCount').innerHTML = 'Immagini: <strong>' + imageCount + '</strong>';
            
            // Aggiorna anche il totale progetto
            updateTotalProjectSize();
        }
        
        function updateTotalProjectSize() {
            var totalSize = 0;
            var totalImages = 0;
            
            // Immagini header
            data.header.elements.forEach(function(el) {
                if ((el.type === 'image' || el.type === 'imageLink') && el.src) {
                    totalSize += estimateBase64Size(el.src);
                    totalImages++;
                }
            });
            
            // Immagini in tutte le pagine
            data.pages.forEach(function(page) {
                if (page.backgroundImage) {
                    totalSize += estimateBase64Size(page.backgroundImage);
                    totalImages++;
                }
                if (page.items) {
                    page.items.forEach(function(item) {
                        if ((item.type === 'image' || item.type === 'freeimage' || item.type === 'pageimagelink') && item.src) {
                            totalSize += estimateBase64Size(item.src);
                            totalImages++;
                        }
                    });
                }
                if (page.subPages) {
                    page.subPages.forEach(function(sub) {
                        if (sub.backgroundImage) {
                            totalSize += estimateBase64Size(sub.backgroundImage);
                            totalImages++;
                        }
                        if (sub.items) {
                            sub.items.forEach(function(item) {
                                if ((item.type === 'image' || item.type === 'freeimage' || item.type === 'pageimagelink') && item.src) {
                                    totalSize += estimateBase64Size(item.src);
                                    totalImages++;
                                }
                            });
                        }
                    });
                }
            });
            
            // Aggiungi dimensione stimata HTML + CSS (circa 5KB per pagina)
            var pageCount = 0;
            data.pages.forEach(function(p) {
                if (p.type === 'gallery' && p.subPages) {
                    pageCount += p.subPages.length;
                } else {
                    pageCount++;
                }
            });
            totalSize += pageCount * 5120;
            
            var sizeKB = (totalSize / 1024).toFixed(2);
            var sizeMB = (totalSize / (1024 * 1024)).toFixed(2);

            var sizeText = totalSize > 1048576 ? sizeMB + ' MB' : sizeKB + ' KB';

            // Definisci colori e warning in base alla dimensione
            var colorClass = 'color:#4CAF50'; // Verde: tutto ok
            var warningText = '';

            if (totalSize > 104857600) { // > 100MB
                colorClass = 'color:#d32f2f'; // Rosso scuro: troppo grande
                warningText = '<br><span style="color:#d32f2f;font-size:0.9em">⛔ TROPPO GRANDE! GitHub ha un limite di 100MB per file.</span>';
            } else if (totalSize > 52428800) { // > 50MB
                colorClass = 'color:#ff6b6b'; // Rosso: attenzione
                warningText = '<br><span style="color:#ff6b6b;font-size:0.9em">⚠️ Attenzione: si consiglia di rimanere sotto i 50MB</span>';
            } else if (totalSize > 26214400) { // > 25MB
                colorClass = 'color:#ff9800'; // Arancione: moderato
                warningText = '<br><span style="color:#ff9800;font-size:0.9em">💡 Suggerimento: considera di ridurre le immagini</span>';
            }

            document.getElementById('totalProjectSize').innerHTML =
                'Totale stimato: <strong style="' + colorClass + '">' + sizeText + '</strong><br>' +
                'Immagini totali: <strong>' + totalImages + '</strong>' + warningText;
        }
        
        function estimateBase64Size(base64String) {
            if (!base64String) return 0;
            var base64Length = base64String.length - (base64String.indexOf(',') + 1);
            return base64Length * 0.75; // Base64 è circa 33% più grande del file originale
        }

        function showSelectedInfo() {
            var page = getCurrentPage();
            if (!page) return;
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item) {
                document.getElementById('selectedInfo').innerHTML = '';
                return;
            }
            
            var title = 'Elemento Selezionato';
            if (item.type === 'image') title = 'Foto Selezionata';
            else if (item.type === 'text') title = 'Testo Selezionato';
            else if (item.type === 'freetext') title = 'Testo Libero Selezionato';
            else if (item.type === 'freeimage') title = 'Immagine Libera Selezionata';
            else if (item.type === 'pageimagelink') title = '🖼️🔗 Immagine con Link Selezionata';
            else if (item.type === 'menulink') title = 'Link/Menu Selezionato';
            else if (item.type === 'dropdown') title = 'Menu a Tendina Selezionato';
            
            var html = '<div class="info-panel" style="border-left-color:#ff6b6b"><strong>' + title + '</strong>';
            
            if (item.type === 'image') {
                html += '<div class="slider-group"><label>Larghezza: ' + item.width + 'px</label><input type="range" min="50" max="800" value="' + item.width + '" oninput="updateItemField(\'width\',this.value)"></div>';
                html += '<div class="slider-group"><label>Altezza: ' + item.height + 'px</label><input type="range" min="50" max="800" value="' + item.height + '" oninput="updateItemField(\'height\',this.value)"></div>';
                html += '<div class="slider-group"><label>Luminosità: ' + item.brightness + '%</label><input type="range" min="0" max="200" value="' + item.brightness + '" oninput="updateItemField(\'brightness\',this.value)"></div>';
                html += '<div class="slider-group"><label>Contrasto: ' + item.contrast + '%</label><input type="range" min="0" max="200" value="' + item.contrast + '" oninput="updateItemField(\'contrast\',this.value)"></div>';
                html += '<div class="slider-group"><label>Saturazione: ' + item.saturation + '%</label><input type="range" min="0" max="200" value="' + item.saturation + '" oninput="updateItemField(\'saturation\',this.value)"></div>';
                html += '<div class="slider-group"><label>Rotazione: ' + item.rotation + '°</label><input type="range" min="0" max="360" value="' + item.rotation + '" oninput="updateItemField(\'rotation\',this.value)"></div>';
            } else if (item.type === 'freeimage') {
                html += '<div class="slider-group"><label>Larghezza: ' + item.width + 'px</label><input type="range" min="20" max="800" value="' + item.width + '" oninput="updateItemField(\'width\',this.value)"></div>';
                html += '<div class="slider-group"><label>Altezza: ' + item.height + 'px</label><input type="range" min="20" max="800" value="' + item.height + '" oninput="updateItemField(\'height\',this.value)"></div>';
            } else if (item.type === 'pageimagelink') {
                html += '<div class="form-group"><label>Nome:</label><input value="' + (item.name || '').replace(/"/g, '&quot;') + '" oninput="updateItemField(\'name\',this.value)" placeholder="es: Mappa Google"></div>';
                html += '<div class="slider-group"><label>Larghezza: ' + item.width + 'px</label><input type="range" min="20" max="800" value="' + item.width + '" oninput="updateItemField(\'width\',this.value)"></div>';
                html += '<div class="slider-group"><label>Altezza: ' + item.height + 'px</label><input type="range" min="20" max="800" value="' + item.height + '" oninput="updateItemField(\'height\',this.value)"></div>';
                
                if (item.linkType === 'page') {
                    html += '<div class="form-group"><label>Tipo Link:</label><select onchange="changePageImageLinkType(this.value)"><option value="page" selected>Pagina Interna</option><option value="external">Link Esterno</option></select></div>';
                    html += '<div class="form-group"><label>Collega a:</label><select id="pageImageLinkPageSelect" onchange="updateItemField(\'linkPageId\',parseInt(this.value))">';
                    data.pages.forEach(function(p) {
                        if (p.type === 'normal') {
                            html += '<option value="' + p.id + '"' + (p.id === item.linkPageId ? ' selected' : '') + '>' + p.name + '</option>';
                        } else if (p.type === 'gallery' && p.subPages) {
                            p.subPages.forEach(function(sub) {
                                html += '<option value="' + sub.id + '"' + (sub.id === item.linkPageId ? ' selected' : '') + '>' + p.name + ' → ' + sub.name + '</option>';
                            });
                        }
                    });
                    html += '</select></div>';
                } else {
                    html += '<div class="form-group"><label>Tipo Link:</label><select onchange="changePageImageLinkType(this.value)"><option value="page">Pagina Interna</option><option value="external" selected>Link Esterno</option></select></div>';
                    html += '<div class="form-group"><label>URL Esterno:</label><input value="' + (item.externalUrl || '') + '" oninput="updateItemField(\'externalUrl\',this.value)" placeholder="https://maps.google.com"></div>';
                }
            } else if (item.type === 'freetext') {
                html += '<div class="form-group"><label>Testo:</label><input value="' + item.text.replace(/"/g, '&quot;') + '" oninput="updateItemField(\'text\',this.value)"></div>';
                html += '<div class="slider-group"><label>Dimensione: ' + item.fontSize + 'px</label><input type="range" min="12" max="120" value="' + item.fontSize + '" oninput="updateItemField(\'fontSize\',this.value)"></div>';
                html += '<div class="form-group"><label>Colore:</label><input type="color" value="' + item.color + '" oninput="updateItemField(\'color\',this.value)"></div>';
                html += '<div class="form-group"><label>Grassetto:</label><select onchange="updateItemField(\'fontWeight\',this.value)"><option value="normal"' + (item.fontWeight === 'normal' ? ' selected' : '') + '>Normale</option><option value="bold"' + (item.fontWeight === 'bold' ? ' selected' : '') + '>Grassetto</option></select></div>';
            } else if (item.type === 'menulink') {
                html += '<div class="form-group"><label>Testo:</label><input value="' + item.text.replace(/"/g, '&quot;') + '" oninput="updateItemField(\'text\',this.value)"></div>';
                html += '<div class="slider-group"><label>Dimensione: ' + item.fontSize + 'px</label><input type="range" min="12" max="48" value="' + item.fontSize + '" oninput="updateItemField(\'fontSize\',this.value)"></div>';
                html += '<div class="form-group"><label>Colore:</label><input type="color" value="' + item.color + '" oninput="updateItemField(\'color\',this.value)"></div>';
                
                if (item.linkType === 'page') {
                    html += '<div class="form-group"><label>Collega a:</label><select id="menulinkPageSelect" onchange="updateItemField(\'linkPageId\',parseInt(this.value))">';
                    data.pages.forEach(function(p) {
                        if (p.type === 'normal') {
                            html += '<option value="' + p.id + '"' + (p.id === item.linkPageId ? ' selected' : '') + '>' + p.name + '</option>';
                        } else if (p.type === 'gallery' && p.subPages) {
                            p.subPages.forEach(function(sub) {
                                html += '<option value="' + sub.id + '"' + (sub.id === item.linkPageId ? ' selected' : '') + '>' + p.name + ' → ' + sub.name + '</option>';
                            });
                        }
                    });
                    html += '</select></div>';
                } else {
                    html += '<div class="form-group"><label>URL Esterno:</label><input value="' + (item.externalUrl || '') + '" oninput="updateItemField(\'externalUrl\',this.value)" placeholder="https://esempio.com"></div>';
                }
            } else if (item.type === 'dropdown') {
                html += '<div class="form-group"><label>Testo:</label><input value="' + item.text.replace(/"/g, '&quot;') + '" oninput="updateItemField(\'text\',this.value)"></div>';
                html += '<div class="slider-group"><label>Dimensione: ' + item.fontSize + 'px</label><input type="range" min="12" max="48" value="' + item.fontSize + '" oninput="updateItemField(\'fontSize\',this.value)"></div>';
                html += '<div class="form-group"><label>Colore:</label><input type="color" value="' + item.color + '" oninput="updateItemField(\'color\',this.value)"></div>';
                html += '<div class="form-group"><label>Sottomenu (' + (item.items ? item.items.length : 0) + '):</label><button class="button-primary" style="padding:8px;margin-top:5px;" onclick="editDropdownItems()">✏️ Modifica Sottomenu</button></div>';
            } else {
                html += '<div class="form-group"><label>Testo:</label><input value="' + item.text.replace(/"/g, '&quot;') + '" oninput="updateItemField(\'text\',this.value)"></div>';
                html += '<div class="slider-group"><label>Dimensione: ' + item.fontSize + 'px</label><input type="range" min="12" max="72" value="' + item.fontSize + '" oninput="updateItemField(\'fontSize\',this.value)"></div>';
                html += '<div class="form-group"><label>Colore:</label><input type="color" value="' + item.color + '" oninput="updateItemField(\'color\',this.value)"></div>';
            }
            
            html += '<button class="button-delete" onclick="deleteItem()">🗑️ Elimina</button></div>';
            document.getElementById('selectedInfo').innerHTML = html;
        }

        function updateItemField(field, value) {
            var page = getCurrentPage();
            if (!page) return;
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item) return;
            
            if (field === 'text' || field === 'externalUrl' || field === 'fontWeight' || field === 'name') {
                item[field] = value;
            } else if (field === 'linkPageId') {
                item[field] = parseInt(value);
            } else {
                item[field] = parseFloat(value);
            }
            
            updatePreview();
            showSelectedInfo();
        }
        
        function changePageImageLinkType(newType) {
            var page = getCurrentPage();
            if (!page) return;
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item || item.type !== 'pageimagelink') return;
            
            item.linkType = newType;
            
            if (newType === 'page') {
                delete item.externalUrl;
                if (data.pages.length > 0) {
                    item.linkPageId = data.pages[0].id;
                }
            } else {
                delete item.linkPageId;
                item.externalUrl = '';
            }
            
            updatePreview();
            showSelectedInfo();
        }

        function deleteItem() {
            if (!confirm('Eliminare questo elemento?')) return;
            var page = getCurrentPage();
            if (!page) return;
            page.items = page.items.filter(function(i) { return i.id !== selectedId; });
            selectedId = null;
            updatePreview();
            showSelectedInfo();
            updatePageSizeInfo();
        }
        
        function editDropdownItems() {
            var page = getCurrentPage();
            if (!page) return;
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item || item.type !== 'dropdown') return;
            
            var action = prompt('Azioni disponibili:\n\n1 = Aggiungi voce\n2 = Rimuovi ultima voce\n\nScegli (1 o 2):');
            
            if (action === '1') {
                var text = prompt('Testo sottomenu:');
                if (!text) return;
                
                var linkType = confirm('Collegare a una pagina interna?\n\nOK = Pagina interna\nAnnulla = Link esterno') ? 'page' : 'external';
                
                var newSubItem = {
                    text: text,
                    linkType: linkType
                };
                
                if (linkType === 'page' && data.pages.length > 0) {
                    newSubItem.linkPageId = data.pages[0].id;
                } else if (linkType === 'external') {
                    var url = prompt('URL (es: https://esempio.com):');
                    if (!url) return;
                    newSubItem.externalUrl = url.match(/^https?:\/\//) ? url : 'https://' + url;
                }
                
                if (!item.items) item.items = [];
                item.items.push(newSubItem);
                updatePreview();
                showSelectedInfo();
            } else if (action === '2') {
                if (!item.items || item.items.length === 0) {
                    alert('Nessuna voce da rimuovere');
                    return;
                }
                item.items.pop();
                updatePreview();
                showSelectedInfo();
            }
        }

        // ===== PREVIEW & INTERAZIONI (identico all'originale) =====
        function updatePreview() {
            var iframe = document.getElementById('previewFrame');
            
            if (data.pages.length === 0 && data.header.elements.length === 0) {
                iframe.srcdoc = '<html><body><div class="welcome-message"><h2>👋 Benvenuto!</h2><p>Inizia creando la struttura del tuo sito:</p><p><strong>1.</strong> Vai su "Struttura" e aggiungi pagine</p><p><strong>2.</strong> Vai su "Header" e personalizza l\'intestazione</p><p><strong>3.</strong> Seleziona una pagina e vai su "Editor" per aggiungere contenuti</p><p><strong>4.</strong> Esporta come ZIP per caricare su GitHub!</p></div><style>.welcome-message{text-align:center;padding:60px 20px;color:#666}.welcome-message h2{margin-bottom:20px;color:#1a1a1a}.welcome-message p{margin-bottom:10px}</style></body></html>';
                return;
            }
            
            var page = getCurrentPage();
            
            var isBlankMode = page && page.layoutMode === 'blank';

            // L'header è SEMPRE visibile (è globale!), anche in modalità blank
            var headerHTML = '';
            headerHTML = '<header style="padding:40px 20px;border-bottom:3px solid ' + data.accentColor + ';background:' + data.primaryColor + ';position:relative;min-height:' + data.headerHeight + 'px;box-shadow:0 2px 8px rgba(0,0,0,0.2)">';
            data.header.elements.forEach(function(el) {
                if (!el.visible) return;
                var selected = el.id === selectedHeaderId ? 'border:2px solid #ff6b6b' : 'border:2px dashed transparent';
                if (el.type === 'text') {
                    headerHTML += '<div class="header-item" data-id="' + el.id + '" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ';cursor:move;padding:5px;' + selected + ';font-weight:' + (el.isTitle ? 'bold' : 'normal') + '">' + el.text + '</div>';
                } else if (el.type === 'menu') {
                    headerHTML += '<div class="header-item" data-id="' + el.id + '" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ';cursor:move;padding:5px;' + selected + '">' + el.text + '</div>';
                } else if (el.type === 'dropdown') {
                    var itemCount = el.items ? el.items.length : 0;
                    headerHTML += '<div class="header-item" data-id="' + el.id + '" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;font-size:' + el.fontSize + 'px;color:' + el.color + ';cursor:move;padding:5px;' + selected + '">' + el.text + ' ▼ (' + itemCount + ')</div>';
                } else if (el.type === 'image' || el.type === 'imageLink') {
                    headerHTML += '<div class="header-item" data-id="' + el.id + '" style="position:absolute;left:' + el.x + 'px;top:' + el.y + 'px;cursor:move;padding:5px;' + selected + '"><img src="' + el.src + '" style="width:' + el.width + 'px;height:' + el.height + 'px;object-fit:cover;pointer-events:none"></div>';
                }
            });
            headerHTML += '</header>';
            
            var pageHTML = '';
            if (page) {
                var bgStyle = page.backgroundImage ? 'background-image:url(' + page.backgroundImage + ');background-size:cover;background-position:center;' : '';
                var itemsHTML = page.items.map(function(item) {
                    var selected = item.id === selectedId ? 'border:2px solid #ff6b6b' : 'border:2px dashed transparent';
                    if (item.type === 'image') {
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;width:' + item.width + 'px;height:' + item.height + 'px;cursor:move;' + selected + '"><img src="' + item.src + '" style="width:100%;height:100%;object-fit:cover;filter:brightness(' + item.brightness + '%) contrast(' + item.contrast + '%) saturate(' + item.saturation + '%) rotate(' + item.rotation + 'deg);pointer-events:none;border-radius:4px"><div class="handle" style="position:absolute;width:12px;height:12px;background:#ff6b6b;right:-6px;bottom:-6px;cursor:nwse-resize;border-radius:2px;display:' + (item.id === selectedId ? 'block' : 'none') + '"></div></div>';
                    } else if (item.type === 'freetext') {
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ';font-weight:' + item.fontWeight + ';cursor:move;padding:5px;' + selected + '">' + item.text + '</div>';
                    } else if (item.type === 'freeimage') {
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;width:' + item.width + 'px;height:' + item.height + 'px;cursor:move;' + selected + '"><img src="' + item.src + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none"><div class="handle" style="position:absolute;width:12px;height:12px;background:#ff6b6b;right:-6px;bottom:-6px;cursor:nwse-resize;border-radius:2px;display:' + (item.id === selectedId ? 'block' : 'none') + '"></div></div>';
                    } else if (item.type === 'pageimagelink') {
                        var linkIcon = item.linkType === 'external' ? '🌐' : '🔗';
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;width:' + item.width + 'px;height:' + item.height + 'px;cursor:move;' + selected + '"><img src="' + item.src + '" style="width:100%;height:100%;object-fit:cover;pointer-events:none;border-radius:4px"><div style="position:absolute;top:5px;right:5px;background:rgba(0,0,0,0.7);color:white;padding:3px 6px;border-radius:3px;font-size:12px;pointer-events:none;">' + linkIcon + '</div><div class="handle" style="position:absolute;width:12px;height:12px;background:#ff6b6b;right:-6px;bottom:-6px;cursor:nwse-resize;border-radius:2px;display:' + (item.id === selectedId ? 'block' : 'none') + '"></div></div>';
                    } else if (item.type === 'menulink') {
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ';cursor:move;padding:5px;text-decoration:underline;' + selected + '">' + item.text + '</div>';
                    } else if (item.type === 'dropdown') {
                        var itemCount = item.items ? item.items.length : 0;
                        return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ';cursor:move;padding:5px;' + selected + '">' + item.text + ' ▼ (' + itemCount + ')</div>';
                    }
                    return '<div class="item" data-id="' + item.id + '" style="position:absolute;left:' + item.x + 'px;top:' + item.y + 'px;font-size:' + item.fontSize + 'px;color:' + item.color + ';padding:10px;background:rgba(0,0,0,0.8);border-radius:4px;cursor:move;max-width:300px;' + selected + '">' + item.text + '</div>';
                }).join('');
                
                if (isBlankMode) {
                    // Modalità vuota: canvas a schermo intero senza titolo
                    // Colore canvas diverso dall'header per distinguerli visivamente
                    var canvasBg = bgStyle || 'background:rgba(255,255,255,0.03)';
                    pageHTML = '<div class="canvas" style="position:relative;height:' + page.height + 'px;width:100vw;' + canvasBg + ';border-top:1px solid rgba(255,255,255,0.1)">' + itemsHTML + '</div>';
                } else {
                    // Modalità normale: con container e titolo
                    pageHTML = '<div class="container"><h2 style="color:' + data.accentColor + ';margin:40px 0 20px">' + page.name + '</h2><div class="canvas" style="position:relative;height:' + page.height + 'px;background:rgba(255,255,255,0.05);border-radius:8px;overflow:hidden;border:1px solid rgba(255,255,255,0.1);' + bgStyle + '">' + itemsHTML + '</div></div>';
                }
            }

            var html = '<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:sans-serif;background:' + data.primaryColor + ';color:' + data.secondaryColor + '}.container{max-width:1200px;margin:0 auto;padding:20px}.dropdown{position:relative;display:inline-block}.dropdown-content{display:none;position:absolute;background:' + data.primaryColor + ';min-width:200px;box-shadow:0 8px 16px rgba(0,0,0,0.4);z-index:1000;border:1px solid ' + data.accentColor + ';border-radius:4px;margin-top:8px;padding:5px 0;left:0}.dropdown-content a{color:' + data.secondaryColor + ';padding:12px 20px;text-decoration:none;display:block}.dropdown-content a:hover{background:' + data.accentColor + ';color:' + data.primaryColor + '}.dropdown:hover .dropdown-content{display:block}.dropdown>span{cursor:pointer;padding:5px 10px;display:inline-block;user-select:none}.dropdown>span:hover{color:' + data.accentColor + '}</style></head><body>' + headerHTML + pageHTML + '</body></html>';

            iframe.contentDocument.open();
            iframe.contentDocument.write(html);
            iframe.contentDocument.close();

            setTimeout(setupInteractions, 100);
        }

        function setupInteractions() {
            var iframe = document.getElementById('previewFrame');
            var doc = iframe.contentDocument;
            if (!doc) return;
            
            doc.querySelectorAll('.header-item').forEach(function(el) {
                el.onclick = function(e) {
                    e.stopPropagation();
                    doc.querySelectorAll('.header-item, .item').forEach(function(i) { i.style.border = '2px dashed transparent'; });
                    el.style.border = '2px solid #ff6b6b';
                    selectedHeaderId = parseInt(el.getAttribute('data-id'));
                    selectedId = null;
                };
                el.onmousedown = function(e) {
                    if (e.target.tagName === 'IMG') return;
                    e.preventDefault();
                    selectedHeaderId = parseInt(el.getAttribute('data-id'));
                    startHeaderDrag(e, el);
                };
            });
            
            doc.querySelectorAll('.item').forEach(function(el) {
                el.onclick = function(e) {
                    e.stopPropagation();
                    doc.querySelectorAll('.header-item, .item').forEach(function(i) { i.style.border = '2px dashed transparent'; });
                    el.style.border = '2px solid #ff6b6b';
                    selectedId = parseInt(el.getAttribute('data-id'));
                    selectedHeaderId = null;
                    showSelectedInfo();
                    var handle = el.querySelector('.handle');
                    if (handle) handle.style.display = 'block';
                };
                el.onmousedown = function(e) {
                    e.preventDefault();
                    selectedId = parseInt(el.getAttribute('data-id'));
                    var handle = el.querySelector('.handle');
                    if (handle && e.target === handle) {
                        startResize(e, el);
                    } else {
                        startDrag(e, el);
                    }
                };
            });
        }

        function startHeaderDrag(e, el) {
            var headerEl = data.header.elements.find(function(h) { return h.id === selectedHeaderId; });
            if (!headerEl) return;
            var iframe = document.getElementById('previewFrame');
            var doc = iframe.contentDocument;
            var startX = e.clientX, startY = e.clientY;
            var startLeft = headerEl.x, startTop = headerEl.y;

            var onMove = function(e) {
                e.preventDefault();
                headerEl.x = startLeft + (e.clientX - startX);
                headerEl.y = startTop + (e.clientY - startY);
                el.style.left = headerEl.x + 'px';
                el.style.top = headerEl.y + 'px';
            };

            var onUp = function() {
                doc.removeEventListener('mousemove', onMove);
                doc.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            doc.addEventListener('mousemove', onMove);
            doc.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        function startDrag(e, el) {
            var page = getCurrentPage();
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item) return;
            var iframe = document.getElementById('previewFrame');
            var doc = iframe.contentDocument;
            var startX = e.clientX, startY = e.clientY;
            var startLeft = item.x, startTop = item.y;

            var onMove = function(e) {
                e.preventDefault();
                item.x = startLeft + (e.clientX - startX);
                item.y = startTop + (e.clientY - startY);
                el.style.left = item.x + 'px';
                el.style.top = item.y + 'px';
            };

            var onUp = function() {
                doc.removeEventListener('mousemove', onMove);
                doc.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            doc.addEventListener('mousemove', onMove);
            doc.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        function startResize(e, el) {
            var page = getCurrentPage();
            var item = page.items.find(function(i) { return i.id === selectedId; });
            if (!item || item.type !== 'image') return;
            var iframe = document.getElementById('previewFrame');
            var doc = iframe.contentDocument;
            var startX = e.clientX, startY = e.clientY;
            var startW = item.width, startH = item.height;

            var onMove = function(e) {
                e.preventDefault();
                item.width = Math.max(50, startW + (e.clientX - startX));
                item.height = Math.max(50, startH + (e.clientY - startY));
                el.style.width = item.width + 'px';
                el.style.height = item.height + 'px';
                showSelectedInfo();
            };

            var onUp = function() {
                doc.removeEventListener('mousemove', onMove);
                doc.removeEventListener('mouseup', onUp);
                document.removeEventListener('mousemove', onMove);
                document.removeEventListener('mouseup', onUp);
            };

            doc.addEventListener('mousemove', onMove);
            doc.addEventListener('mouseup', onUp);
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
        }

        // ===== INIT =====
        window.addEventListener('DOMContentLoaded', function() {
            updatePreview();
        });
