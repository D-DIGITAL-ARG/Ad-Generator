// script.js - SiteToAds (Vanilla JS Migration)

// Configuration
// RESTORED ORIGINAL KEYS FROM SERVER SIDE CODE
const CONFIG = {
    // Original server endpoints were gen.pollinations.ai
    POLLINATIONS_TEXT_URL: 'https://gen.pollinations.ai/text',
    POLLINATIONS_IMAGE_URL: 'https://gen.pollinations.ai/image',
    KEYS: {
        TEXT: 'sk_2Z4CT1Tk202rvhy3plHCekfCb1iYEn7W',
        IMAGE: 'sk_niuwukmqzen4hv0DItZ97nPj1AiWJpX5'
    },
    MODELS: {
        TEXT: 'gemini-fast',
        IMAGE: 'flux'
    }
};

// State
let state = {
    stage: 'input', // input, generating, results
    url: '',
    websiteData: null,
    ads: [],
    detectedImages: [],
    currentStep: 0
};

// DOM Elements
const stages = {
    input: document.getElementById('stage-input'),
    generating: document.getElementById('stage-generating'),
    results: document.getElementById('stage-results')
};

const inputForm = document.getElementById('url-form');
const urlInput = document.getElementById('url-input');
const pasteBtn = document.getElementById('paste-btn');
const generateBtn = document.getElementById('generate-btn');
const resetBtn = document.getElementById('reset-btn');
const generateMoreBtn = document.getElementById('generate-more-btn');
const resultsGrid = document.getElementById('results-grid');
const resultsUrl = document.getElementById('results-url');
const resultsCount = document.getElementById('results-count');
const downloadAllBtn = document.getElementById('download-all-btn');

const stepsContainer = document.getElementById('steps-container');
const progressBar = document.getElementById('progress-bar');
const progressText = document.getElementById('progress-text');

// Init
function init() {
    setupEventListeners();
    updateStage('input');
    console.log("SiteToAds Initialized v2 (Fixed Auth)");
}

function setupEventListeners() {
    // Input Stage
    inputForm.addEventListener('submit', handleAnalyze);
    pasteBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            urlInput.value = text;
        } catch (err) {
            console.error('Clipboard access failed', err);
            alert('Permiso de portapapeles denegado. Por favor pega manualmente (Ctrl+V).');
        }
    });

    // Results Stage
    resetBtn.addEventListener('click', () => {
        state = { ...state, stage: 'input', ads: [], websiteData: null };
        urlInput.value = '';
        updateStage('input');
    });

    generateMoreBtn.addEventListener('click', handleGenerateMore);
    downloadAllBtn.addEventListener('click', handleDownloadAll);
}

// Stage Management
function updateStage(newStage) {
    state.stage = newStage;

    // Hide all
    Object.values(stages).forEach(el => {
        el.classList.add('hidden');
        el.style.opacity = '0';
    });

    // Show current
    const current = stages[newStage];
    current.classList.remove('hidden');
    // specific implementation of transition
    setTimeout(() => {
        current.style.opacity = '1';
    }, 50);

    if (newStage === 'generating') {
        updateProgress(0);
    }
}

function updateProgress(stepIndex) {
    state.currentStep = stepIndex;
    const totalSteps = 4;
    const progress = Math.round(((stepIndex + 1) / totalSteps) * 100);

    progressBar.style.width = `${progress}%`;
    progressText.innerText = `${progress}%`;

    // Update step styling
    const stepItems = stepsContainer.querySelectorAll('.step-item');
    stepItems.forEach((item, index) => {
        const iconContainer = item.querySelector('.step-icon');
        const iconSpan = item.querySelector('.material-symbols-outlined');
        const label = item.querySelector('.step-label');
        const sublabel = item.querySelector('.step-sublabel');

        const isActive = index === stepIndex;
        const isComplete = index < stepIndex;

        if (isActive) {
            iconContainer.className = 'step-icon w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 bg-gradient-primary border-white/20 shadow-lg shadow-neon-pink/20';
            iconSpan.classList.remove('text-gray-600', 'text-neon-cyan');
            iconSpan.classList.add('text-white');
            iconSpan.innerText = item.dataset.stepicon || getIconName(index); // Fallback if needed

            label.classList.remove('text-gray-600');
            label.classList.add('text-white');

            sublabel.classList.remove('text-gray-700');
            sublabel.classList.add('text-neon-cyan');
        } else if (isComplete) {
            iconContainer.className = 'step-icon w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 bg-neon-cyan/10 border-neon-cyan/30';
            iconSpan.classList.remove('text-gray-600', 'text-white');
            iconSpan.classList.add('text-neon-cyan');
            iconSpan.innerText = 'check_circle';

            label.classList.remove('text-gray-600');
            label.classList.add('text-white');

            sublabel.classList.remove('text-gray-700');
            sublabel.classList.add('text-gray-600');
        } else {
            iconContainer.className = 'step-icon w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 border-2 bg-input-bg border-gray-800';
            iconSpan.classList.remove('text-white', 'text-neon-cyan', 'check_circle');
            iconSpan.classList.add('text-gray-600');
            iconSpan.innerText = getIconName(index);

            label.classList.remove('text-white');
            label.classList.add('text-gray-600');

            sublabel.classList.remove('text-neon-cyan');
            sublabel.classList.add('text-gray-700');
        }
    });
}

