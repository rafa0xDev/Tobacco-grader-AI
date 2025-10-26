const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');

const saveButton = document.getElementById('saveButton');
const loadButton = document.getElementById('loadButton');

const statusMessage = document.getElementById('statusMessage');
const resultText = document.getElementById('resultText');

const kognitifList = document.getElementById('kognitif-list');
const afektifList = document.getElementById('afektif-list');
const psikomotorikList = document.getElementById('psikomotorik-list');

let recognition;
let finalTranscript = '';
let isRecording = false;

// --- FUNGSI BARU: SIMPAN DATA KE LOCAL STORAGE (Tugas 1) ---
function saveDataToLocalStorage() {
    const data = {
        timestamp: new Date().toLocaleString('id-ID'),
        fullTranscript: resultText.innerText,
        // Menyimpan isi HTML dari list, bukan lagi hanya data mentah
        kognitif: kognitifList.innerHTML, 
        afektif: afektifList.innerHTML,
        psikomotorik: psikomotorikList.innerHTML
    };
    
    try {
        localStorage.setItem('voiceGraderData', JSON.stringify(data));
        statusMessage.innerText = '✅ Data Penilaian berhasil disimpan!';
    } catch (e) {
        statusMessage.innerText = '⚠️ Gagal menyimpan data (localStorage penuh).';
        console.error("Local storage save error:", e);
    }
}

// --- FUNGSI BARU: MUAT DATA DARI LOCAL STORAGE (Tugas 1) ---
function loadDataFromLocalStorage() {
    try {
        const storedData = localStorage.getItem('voiceGraderData');
        
        if (!storedData) {
            statusMessage.innerText = '⚠️ Tidak ada data penilaian tersimpan.';
            return;
        }
        
        const data = JSON.parse(storedData);
        
        // Muatkan kembali data ke dashboard
        resultText.innerText = data.fullTranscript;
        kognitifList.innerHTML = data.kognitif;
        afektifList.innerHTML = data.afektif;
        psikomotorikList.innerHTML = data.psikomotorik;
        
        statusMessage.innerText = `📂 Data penilaian dimuat kembali dari ${data.timestamp}.`;
        
    } catch (e) {
        statusMessage.innerText = '⚠️ Gagal memuat data (Format tidak valid).';
        console.error("Local storage load error:", e);
    }
}


// --- CEK DUKUNGAN BROWSER ---
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'id-ID';

    // === Fungsi pembersihan dashboard ===
    function clearDashboard() {
        kognitifList.innerHTML = '<li>— Belum ada komentar —</li>';
        afektifList.innerHTML = '<li>— Belum ada komentar —</li>';
        psikomotorikList.innerHTML = '<li>— Belum ada komentar —</li>';
        resultText.innerText = 'Belum ada hasil rekaman.';
    }

    // === Fungsi reset tombol ===
    function stopRecordingCleanup() {
        isRecording = false;
        recordButton.disabled = false;
        stopButton.disabled = true;
    }

    // === Event Recognition Mulai ===
    recognition.onstart = () => {
        isRecording = true;
        recordButton.disabled = true;
        stopButton.disabled = false;
        statusMessage.innerText = '🎤 Sedang mendengarkan...';
        resultText.innerText = '';
        finalTranscript = '';
    };

    // === Event Saat Hasil Didapat ===
    recognition.onresult = (event) => {
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript.trim();

            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
                // Panggil proses klasifikasi setiap kali kalimat selesai (isFinal=true)
                processTranscript(transcript); 
            } else {
                interimTranscript = transcript;
            }
        }

        resultText.innerText = finalTranscript + interimTranscript;
    };

    // === Tangani Error ===
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        statusMessage.innerText = `⚠️ Error: ${event.error}`;
        stopRecordingCleanup();
    };

    // === Recognition Berhenti (Fix Stabilitas) ===
    recognition.onend = () => {
        console.log('Recognition ended.');
        if (isRecording) {
            // Restart otomatis jika user belum klik Stop
            setTimeout(() => {
                try {
                    recognition.start();
                    console.log('Recognition restarted...');
                } catch (e) {
                    console.error('Restart error:', e);
                    stopRecordingCleanup();
                }
            }, 400);
        } else {
            // Jika berakhir karena user klik stop
            stopRecordingCleanup();
            statusMessage.innerText = '✅ Perekaman selesai.';
        }
    };
} else {
    alert('Browser tidak mendukung Speech Recognition. Gunakan Chrome di HTTPS/localhost.');
    recordButton.disabled = true;
    stopButton.disabled = true;
}

