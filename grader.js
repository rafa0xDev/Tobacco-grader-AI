// ====================================================================================
// TOBACCO AI PLATFORM: VISUAL GRADER & VOICE LOGGER
// ====================================================================================

// --- 1. Konfigurasi Global & Variabel UI ---
const URL = "https://teachablemachine.withgoogle.com/models/7gCLuSeFJ/"; // <--- GANTI URL INI!
let model, webcam, labelContainer, maxPredictions;

// Variabel Kontrol Audio
const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');

// Variabel Dashboard Logger (Sesuai ID di grader.html)
const statusMessage = document.getElementById('statusMessage');
const resultText = document.getElementById('resultText');
const kualitasDaunList = document.getElementById('kualitas-daun-list');
const logistikPanenList = document.getElementById('logistik-panen-list');
const tindakLanjutList = document.getElementById('tindak-lanjut-list');

// Variabel Web Speech API
let recognition = null;
let finalTranscript = '';

// --- REGEX UNTUK KATEGORI VOICE LOGGER (Baru) ---
// Digunakan untuk mengklasifikasikan ucapan ke dalam kategori tembakau
const kualitasDaunRegex = /\b(warna|cacat|bercak|sobek|kering|penyakit|jamur|tekstur|busuk|bagus|jelek|kualitas|premium)\b/ig;
const logistikPanenRegex = /\b(gudang|lot|panen|tanggal|simpan|sortir|blok|kilo|jumlah|masuk)\b/ig;
const tindakLanjutRegex = /\b(ikat|bungkus|proses|kirim|tambahan|segera|tugas|perlu|cek|perbaikan)\b/ig;

// ====================================================================================
// --- 2. FUNGSI UTAMA AI VISUAL (VISUAL GRADER) ---
// ====================================================================================

async function initVisualGrader() {
    statusMessage.innerHTML = "Memuat model Visual Grader...";
    const modelURL = URL + "model.json";
    const metadataURL = URL + "metadata.json";

    // Muat model dan metadata
    model = await tmImage.load(modelURL, metadataURL);
    maxPredictions = model.getTotalClasses();

    // Siapkan Webcam
    const flip = true; // Agar gambar tidak terbalik
    webcam = new tmImage.Webcam(320, 240, flip); 
    await webcam.setup(); // Meminta akses kamera
    await webcam.play();
    document.getElementById("webcam-container").appendChild(webcam.canvas);

    // Siapkan area hasil prediksi
    labelContainer = document.getElementById("label-container");
    for (let i = 0; i < maxPredictions; i++) { 
        labelContainer.appendChild(document.createElement("div"));
    }

    statusMessage.innerHTML = "Visual Grader Aktif. Memulai Prediksi...";
    window.requestAnimationFrame(loop);
}

async function loop() {
    webcam.update(); 
    await predict();
    window.requestAnimationFrame(loop);
}

async function predict() {
    const prediction = await model.predict(webcam.canvas);
    let highestProb = 0;
    let highestClass = "Membaca...";

    for (let i = 0; i < maxPredictions; i++) {
        const classPrediction =
            prediction[i].className + ": " + prediction[i].probability.toFixed(2);
        
        // Update label container
        labelContainer.childNodes[i].innerHTML = classPrediction;
        
        // Cari Grade dengan probabilitas tertinggi
        if (prediction[i].probability > highestProb) {
            highestProb = prediction[i].probability;
            highestClass = prediction[i].className;
        }
    }

    // Tampilkan hasil Grade tertinggi
    if (highestProb > 0.6) { // Batas kepercayaan 60%
        document.getElementById("predictionText").innerHTML = highestClass;
        // Opsional: ganti warna teks hasil
        document.getElementById("predictionText").style.color = (highestClass.includes("Grade A")) ? "#2ecc71" : 
                                                               (highestClass.includes("Grade B")) ? "#FFC300" : 
                                                               "#e74c3c"; // Merah untuk Grade Rendah
    } else {
        document.getElementById("predictionText").innerHTML = "Fokuskan Daun (Di Bawah 60%)";
        document.getElementById("predictionText").style.color = "#b0b0c0";
    }
}

// ====================================================================================
// --- 3. FUNGSI AI AUDIO (VOICE LOGGER) ---
// ====================================================================================