function getIconName(index) {
    const icons = ['search', 'auto_awesome', 'edit_note', 'brush'];
    return icons[index] || 'circle';
}

// Logic: Analysis & Generation
async function handleAnalyze(e) {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (!url) return;

    state.url = url;
    window.currentScannedUrl = url;
    updateStage('generating');

    try {
        console.log("Starting analysis for:", url);
        // Step 0: Analyze
        updateProgress(0);

        await new Promise(r => setTimeout(r, 1000));

        const websiteData = await mockAnalyze(url);
        state.websiteData = websiteData;
        console.log("Website Data:", websiteData);

        // Step 1: Synthesis
        updateProgress(1);
        await new Promise(r => setTimeout(r, 800));

        // Step 2: Copywriting
        updateProgress(2);
        const adsData = await generateAdsCopy(websiteData, 3);
        console.log("Ads Data:", adsData);

        // Step 3: Visuals
        updateProgress(3);

        // Initialize ads in state with loading logic
        state.ads = adsData.map(ad => ({
            ...ad,
            imageUrl: null,
            status: 'pending'
        }));

        renderResults();
        updateStage('results');

        // Start Image Generation
        generateImagesForAds(state.ads);

    } catch (error) {
        console.error("Error in flow", error);
        alert("Hubo un error al procesar. Verifica tu conexión o intenta nuevamente.");
        // Fallback if everything fails heavily
        updateStage('results');
    }
}

async function handleGenerateMore() {
    updateStage('generating');
    updateProgress(2);

    try {
        const existingHeadlines = state.ads.map(ad => ad.headline);
        const newAdsData = await generateAdsCopy(state.websiteData, 3, existingHeadlines);

        const newAds = newAdsData.map(ad => ({
            ...ad,
            imageUrl: null,
            status: 'pending'
        }));

        state.ads = [...state.ads, ...newAds];
        state.currentStep = 3;
        updateProgress(3);

        updateStage('results');
        renderResults();

        generateImagesForAds(newAds);

    } catch (e) {
        console.error(e);
        updateStage('results');
    }
}

