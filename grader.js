// ====================================================================================
// TOBACCO AI PLATFORM: VISUAL GRADER & VOICE LOGGER (FINAL FRONTEND VERSION)
// ====================================================================================

// --- 1. Konfigurasi Global & Variabel UI ---
const URL = "https://teachablemachine.withgoogle.com/models/7gCLuSeFJ/"; // <--- GANTI URL JIKA PERLU
let model, webcam, labelContainer, maxPredictions;
let visualActive = true; // status kamera & loop

// Variabel Kontrol Audio
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');

// Variabel Dashboard Logger
const statusMessage = document.getElementById('statusMessage');
const resultText = document.getElementById('resultText');
const kualitasDaunList = document.getElementById('kualitas-daun-list');
const logistikPanenList = document.getElementById('logistik-panen-list');
const tindakLanjutList = document.getElementById('tindak-lanjut-list');

// Variabel Web Speech API
let recognition = null;
let finalTranscript = '';

// --- REGEX UNTUK KATEGORI VOICE LOGGER ---
const kualitasDaunRegex = /\b(warna|cacat|bercak|sobek|kering|penyakit|jamur|tekstur|busuk|bagus|jelek|kualitas|premium)\b/ig;
const logistikPanenRegex = /\b(gudang|lot|panen|tanggal|simpan|sortir|blok|kilo|jumlah|masuk)\b/ig;
const tindakLanjutRegex = /\b(ikat|bungkus|proses|kirim|tambahan|segera|tugas|perlu|cek|perbaikan)\b/ig;

// ====================================================================================
// --- 2. FUNGSI UTAMA AI VISUAL (VISUAL GRADER) ---
// ====================================================================================

async function initVisualGrader() {
    try {
        statusMessage.innerHTML = "📦 Memuat model Visual Grader...";
        const modelURL = URL + "model.json";
        const metadataURL = URL + "metadata.json";

        model = await tmImage.load(modelURL, metadataURL);
        maxPredictions = model.getTotalClasses();

        const flip = true;
        webcam = new tmImage.Webcam(320, 240, flip);
        await webcam.setup();
        await webcam.play();
        document.getElementById("webcam-container").appendChild(webcam.canvas);

        labelContainer = document.getElementById("label-container");
        labelContainer.innerHTML = "";
        for (let i = 0; i < maxPredictions; i++) {
            labelContainer.appendChild(document.createElement("div"));
        }

        let gradeResult = document.getElementById("gradeResult");
        if (!document.getElementById("descriptionText")) {
            const descEl = document.createElement("p");
            descEl.id = "descriptionText";
            descEl.style.marginTop = "10px";
            descEl.style.fontSize = "1rem";
            descEl.style.color = "#b0b0c0";
            descEl.textContent = "Menunggu hasil prediksi untuk deskripsi...";
            gradeResult.appendChild(descEl);
        }

        statusMessage.innerHTML = "✅ Visual Grader Aktif. Memulai prediksi...";
        window.requestAnimationFrame(loop);

        // 🔍 Pantau status kamera tiap 2 detik
        setInterval(checkCameraStatus, 2000);

    } catch (err) {
        console.error("Error initVisualGrader:", err);
        statusMessage.innerHTML = `⚠️ Gagal memuat model atau kamera: ${err.message}`;
        visualActive = false;
    }
}

async function loop() {
    try {
        if (visualActive && webcam && webcam.canvas) {
            webcam.update();
            await predict();
            window.requestAnimationFrame(loop);
        } else {
            statusMessage.innerHTML = "⚠️ Kamera tidak aktif. Penilaian visual dihentikan sementara.";
        }
    } catch (err) {
        console.error("Error loop:", err);
        statusMessage.innerHTML = "❌ Terjadi kesalahan saat loop. Penilaian dihentikan.";
        visualActive = false;
    }
}

// ====================================================================================
// --- 3. PREDIKSI & DESKRIPSI OTOMATIS ---
// ====================================================================================

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let highestProb = 0;
    let highestClass = "Membaca...";

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        if (labelContainer && labelContainer.childNodes[i]) {
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            highestClass = prediction[i].className;
        }
    }

    const predictionTextEl = document.getElementById("predictionText");
    const descriptionEl = document.getElementById("descriptionText");

    if (highestProb > 0.6) {
        predictionTextEl.innerHTML = highestClass;
        predictionTextEl.style.color =
            highestClass.includes("Grade A") ? "#2ecc71" :
            highestClass.includes("Grade B") ? "#FFC300" :
            "#e74c3c";

        const features = analyzeImageFeatures(webcam.canvas);
        const deskripsi = buildDescriptionFromFeatures(highestClass, highestProb, features);
        descriptionEl.innerHTML = deskripsi;

    } else {
        predictionTextEl.innerHTML = "Fokuskan Daun (Di Bawah 60%)";
        predictionTextEl.style.color = "#b0b0c0";
        descriptionEl.innerHTML = "Model belum cukup yakin — perbaiki pencahayaan atau jarak kamera.";
    }
}