// --- REGEX UNTUK KATEGORI (Ditambahkan flag 'g' untuk pencarian global) ---
const kognitifRegex = /\b(analisis|menghitung|konsep|memahami|menjawab|logika|pengetahuan)\b/ig;
const afektifRegex = /\b(disiplin|kerjasama|tanggung jawab|tanggungjawab|sopan|inisiatif|toleransi|sikap)\b/ig;
const psikomotorikRegex = /\b(praktik|menyusun|gerakan|melakukan|membuat|keterampilan|fisik|demonstrasi)\b/ig;


// --- FUNGSI BANTUAN UNTUK MENAMBAHKAN KOMENTAR (BARU) ---
function appendComment(listElement, commentsArray) {
    if (commentsArray.length === 0) return;
    
    // 1. Cek dan Hapus Placeholder ('Belum ada komentar')
    if (listElement.innerHTML.includes('Belum ada')) {
        listElement.innerHTML = '';
    }
    
    // 2. Tambahkan setiap kata kunci yang terdeteksi
    commentsArray.forEach(keyword => {
        // Hanya tambahkan kata kunci yang belum ada di list untuk menghindari duplikasi
        const itemHtml = `<li>Kata Kunci: <b>${keyword}</b></li>`;
        if (!listElement.innerHTML.includes(keyword)) {
             listElement.innerHTML += itemHtml;
        }
    });
}


// --- KLASIFIKASI BARU: MENGAMBIL KATA KUNCI SAJA ---
function processTranscript(text) {
    const lowerText = text.toLowerCase();
    
    let kognitifKeywords = [];
    let afektifKeywords = [];
    let psikomotorikKeywords = [];
    
    let match;

    // A. EKSTRAKSI KATA KUNCI KOGNITIF (menggunakan exec() dengan flag 'g')
    while ((match = kognitifRegex.exec(lowerText)) !== null) {
        kognitifKeywords.push(match[0]);
    }

    // B. EKSTRAKSI KATA KUNCI AFEKTIF
    while ((match = afektifRegex.exec(lowerText)) !== null) {
        afektifKeywords.push(match[0]);
    }
    
    // C. EKSTRAKSI KATA KUNCI PSIKOMOTORIK
    while ((match = psikomotorikRegex.exec(lowerText)) !== null) {
        psikomotorikKeywords.push(match[0]);
    }
    
    // D. UPDATE DASHBOARD
    appendComment(kognitifList, kognitifKeywords);
    appendComment(afektifList, afektifKeywords);
    appendComment(psikomotorikList, psikomotorikKeywords);
    
    // Logika jika tidak ada kata kunci sama sekali (opsional)
    if (kognitifKeywords.length === 0 && afektifKeywords.length === 0 && psikomotorikKeywords.length === 0) {
        console.log(`[NON-KLASIFIKASI] Kalimat tidak mengandung kata kunci K-A-P: "${text}"`);
    }
}

// --- EVENT TOMBOL ---
recordButton.addEventListener('click', () => {
    if (!recognition) return;
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(() => {
            clearDashboard();
            isRecording = true;
            recognition.start();
            statusMessage.innerText = '🎙️ Mulai merekam...';
        })
        .catch(() => {
            alert('Izin mikrofon ditolak. Aktifkan mikrofon untuk menggunakan fitur ini.');
        });
});

stopButton.addEventListener('click', () => {
    if (recognition && isRecording) {
        isRecording = false;
        recognition.stop();
    }
});

// --- EVENT BARU: SIMPAN & MUAT ---
saveButton.addEventListener('click', saveDataToLocalStorage);
loadButton.addEventListener('click', loadDataFromLocalStorage);