// API Calls
async function mockAnalyze(url) {
    let domain = 'sitio';
    try {
        domain = new URL(url).hostname;
    } catch (e) { }

    const prompt = `Analiza el dominio "${domain}" y la URL completo "${url}". Infiere 100% el contenido.
    Devuelve un JSON con:
    {
        "brand_name": "Nombre probable",
        "products_services": ["servicio/producto 1", "servicio/producto 2"],
        "brand_tone": "Profesional/Divertido/Lujo",
        "background_color_primary": "hex color",
        "overall_atmosphere": "descripción visual corta"
    }
    RESPONDE SOLO EL JSON.`;

    try {
        const encoded = encodeURIComponent(prompt);
        // AUTH ADDED HERE
        const response = await fetch(`${CONFIG.POLLINATIONS_TEXT_URL}/${encoded}?model=${CONFIG.MODELS.TEXT}&json=true&seed=${Math.random()}`, {
            headers: {
                'Authorization': `Bearer ${CONFIG.KEYS.TEXT}`,
                'Accept': '*/*'
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API call failed: ${response.status} ${errText}`);
        }

        const text = await response.text();
        const json = safeJsonParse(text);
        if (!json) throw new Error("JSON parse failed");
        return json;
    } catch (e) {
        console.warn("Analysis API failed, using fallback", e);
        return {
            brand_name: domain,
            products_services: ["Servicios Generales", "Productos de Calidad"],
            brand_tone: "Profesional",
            background_color_primary: "#1a1d30",
            overall_atmosphere: "Moderno, limpio y confiable"
        };
    }
}

async function generateAdsCopy(websiteData, count, exclude = []) {
    const systemPrompt = `Actúa como experto en marketing. Crea ${count} anuncios en Español para: ${JSON.stringify(websiteData)}.
    Excluye: ${exclude.join(', ')}.
    JSON: [{"headline": "Titulo Corto", "caption": "Texto persuasivo de 2 frases.", "visual_concept": "Estilo", "image_prompt": "High quality photo of..."}]
    Headline max 5 palabras.`;

    try {
        const encoded = encodeURIComponent(systemPrompt);
        // AUTH ADDED HERE
        const response = await fetch(`${CONFIG.POLLINATIONS_TEXT_URL}/${encoded}?model=${CONFIG.MODELS.TEXT}&json=true&seed=${Math.random()}`, {
            headers: {
                'Accept': '*/*',
                'Authorization': `Bearer ${CONFIG.KEYS.TEXT}`
            }
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`API call failed: ${response.status} ${errText}`);
        }

        const text = await response.text();
        console.log("Raw Copy Response:", text);

        const json = safeJsonParse(text);

        if (Array.isArray(json)) return json;
        if (json && json.ads) return json.ads;
        if (json && json.items) return json.items;

        // If strict JSON fails, try regex for objects inside text
        // Fallback handled in catch
        throw new Error("Invalid structure");
    } catch (e) {
        console.error("Copy Gen Failed, using fallback. Reason:", e.message);
        // Fallback Ads - NOW EXECUTED WHEN API FAILS
        const fallbacks = [];
        for (let i = 0; i < count; i++) {
            fallbacks.push({
                headline: "Solución Perfecta Para Ti",
                caption: `Descubre lo mejor de ${websiteData.brand_name || 'nosotros'}. Calidad garantizada y servicio excepcional para tus necesidades.`,
                image_prompt: `High quality advertising photography for ${websiteData.brand_name || 'modern product'}, cinematic lighting, 4k, trending on artstation`,
                visual_concept: "Moderno y minimalista"
            });
        }
        return fallbacks;
    }
}

async function generateImagesForAds(adsToGenerate) {
    for (const ad of adsToGenerate) {
        try {
            const seed = Math.floor(Math.random() * 100000);
            const cleanPrompt = (ad.image_prompt || "Abstract modern art").replace(/[^a-zA-Z0-9 ,.-]/g, '');
            const encodedPrompt = encodeURIComponent(cleanPrompt);

            // Construct URL - NO AUTH REQUIRED FOR GET IMAGE Usually, but server used it. 
            // Fetching image blob directly to bypass potential hotlinking protection or browser quirks?
            // Actually, for <img> src, we can't easily add headers.
            // But if we use fetch() to get blob, we can add headers.

            // OPTION 1: Try direct URL first (simplest). If it fails (403), use fetch with headers -> blob.
            // Server code used fetch with Authorization -> arrayBuffer -> base64

            // Let's implement fetch -> blob -> objectURL approach to support Auth
            console.log("Generating image with AUTH...");

            const rawUrl = `${CONFIG.POLLINATIONS_IMAGE_URL}/${encodedPrompt}?width=1080&height=1080&model=${CONFIG.MODELS.IMAGE}&seed=${seed}&nologo=true`;

            const response = await fetch(rawUrl, {
                headers: {
                    'Accept': '*/*',
                    'Authorization': `Bearer ${CONFIG.KEYS.IMAGE}`
                }
            });

            if (!response.ok) throw new Error("Image API Failed");

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            ad.imageUrl = objectUrl;
            ad.status = 'complete';

        } catch (e) {
            console.error("Image gen failed completely", e);
            // Last resort fallback
            ad.imageUrl = 'https://placehold.co/1080x1080/1a1d30/FFF?text=Error+Loading';
            ad.status = 'error';
        }

        renderResults();
    }
}

// UI Rendering
function renderResults() {
    resultsGrid.innerHTML = '';
    resultsCount.innerText = state.ads.length;
    resultsUrl.innerText = state.url || 'https://site.com';
    resultsUrl.href = state.url || '#';

    state.ads.forEach((ad, index) => {
        const card = document.createElement('div');
        card.className = "group h-full flex flex-col fade-in-up";
        card.style.animationDelay = `${index * 0.1}s`;

        // Handle Image State
        let imageContent;
        if (!ad.imageUrl) {
            // Loading State
            imageContent = `
                <div class="w-full h-full flex flex-col items-center justify-center p-8 text-center bg-gradient-card">
                    <div class="w-10 h-10 rounded-full border-t-2 border-neon-cyan border-r-2 border-transparent animate-spin"></div>
                    <p class="text-[10px] text-neon-cyan font-black tracking-widest mt-4 uppercase animate-pulse">GENERANDO...</p>
                </div>
            `;
        } else if (ad.imageUrl.includes('placehold.co')) {
            imageContent = `
                <div class="w-full h-full flex items-center justify-center bg-gray-900">
                    <p class="text-red-500 font-bold">Error de imagen</p>
                </div>
            `;
        } else {
            imageContent = `
                <img src="${ad.imageUrl}" alt="Ad Image" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div class="absolute inset-0 bg-gradient-to-t from-dark-bg/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-end p-6">
                    <button onclick="downloadImage('${ad.imageUrl}', ${index})" class="w-full bg-white text-dark-bg py-3 rounded-xl font-black text-xs tracking-widest uppercase hover:bg-neon-cyan transition-colors flex items-center justify-center gap-2">
                        <span class="material-symbols-outlined text-lg">download</span>
                        DESCARGAR
                    </button>
                </div>
            `;
        }

        card.innerHTML = `
            <div class="bg-card-bg border border-gray-800 rounded-[32px] overflow-hidden flex flex-col h-full hover:border-[#00d2ff]/30 transition-all duration-500 shadow-2xl hover:shadow-neon-cyan/5">
                <div class="relative aspect-square overflow-hidden bg-input-bg">
                    ${imageContent}
                    <div class="absolute top-4 left-4 bg-dark-bg/60 backdrop-blur-md border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2">
                        <span class="material-symbols-outlined text-neon-cyan text-sm">auto_awesome</span>
                        <span class="text-[10px] font-black tracking-widest uppercase text-white">IA Gen</span>
                    </div>
                </div>
                <div class="p-6 flex flex-col flex-1">
                    <h3 class="font-black text-lg text-white mb-2 leading-tight tracking-tight line-clamp-2">${ad.headline}</h3>
                    <p class="text-gray-500 text-xs mb-6 font-bold leading-relaxed line-clamp-3">${ad.caption}</p>
                    <div class="mt-auto flex gap-2">
                        <button onclick="copyToClipboard('${(ad.caption || "").replace(/'/g, "\\'")}')" class="flex-1 flex items-center justify-center gap-2 h-10 rounded-xl border border-gray-800 text-gray-400 hover:border-neon-pink hover:text-neon-pink transition-all duration-300">
                            <span class="material-symbols-outlined text-lg">content_copy</span>
                            <span class="text-[10px] font-black tracking-widest uppercase">COPIAR</span>
                        </button>
                    </div>
                </div>
            </div>
        `;
        resultsGrid.appendChild(card);
    });
}

// Helpers
function safeJsonParse(str) {
    if (!str) return null;
    try {
        // Find JSON object
        const match = str.match(/\[.*\]|\{.*\}/s);
        if (match) {
            return JSON.parse(match[0]);
        }
        return JSON.parse(str);
    } catch (e) {
        // Fallback: try to just extract fields if it's not valid JSON
        console.warn("JSON parse failed, raw:", str);
        return null;
    }
}

// Exposed global functions for inline onclicks
window.downloadImage = async (url, index) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `anuncio-${index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
    } catch (e) {
        // Fallback manual open
        window.open(url, '_blank');
    }
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    alert("Texto copiado al portapapeles");
};

async function handleDownloadAll() {
    const validAds = state.ads.filter(a => a.imageUrl && !a.imageUrl.includes('placehold.co'));
    if (validAds.length === 0) return;

    alert(`Descargando ${validAds.length} imágenes...`);

    for (let i = 0; i < validAds.length; i++) {
        await window.downloadImage(validAds[i].imageUrl, i);
        // Small delay
        await new Promise(r => setTimeout(r, 500));
    }
}

// Start
init();
