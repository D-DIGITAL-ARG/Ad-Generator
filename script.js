// --- CONFIGURATION & API KEYS ---
const POLLINATIONS_TEXT_KEY = 'sk_WuXoH4sQLvdflCtxqV7wmMoOAnbCSefH';
const POLLINATIONS_IMAGE_KEY = 'sk_AgWtajLDsqOl3bF6Wu7lae6AhB87KQkM';
const POLLINATIONS_KLEIN_KEY = 'sk_FCdjKYELAgTPjP9YxWC0NeND8Fe67t7B';

const api = {
    async analyze(url) {
        console.log(`Analyzing website (Standalone): ${url}`);

        const proxyTemplates = [
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}&cachebust=${Date.now()}`,
            (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`,
            (u) => `https://cors-proxy.htmldriven.com/?url=${encodeURIComponent(u)}`
        ];

        let html = null;
        let lastError = null;
        const currentIdx = 1;
        const searchOrder = [
            currentIdx,
            ...Array.from({ length: proxyTemplates.length }, (_, i) => i).filter(i => i !== currentIdx)
        ];

        for (const idx of searchOrder) {
            try {
                const proxyUrl = proxyTemplates[idx](url);
                console.log(`Trying Proxy #${idx}: ${proxyUrl.substring(0, 70)}...`);
                const response = await fetch(proxyUrl);
                if (!response.ok) throw new Error(`Status ${response.status}`);
                const text = await response.text();
                let candidateHtml = text;

                if (text.trim().startsWith('{')) {
                    try {
                        const data = JSON.parse(text);
                        candidateHtml = data.contents || text;
                    } catch (e) { }
                }

                if (candidateHtml && candidateHtml.trim().length > 100) {
                    html = candidateHtml;
                    console.log(`✅ Success with Proxy #${idx}`);
                    break;
                }
            } catch (e) {
                console.warn(`❌ Proxy #${idx} failed: ${e.message}`);
                lastError = e;
            }
        }

        if (!html) throw new Error(`Error: ${lastError?.message || 'Bloqueo de seguridad'}`);

        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        const getAbs = (s) => {
            try { return new URL(s, url).href; } catch (e) { return null; }
        };

        const getImageSize = (imgUrl) => {
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = async () => {
                    try {
                        await img.decode();
                        resolve({ w: img.naturalWidth, h: img.naturalHeight });
                    } catch (e) {
                        resolve({ w: img.naturalWidth || 0, h: img.naturalHeight || 0 });
                    }
                };
                img.onerror = () => resolve({ w: 0, h: 0 });
                img.src = imgUrl;
                setTimeout(() => resolve({ w: 0, h: 0 }), 3500);
            });
        };

        // --- Extracción de Metadatos ---
        const title = doc.title || '';
        console.log(`MetaDatos Título: ${title}`);

        // --- Extracción Avanzada de Imágenes ---
        const metaImage = doc.querySelector('meta[property="og:image"]')?.content ||
            doc.querySelector('meta[name="twitter:image"]')?.content ||
            doc.querySelector('link[rel="apple-touch-icon"]')?.href;

        const imgElements = Array.from(doc.querySelectorAll('img'));
        const imagePromises = imgElements.map(async (img) => {
            const srcAttr = img.getAttribute('src') ||
                img.getAttribute('data-src') ||
                img.getAttribute('data-lazy-src');
            img.getAttribute('srcset')?.split(',')[0].split(' ')[0];

            const absUrl = getAbs(srcAttr);
            if (!absUrl) return null;

            const realSize = await getImageSize(absUrl);

            return {
                url: absUrl,
                html: img.outerHTML.toLowerCase(),
                Ancho: realSize.w,
                Alto: realSize.h,
                Width: parseInt(img.getAttribute('width') || 0),
                Height: parseInt(img.getAttribute('height') || 0)
            };
        });

        const results = (await Promise.all(imagePromises)).filter(item => item !== null);

        // --- Filtrado Final ---
        const detectedImages = results
            .filter(item => {
                const html = item.html;
                const src = item.url;
                const lower = src.toLowerCase();

                if (lower.endsWith('.svg') || lower.endsWith('.ico') || lower.endsWith('.gif')) return false;
                const badTerms = ['pixel', 'bono', 'boton', 'secure', 'certificado', 'logo', 'resena', 'tracker', 'facebook.com/tr', 'precio', 'hotmart', 'garantia', 'wp-smiley', 'testimonio'];
                if (badTerms.some(term => lower.includes(term) || item.html.includes(term))) return false;
                if (html.includes('class="wp-smiley"') || html.includes('attachment-thumbnail')) return false;
                if (item.Width < 250 && item.Ancho < 250) return false;
                if (item.Height < 150 && item.Alto < 150) return false;
                if (item.Alto > 0) {
                    const ratio = item.Ancho / item.Alto;
                    if (ratio > 2.5) return false;
                }

                console.log(`Width: ${item.Width}px | Height: ${item.Height}px | Ancho: ${item.Ancho}px | Alto: ${item.Alto}px | URL: ${item.url}`);

                return src.startsWith('http');

            })
            .map(item => item.url)
            .slice(0, 15);
            console.log(`Detected ${detectedImages.length} relevant images`);