function initVoiceLogger() {
    if ('webkitSpeechRecognition' in window) {
        recognition = new webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'id-ID'; // Bahasa Indonesia

        recognition.onstart = function() {
            statusMessage.innerHTML = '🎤 Voice Logger AKTIF. Silakan Bicara...';
            stopButton.disabled = false;
            recordButton.disabled = true;
        };

        recognition.onend = function() {
            statusMessage.innerHTML = '⏸ Voice Logger BERHENTI. Siap Merekam Kembali.';
            stopButton.disabled = true;
            recordButton.disabled = false;
        };

        recognition.onerror = function(event) {
            console.error('Speech Recognition Error:', event.error);
            statusMessage.innerHTML = `⚠️ Error Voice Logger: ${event.error}. Cek Mikrofon.`;
            stopButton.disabled = true;
            recordButton.disabled = false;
        };

        recognition.onresult = function(event) {
            let interimTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                const transcript = event.results[i][0].transcript;
                if (event.results[i].isFinal) {
                    finalTranscript += transcript + '. ';
                    classifyTranscript(transcript); // Klasifikasi saat ucapan final
                } else {
                    interimTranscript += transcript;
                }
            }
            resultText.innerHTML = finalTranscript + ' <span style="color:#FFC300;">' + interimTranscript + '</span>';
        };
    } else {
        statusMessage.innerHTML = 'Browser Anda tidak mendukung Web Speech API. Gunakan Chrome/Edge terbaru.';
    }
}

function startRecording() {
    if (recognition) {
        finalTranscript = '';
        resultText.innerHTML = 'Merekam...';
        // Reset dashboard sebelum mulai
        resetLoggerDashboard();
        recognition.start();
    }
}

function stopRecording() {
    if (recognition) {
        recognition.stop();
    }
}

// ====================================================================================
// --- 4. FUNGSI KLASIFIKASI & TAMPILAN DASHBOARD ---
// ====================================================================================

function classifyTranscript(text) {
    if (text.match(kualitasDaunRegex)) {
        addLogEntry(kualitasDaunList, text);
    }
    if (text.match(logistikPanenRegex)) {
        addLogEntry(logistikPanenList, text);
    }
    if (text.match(tindakLanjutRegex)) {
        addLogEntry(tindakLanjutList, text);
    }
}

function addLogEntry(listElement, text) {
    // Hapus entry default
    if (listElement.firstElementChild && listElement.firstElementChild.textContent.includes('Belum ada catatan')) {
        listElement.innerHTML = '';
    }
    const listItem = document.createElement('li');
    listItem.textContent = text.trim();
    listElement.appendChild(listItem);
}

function resetLoggerDashboard() {
    kualitasDaunList.innerHTML = '<li>— Belum ada catatan —</li>';
    logistikPanenList.innerHTML = '<li>— Belum ada catatan —</li>';
    tindakLanjutList.innerHTML = '<li>— Belum ada catatan —</li>';
}

// ====================================================================================
// --- 5. FUNGSI SIMPAN/MUAT DATA (LocalStorage) ---
// ====================================================================================

function saveData() {
    if (finalTranscript.length === 0) {
        alert("Tidak ada transkrip untuk disimpan!");
        return;
    }
    const data = {
        transcript: finalTranscript,
        kualitasDaun: Array.from(kualitasDaunList.children).map(li => li.textContent),
        logistikPanen: Array.from(logistikPanenList.children).map(li => li.textContent),
        tindakLanjut: Array.from(tindakLanjutList.children).map(li => li.textContent),
        visualGrade: document.getElementById("predictionText").textContent,
        timestamp: new Date().toLocaleString()
    };
    // Simpan data sebagai string JSON di Local Storage
    localStorage.setItem('tobaccoAIData', JSON.stringify(data));
    alert(`Data Grading Tembakau berhasil disimpan pada ${data.timestamp}!`);
}

function loadData() {
    const savedData = localStorage.getItem('tobaccoAIData');
    if (savedData) {
        const data = JSON.parse(savedData);
        finalTranscript = data.transcript;
        resultText.innerHTML = finalTranscript;
        
        // Muat kembali logger dashboard
        resetLoggerDashboard();
        data.kualitasDaun.forEach(text => addLogEntry(kualitasDaunList, text));
        data.logistikPanen.forEach(text => addLogEntry(logistikPanenList, text));
        data.tindakLanjut.forEach(text => addLogEntry(tindakLanjutList, text));

        // Tampilkan Grade Visual terakhir yang tersimpan
        document.getElementById("predictionText").innerHTML = data.visualGrade || "Data lama, Grade tidak tersimpan.";
        alert(`Data Grading Tembakau berhasil dimuat dari ${data.timestamp}.`);
    } else {
        alert("Tidak ada data grading yang tersimpan di browser ini.");
    }
}

// ====================================================================================
// --- 6. EVENT LISTENERS & INICIALISASI UTAMA ---
// ====================================================================================

window.onload = function() {
    // 1. Inisiasi Visual Grader (AI Visual)
    initVisualGrader();

    // 2. Inisiasi Voice Logger (AI Audio)
    initVoiceLogger(); 

    // 3. Pasang Event Listeners
    recordButton.addEventListener('click', startRecording);
    stopButton.addEventListener('click', stopRecording);
    saveButton.addEventListener('click', saveData);
    loadButton.addEventListener('click', loadData);
};