// ====================================================================================
// --- 4. Analisis Visual Fitur (warna, terang, tekstur) ---
// ====================================================================================
function analyzeImageFeatures(canvas) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    const imgData = ctx.getImageData(0, 0, w, h);
    const data = imgData.data;
    let r = 0, g = 0, b = 0, total = 0;
    let brightnessArr = [];

    for (let i = 0; i < data.length; i += 16) {
        r += data[i];
        g += data[i + 1];
        b += data[i + 2];
        const brightness = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        brightnessArr.push(brightness);
        total++;
    }

    const meanR = r / total;
    const meanG = g / total;
    const meanB = b / total;
    const meanBrightness = brightnessArr.reduce((a, b) => a + b, 0) / brightnessArr.length;
    const variance = brightnessArr.reduce((a, b) => a + Math.pow(b - meanBrightness, 2), 0) / brightnessArr.length;
    const stdDev = Math.sqrt(variance);
    const greenRatio = meanG / ((meanR + meanB) / 2 + 1e-6);
    const yellowLikelihood = (meanR + meanG) / 2 - meanB;

    return { meanR, meanG, meanB, meanBrightness, stdDev, greenRatio, yellowLikelihood };
}

// ====================================================================================
// --- 5. Deskripsi Otomatis + Voice Logger ---
// ====================================================================================
function buildDescriptionFromFeatures(highestClass, highestProb, f) {
    let base = "";
    if (highestClass.includes("Grade A")) {
        base = "Daun tembakau kualitas premium terdeteksi di area gudang penyimpanan. Kondisi sangat baik, warna hijau segar, dan tekstur rata tanpa cacat.";
    } else if (highestClass.includes("Grade B")) {
        base = "Daun tembakau dengan kualitas menengah terdeteksi di gudang. Warna mulai berubah dan tekstur agak tidak rata, namun masih layak untuk diproses lebih lanjut.";
    } else if (highestClass.includes("Grade C")) {
        base = "Daun tembakau dengan kualitas rendah terdeteksi. Warna cenderung menguning dan tekstur menunjukkan bercak atau kerusakan. Perlu penyortiran atau tindakan lanjut.";
    } else {
        base = `Hasil pengamatan: ${highestClass}.`;
    }

    let cues = [];
    if (f.greenRatio > 1.3 && f.meanBrightness > 90) {
        cues.push("warna dominan hijau cerah");
    } else if (f.yellowLikelihood > 30) {
        cues.push("terdapat kecenderungan menguning");
    } else if (f.meanBrightness < 70) {
        cues.push("pencahayaan rendah, warna daun agak gelap");
    } else {
        cues.push("warna terlihat normal");
    }

    if (f.stdDev > 25) {
        cues.push("tekstur tidak merata");
    } else {
        cues.push("tekstur relatif halus");
    }

    const confPercent = Math.round(highestProb * 100);
    const template = `${base} (${confPercent}% keyakinan sistem). Catatan visual tambahan: ${cues.join(', ')}.`;

    if (typeof classifyTranscript === 'function') {
        classifyTranscript(template);
        resultText.innerHTML += `<br><span style="color:#2ecc71;">[AUTO] ${template}</span><br>`;
        finalTranscript += template + " ";
    }

    return template;
}

// ====================================================================================
// --- 6. DETEKSI KAMERA HIDUP/MATI ---
// ====================================================================================
function checkCameraStatus() {
    try {
        const stream = webcam.webcam.srcObject;
        const tracks = stream ? stream.getVideoTracks() : [];
        const cameraActive = tracks.length > 0 && tracks[0].readyState === "live";

        if (!cameraActive && visualActive) {
            visualActive = false;
            statusMessage.innerHTML = "⚠️ Kamera tidak aktif. Penilaian visual dihentikan sementara.";
        } else if (cameraActive && !visualActive) {
            visualActive = true;
            statusMessage.innerHTML = "✅ Kamera aktif kembali. Melanjutkan penilaian...";
            window.requestAnimationFrame(loop);
        }
    } catch (err) {
        console.warn("Kamera belum siap:", err.message);
        visualActive = false;
    }
}

// ====================================================================================
// --- 7. VOICE LOGGER (tidak diubah, hanya disesuaikan integrasi) ---
// ====================================================================================
function initVoiceLogger() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID';

        recognition.onstart = () => {
            statusMessage.innerHTML = '🎤 Voice Logger AKTIF. Silakan Bicara...';
            stopButton.disabled = false;
            recordButton.disabled = true;
        };
        recognition.onend = () => {
            statusMessage.innerHTML = '⏸ Voice Logger BERHENTI.';
            stopButton.disabled = true;
            recordButton.disabled = false;
        };
        recognition.onerror = (event) => {
            console.error('Speech Recognition Error:', event.error);
            statusMessage.innerHTML = `⚠️ Error Voice Logger: ${event.error}.`;
        };
        recognition.onresult = (event) => {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + '. ';
                    classifyTranscript(transcript);
                } else {
                    interimTranscript += transcript;
                }
            }
            resultText.innerHTML = finalTranscript + ' <span style="color:#FFC300;">' + interimTranscript + '</span>';
        };
    } else {
        statusMessage.innerHTML = 'Browser tidak mendukung Web Speech API.';
    }
}

// ====================================================================================
// --- 8. Kontrol Tombol & Inisialisasi ---
// ====================================================================================
window.onload = function() {
    initVisualGrader();
    initVoiceLogger();
    recordButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);
    saveButton.addEventListener('click', saveData);
    loadButton.addEventListener('click', loadData);
};