//	const formattedImages = detectedImages.length > 0 
//    	? detectedImages.map(url => `"${url}"`).join(', ') 
//    	: "No se detectaron imágenes específicas.";

// Use Pollinations to analyze the extracted text
const systemPrompt = `Actúa como un analista experto en marketing digital, creador de contenido y copywriting senior. Tu objetivo es realizar un web scraping y análisis profundo de la URL proporcionada para extraer insumos y activos visuales que permitan crear anuncios de alto impacto.
Analiza el sitio web ${url} y devuelve un objeto JSON detallado en español con la siguiente estructura y contenido:

1. Identidad Visual:
• Paleta de Colores: Identifica los colores principales, secundarios y de acento. Describe la psicología que transmiten (calma, urgencia, sofisticación, etc.).
• Tipografía: Analiza el estilo de las fuentes (modernas, clásicas, ligeras, pesadas) y cómo jerarquizan la información.
• Estilo de Imágenes: Determina el estilo de las imágenes y devuelve una o más de las siguientes opciones: minimalista, realista, ilustración 3d o Pixar.
• Composición: Analiza la composición y si el contenido visual es el "freno del scroll".
• Atmósfera General: Define si el diseño es editorial de alta gama, minimalista, saturado o funcional.

2. Extracción y Análisis de Texto (Copywriting):
• Contenido Textual: Extrae los titulares principales, descripción y llamados a la acción (CTA).
• Propuesta de Valor: Identifica cuál es el beneficio principal que ofrecen (el "por qué" debería importarle al cliente) y no solo las características técnicas.
• Tono de Voz: Determina si la comunicación es cercana, profesional, inspiradora o urgente.
• Fórmulas de Persuasión: Detecta si utilizan estructuras como PAS (Problema, Agitación, Solución) o ganchos emocionales.

3. Buyer Persona y Estrategia:
• Cliente Ideal: Basado en el lenguaje y el diseño, describe el perfil del usuario al que intentan atraer (sus puntos de dolor, deseos y metas).
• Etapa del Embudo: Identifica si el sitio está optimizado para la etapa de conciencia, consideración o conversión.

Restricciones y Guías Adicionales:
1. Precisión: No inventes datos; si una información no es detectable, indica "no detectado".
2. Claridad: El lenguaje debe ser profesional y directo, evitando redundancias.
3. JSON Estricto: Asegurate de que la salida sea un JSON válido para que pueda ser procesado por mi aplicación sin errores de formato.
4. Idioma: Toda la respuesta debe ser en español.

Objetivo final: Registra toda esta información en una tabla detallada para que luego puedas actuar como un estratega de contenido y generar prompts efectivos para crear imágenes y copies de anuncios que mantengan una coherencia total con esta marca.`;

	const rawText = doc.body.innerText.replace(/\s+/g, ' ').replace(/(menu|close)\b/gi, '').trim();
	const bodyContent = rawText.lastIndexOf('.', 2000) !== -1 ? rawText.substring(0, rawText.lastIndexOf('.', 2000) + 1) : rawText.substring(0, 2000);

        const userPrompt = `Sitio: ${url}\n Título: ${title}\n Contenido: ${bodyContent}\n`;
        console.log(`Arma systemPrompt de análisis: `, systemPrompt);
        console.log(`Arma userPrompt de contenido: `, userPrompt);

        try {
            const rawResult = await this.callText(systemPrompt, userPrompt);
            const json = this.safeJsonParse(rawResult);
            console.log(`Obtiene respuesta de Gemini. `, rawResult);
            if (!json) throw new Error("JSON Parse Error");
            json.contenido_web = bodyContent;
            json.imagenes_detectadas = detectedImages;
            console.log(`Convierte respuesta a Json y retorna datos. `, json);
            return json;
        } catch (e) {
            throw new Error(`Error en análisis de IA: ${e.message}`);
        }
    },

    async callText(systemPrompt, userPrompt) {
        console.log(`Obtiene textos de Prompts. `);
        try {
            const combined = `${systemPrompt}\n${userPrompt}`.replace(/\s+/g, ' ').trim().substring(0, 8000);
	    console.log(`Combina los Prompts. `);	
            const encoded = encodeURIComponent(combined);
            console.log(`Codifica los prompts a URI y envía fetch con Gemini. `);
            const url = `https://gen.pollinations.ai/text/${encoded}?model=gemini-fast&json=true`;
            const response = await fetch(url, {
                headers: {
                    'Accept': '*/*',
                    'Authorization': `Bearer ${POLLINATIONS_TEXT_KEY}`
                }
            });

            if (!response.ok) throw new Error(`API de Texto respondió con status ${response.status}`);
            return await response.text();
        } catch (e) {
            console.error("Text API Error:", e);
            throw new Error(`Fallo en conexión con Pollinations Text: ${e.message}`);
        }
    },


    async generateCopy(websiteData, count = 3, existingAds = []) {
        try {
            const hasRefImage = !!selectedImage;
//	    const imagenUrl = `https://elmonstruocomemiedos.weebly.com/uploads/1/5/2/5/152513751/editor/mock-00001_6.png`;
//	    const estiloDetectado = websiteData.identidad_visual?.estilo_imagenes;
            const existingContext = existingAds.length > 0
                ? `\nAnuncios ya generados (EVITA REPETIR ESTOS ÁNGULOS Y TITULARES):\n${existingAds.map(ad => `- ${ad.headline}`).join('\n')}`
                : '';

const systemPrompt = `Actua como un Director Creativo y Copywriter Senior experto en marketing de respuesta directa. Tu misión es transformar el análisis estratégico anterior (proporcionado en JSON) en ${count} variantes de anuncios de alto impacto diseñados para generar un freno del scroll inmediato.

Genera un objeto JSON estricto en español con ${count} variantes de anuncios en un array llamado "ads".
Cada anuncio dentro del array "ads" debe tener EXACTAMENTE esta estructura:
{
      "headline": "Título gancho (Hook) entre 4 y 6 palabras",
      "caption": "Cuerpo del texto principal (3-5 frases directas apuntando a puntos de dolor)",
      "visual_concept": "Breve descripción del concepto visual en español",
      "image_prompt": "Prompt detallado para la generación de imagen. 

REGLAS PARA EL PROMPT DE IMAGEN:

      - Para la PRIMER variante (Image-to-Image), utiliza EXACTAMENTE este texto: 'Image-to-image transformation. Recreate the main elements of the reference image using a style that is strictly coherent with the brand's visual identity. Create a commercial scene with optimized soft lighting and maintain the original color palette. Use a balanced wide shot with abundant negative space for marketing text overlay. High-impact scroll stopper for a premium landing page.'
      
      - Para las VARIANTES RESTANTES (Text-to-Image), redacta prompts detallados en inglés que repliquen el estilo y transmitan los conceptos del producto y las emociones detectadas en el análisis."
    }`;

        const userPrompt = `Datos de Marca: ${JSON.stringify(websiteData).substring(0, 7000)}`;

        console.log(`Arma systemPrompt de anuncios: `, systemPrompt);
        console.log(`Arma userPrompt de contenido: `, userPrompt);
	console.log(`Enviando solicitud para generar copys`);

    	const rawResult = await this.callText(systemPrompt, userPrompt);
    	let json = this.safeJsonParse(rawResult);

            if (json) {
                if (Array.isArray(json)) {
                    json = { ads: json };
                } else if (json.variants && !json.ads) {
                    json.ads = json.variants;
                } else if (!json.ads) {
                    const possibleArray = Object.values(json).find(v => Array.isArray(v));
                    if (possibleArray) json.ads = possibleArray;
                    console.log(`Ads array`, possibleArray);
                }
            }

           console.log(`Copys y prompts generados correctamente con coherencia de marca`, json);
           return json || { ads: [] };
	} catch (e) {
           throw new Error(`Fallo al generar copy publicitario: ${e.message}`);
        }
    },

    async generateImage(prompt, options = {}) {
        try {
            const { width = 1024, height = 1024, model = null, image = null, seed = null} = options;
            const cleanPrompt = prompt.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 800);
            const encodedPrompt = encodeURIComponent(cleanPrompt);
            const finalSeed = seed || Math.floor(Math.random() * 1000000);
            let url;
            let apiKey = POLLINATIONS_IMAGE_KEY;

            if (image && model === 'klein') {
                apiKey = POLLINATIONS_KLEIN_KEY;
                const encodedRef = encodeURIComponent(image);
                url = `https://gen.pollinations.ai/image/${encodedPrompt}?model=klein&width=${width}&height=${height}&image=${encodedRef}`;

            } else {
                url = `https://gen.pollinations.ai/image/${encodedPrompt}?width=${width}&height=${height}&seed=${finalSeed}&nologo=true&model=flux`;
            }

            const response = await fetch(url, {
                headers: {
                    'Accept': '*/*',
                    'Authorization': `Bearer ${apiKey}`
                }
            });

            if (!response.ok) throw new Error(`API de Imagen respondió con status ${response.status}`);

            const blob = await response.blob();
            return { url: URL.createObjectURL(blob) };
        } catch (e) {
            console.error("Image API Error:", e);
            throw new Error(`Fallo en conexión con Pollinations Image: ${e.message}`);
        }
    },

    // Ayuda para obtener una imagen y convertirla a DataURL para CORS "limpio" para Canvas.
    async getImageAsDataUrl(url) {
        if (!url) return null;
        const proxies = [
            (u) => u, // Direct
            (u) => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            (u) => `https://api.allorigins.win/get?url=${encodeURIComponent(u)}`,
            (u) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(u)}`
        ];

        for (const proxyFn of proxies) {
            try {
                const targetUrl = proxyFn(url);
                const resp = await fetch(targetUrl);
                if (!resp.ok) continue;

                let blob;
                if (targetUrl.includes('allorigins')) {
                    const json = await resp.json();
                    const blobResp = await fetch(json.contents);
                    blob = await blobResp.blob();
                } else {
                    blob = await resp.blob();
                }

                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn(`Fetch with proxy failed:`, e);
            }
        }
        return null;
    },

    async composeAdImage(backgroundUrl, overlayUrl) {
        const bgData = await this.getImageAsDataUrl(backgroundUrl);
        const overlayData = overlayUrl ? await this.getImageAsDataUrl(overlayUrl) : null;

        if (!bgData) throw new Error("Could not load background image");

        return new Promise((resolve, reject) => {
            const canvas = document.createElement('canvas');
            canvas.width = 1080;
            canvas.height = 1080;
            const ctx = canvas.getContext('2d');

            const bgImg = new Image();
            bgImg.onload = () => {
                ctx.drawImage(bgImg, 0, 0, 1080, 1080);

                if (overlayData) {
                    const overlayImg = new Image();
                    overlayImg.onload = () => {
                        // Logic: Maintain aspect ratio (object-contain)
                        const targetSize = 1080 * 0.6;
                        let drawWidth, drawHeight;
                        const imgRatio = overlayImg.width / overlayImg.height;

                        if (imgRatio > 1) { // Landscape
                            drawWidth = targetSize;
                            drawHeight = targetSize / imgRatio;
                        } else { // Portrait or Square
                            drawHeight = targetSize;
                            drawWidth = targetSize * imgRatio;
                        }

                        const x = (1080 - drawWidth) / 2;
                        const y = (1080 - drawHeight) / 2;

                        ctx.drawImage(overlayImg, x, y, drawWidth, drawHeight);
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    overlayImg.onerror = () => {
                        console.warn("Failed to load overlay DataUrl");
                        resolve(canvas.toDataURL('image/jpeg', 0.95));
                    };
                    overlayImg.src = overlayData;
                } else {
                    resolve(canvas.toDataURL('image/jpeg', 0.95));
                }
            };
            bgImg.onerror = () => reject(new Error("Failed to load background DataUrl"));
            bgImg.src = bgData;
        });
    },

    safeJsonParse(text) {
        let content = text;
        try {
            const outer = JSON.parse(text);
            if (outer && outer.result) {
                content = outer.result;
            } else if (outer && typeof outer === 'object') return outer;
        } catch (e) { }

        const clean = content.replace(/```json|```/g, '').trim();
        const match = clean.match(/[\[\{][\s\S]*[\]\}]/);
        if (!match) return null;
        try { return JSON.parse(match[0]); } catch (e) { return null; }
    }
};

// --- REST OF THE UI LOGIC ---

// State
let stage = 'input';
let websiteData = null;
let detectedImages = [];
let selectedImage = null;
let selectedImageIndex = 0;
let currentAds = [];

// DOM Elements
const stages = {
    input: document.getElementById('stage-input'),
    generating: document.getElementById('stage-generating'),
    results: document.getElementById('stage-results')
};

const urlForm = document.getElementById('url-form');
const websiteUrlInput = document.getElementById('website-url');
const progressBar = document.getElementById('progress-bar');
const progressIndicator = document.getElementById('progress-indicator');
const progressPercentage = document.getElementById('progress-percentage');
const currentStepLabel = document.getElementById('current-step-label');
const adsGallery = document.getElementById('ads-gallery');
const urlDisplay = document.getElementById('results-url-display');
const generateMoreBtn = document.getElementById('generate-more-btn');
const resetBtn = document.getElementById('reset-btn');

// UI Transitions
function setStage(newStage) {
    stage = newStage;
    Object.values(stages).forEach(s => {
        if (s) {
            s.classList.remove('active');
            s.classList.add('hidden');
        }
    });
    if (stages[newStage]) {
        stages[newStage].classList.add('active');
        stages[newStage].classList.remove('hidden');
    }
    window.scrollTo(0, 0);
}


function updateProgress(step, total = 4) {
    const percentage = Math.round((step / total) * 100);
    if (progressBar) progressBar.style.width = `${percentage}%`;
    if (progressIndicator) progressIndicator.style.width = `${percentage}%`;
    if (progressPercentage) progressPercentage.textContent = `${percentage}%`;

    const labels = [
        "Analizando contenido del sitio",
        "Estrategia de Marca",
        "Copywriting Persuasivo",
        "Visual Studio"
    ];

    if (currentStepLabel) currentStepLabel.textContent = labels[step] || "Procesando...";

    document.querySelectorAll('.step-item').forEach((el, idx) => {
        const statusIcon = el.querySelector('.step-icon-status');
        const stateLabel = el.querySelector('.step-state');

        el.classList.remove('opacity-100', 'opacity-40');
        if (statusIcon) {
            statusIcon.classList.remove('bg-neon-cyan/20', 'border-neon-cyan/30', 'text-neon-cyan', 'animate-spin', 'border-t-transparent', 'border-2', 'bg-neon-pink/20', 'border-neon-pink');
            statusIcon.classList.add('bg-white/5', 'border-white/10');
        }

        if (idx < step) {
            // Completed
            el.classList.add('opacity-100');
            if (statusIcon) {
                statusIcon.innerHTML = '<span class="material-symbols-outlined text-xl">check_circle</span>';
                statusIcon.classList.add('bg-neon-cyan/20', 'border-neon-cyan/30', 'text-neon-cyan');
            }
            if (stateLabel) {
                stateLabel.textContent = 'Completado';
                stateLabel.classList.remove('text-gray-500', 'animate-pulse', 'text-neon-pink');
                stateLabel.classList.add('text-neon-cyan');
            }
        } else if (idx === step) {
            // Active
            el.classList.add('opacity-100');
            if (statusIcon) {
                statusIcon.innerHTML = '';
                statusIcon.classList.add('border-2', 'border-t-transparent', 'animate-spin', 'border-neon-pink', 'bg-neon-pink/20');
            }
            if (stateLabel) {
                stateLabel.textContent = 'En curso...';
                stateLabel.classList.remove('text-gray-500');
                stateLabel.classList.add('text-neon-pink', 'animate-pulse');
            }
        } else {
            // Pending
            el.classList.add('opacity-40');
            if (stateLabel) {
                stateLabel.textContent = 'Pendiente';
                stateLabel.classList.add('text-gray-500');
            }
        }
    });
}

// Manual Input Elements
const manualInputContainer = document.getElementById('manual-input-container');
const manualTextArea = document.getElementById('manual-text');
const manualImageUrlInput = document.getElementById('manual-image-url');
const submitManualBtn = document.getElementById('submit-manual-btn');
const closeManualBtn = document.getElementById('close-manual-btn');

// Show/Hide Manual Input
function showManualInput() {
    manualInputContainer.classList.remove('hidden');
    manualTextArea.focus();
}

function hideManualInput() {
    manualInputContainer.classList.add('hidden');
    manualTextArea.value = '';
    manualImageUrlInput.value = '';
}

if (closeManualBtn) closeManualBtn.addEventListener('click', hideManualInput);

// Platform Selection
const platformButtons = document.querySelectorAll('.platform-btn');
platformButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        btn.classList.toggle('bg-opacity-20');
    });
});

// Logic: Analysis & Generation
if (urlForm) {
    urlForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = websiteUrlInput.value;
        if (!url) return;

        setStage('generating');
        updateProgress(0);

        try {
            websiteData = await api.analyze(url);
            detectedImages = websiteData.imagenes_detectadas || [];
            selectedImageIndex = 0;
            selectedImage = detectedImages.length > 0 ? detectedImages[0] : null;
            updateProgress(1);

            if (urlDisplay) urlDisplay.textContent = `URL: ${url}`;
            await startGeneration();
        } catch (error) {
            console.error(error);
            setStage('input');

            if (error.message.includes('fetch') || error.message.includes('acceder') || error.message.includes('Proxy')) {
                const retry = confirm(`${error.message}\n\n¿Quieres intentar ingresar el contenido manualmente?`);
                if (retry) {
                    showManualInput();
                }
            } else {
                alert('Hubo un error al analizar el sitio: ' + error.message);
            }
        }
    });
}

// Manual Submission Logic
if (submitManualBtn) {
    submitManualBtn.addEventListener('click', async () => {
        const text = manualTextArea.value.trim();
        const manualImageUrl = manualImageUrlInput.value.trim();

        if (text.length < 50) {
            alert('Por favor, ingresa un poco más de información para un mejor resultado.');
            return;
        }

        hideManualInput();
        setStage('generating');
        updateProgress(0);

        try {
            const systemPrompt = "Analiza este texto y entrégame un JSON válido con los detalles de marketing. RESPONDE SIEMPRE EN ESPAÑOL.";
            const userPrompt = `Texto proporcionado: ${text.substring(0, 5000)}
            
            Devuelve JSON EN ESPAÑOL:
            {
              "brand_name": "string",
              "products_services": ["string"],
              "key_benefits": ["string"],
              "target_audience": "string",
              "brand_tone": "string",
              "emotional_tone": "string",
              "visual_style": "string",
              "main_promise": "string"
            }`;

            const rawResult = await api.callText(systemPrompt, userPrompt);
            websiteData = api.safeJsonParse(rawResult);
            console.log(`Datos del sitio`, websiteData);

            if (!websiteData) throw new Error("No se pudo analizar el texto manual");

            detectedImages = manualImageUrl ? [manualImageUrl] : [];
            selectedImage = manualImageUrl || null;
            updateProgress(1);

            if (urlDisplay) urlDisplay.textContent = `Análisis Manual`;
            await startGeneration();
        } catch (error) {
            console.error(error);
            alert('Fallo al procesar el texto: ' + error.message);
            setStage('input');
        }
    });
}

async function startGeneration() {
    updateProgress(2);
    try {
        const adCopy = await api.generateCopy(websiteData, 3);
        updateProgress(3);

        currentAds = (adCopy?.ads || []).map(ad => ({
            headline: ad.headline || ad.titulo || "Título no generado",
            caption: ad.caption || ad.texto || "Texto no generado",
            imageUrl: null,
            imagePrompt: ad.image_prompt || ad.prompt || ""
        }));

        // Create a list of promises for image generation
        const generationPromises = currentAds.map(async (ad, i) => {
            let options = { width: 1024, height: 1024, seed: Math.floor(Math.random() * 1000000) };
            let promptToUse = ad.imagePrompt;
            if (i === 0 && selectedImage) {
                options.model = 'klein';
                options.image = selectedImage;
                try {
                    const result = await api.generateImage(promptToUse, options);
                    ad.imageUrl = result.url;
                    console.log(`Lee y ejecuta Prompt klein: `, promptToUse);
                } catch (e) {
                    console.error('Error generating Klein background', e);
                    ad.imageUrl = selectedImage;
                    ad.productOverlay = null;
                }
            } else {
                options.model = 'flux';
                promptToUse = `${ad.imagePrompt}`;
                try {
                    const result = await api.generateImage(promptToUse, options);
                    ad.imageUrl = result.url;
                    console.log(`Lee y ejecuta Prompt flux: `, promptToUse);
                } catch (e) {
                    ad.imageUrl = 'error';
                }
            }
        });

        // Wait for ALL images to finish generating
        await Promise.all(generationPromises);

        // Final progress update
        updateProgress(4);

        // Brief delay for the user to see the "Completed" state
        await new Promise(r => setTimeout(r, 800));

        renderAds();
        setStage('results');
    } catch (error) {
        console.error(error);
        setStage('results');
    }
}

if (generateMoreBtn) {
    generateMoreBtn.addEventListener('click', async () => {
        setStage('generating');
        updateProgress(0);

        if (detectedImages.length > 0) {
            selectedImageIndex = (selectedImageIndex + 1) % detectedImages.length;
            selectedImage = detectedImages[selectedImageIndex];
            console.log(`Ciclado de imagen para variante Klein: Index ${selectedImageIndex}`, selectedImage);
        }

        try {
            updateProgress(2);
            const adCopy = await api.generateCopy(websiteData, 3, currentAds);
            updateProgress(3);

            const newAdsBase = (adCopy?.ads || []).map(ad => ({
                headline: ad.headline || ad.titulo || "Título no generado",
                caption: ad.caption || ad.texto || "Texto no generado",
                imageUrl: null,
                visualConcept: ad.visual_concept || ad.concepto || "",
                imagePrompt: ad.image_prompt || ad.prompt || ""
            }));

            // Generate images for new ads
            const newGenerationPromises = newAdsBase.map(async (ad, i) => {
                let options = { width: 1024, height: 1024, seed: Math.floor(Math.random() * 1000000) };
                let promptToUse = ad.imagePrompt;
                if (i === 0 && selectedImage) {
                    options.model = 'klein';
                    options.image = selectedImage;

                    try {
                        const result = await api.generateImage(promptToUse, options);
                        ad.imageUrl = result.url;
                        console.log(`Prompt variante klein: `, promptToUse);
                    } catch (e) {
                        ad.imageUrl = selectedImage;
                        ad.productOverlay = null;
                    }
                } else {
                    options.model = 'flux';
                    promptToUse = `${ad.imagePrompt}`;
                    console.log(`Promt variante flux: `, promptToUse);
                    try {
                        const result = await api.generateImage(promptToUse, options);
                        ad.imageUrl = result.url;
                    } catch (e) {
                        ad.imageUrl = 'error';
                    }
                }
            });

            await Promise.all(newGenerationPromises);

            currentAds = [...currentAds, ...newAdsBase];

            updateProgress(4);
            await new Promise(r => setTimeout(r, 800));

            renderAds();
            setStage('results');
        } catch (error) {
            setStage('results');
        }
    });
}

if (resetBtn) {
    resetBtn.addEventListener('click', () => {
        websiteUrlInput.value = '';
        currentAds = [];
        websiteData = null;
        selectedImage = null;
        setStage('input');
    });
}

function renderAds() {
    if (!adsGallery) return;
    adsGallery.innerHTML = '';
    const template = document.getElementById('ad-card-template');

    currentAds.forEach(ad => {
        const clone = template.content.cloneNode(true);
        if (ad.imageUrl === 'error') {
            clone.querySelector('.image-placeholder').innerHTML = '<span class="material-symbols-outlined text-neon-pink">error</span>';
        } else if (ad.imageUrl) {
            const img = clone.querySelector('.ad-img');
            img.src = ad.imageUrl;
            img.classList.remove('hidden');
            clone.querySelector('.image-placeholder').classList.add('hidden');

            if (ad.productOverlay) {
                const overlayImg = clone.querySelector('.product-overlay');
                if (overlayImg) {
                    overlayImg.src = ad.productOverlay;
                    overlayImg.classList.remove('hidden');
                }
            }
        }

        clone.querySelector('.ad-headline').textContent = ad.headline;
        clone.querySelector('.ad-caption').textContent = ad.caption;
        clone.querySelector('.concept-text').textContent = ad.visualConcept;

        clone.querySelector('.copy-btn').addEventListener('click', () => {
            navigator.clipboard.writeText(`${ad.headline}\n\n${ad.caption}`);
            const toast = document.getElementById("toast");
            toast.classList.add("show");
            setTimeout(() => {
                toast.classList.remove("show");
            }, 3000);
        });

        clone.querySelector('.download-btn').addEventListener('click', async (e) => {
            if (!ad.imageUrl || ad.imageUrl === 'error') return;

            const btn = e.currentTarget;
            const originalText = btn.innerHTML;
            btn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span><span>		Procesando...</span>';
            btn.disabled = true;

            try {
                let finalUrl = ad.imageUrl;
                if (ad.productOverlay) {
                    try {
                        finalUrl = await api.composeAdImage(ad.imageUrl, ad.productOverlay);
                    } catch (err) {
                        console.error("Composite failed, using background only", err);
                    }
                }

                const link = document.createElement('a');
                link.href = finalUrl;
                link.download = `ad-${Date.now()}.jpg`;
                link.click();
            } finally {
                btn.innerHTML = originalText;
                btn.disabled = false;
            }
        });

        adsGallery.appendChild(clone);
    });
}
