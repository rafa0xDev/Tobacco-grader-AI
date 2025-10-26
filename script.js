const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
// Dapatkan referensi tombol Simpan dan Muat yang baru
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

// --- FUNGSI BARU: SIMPAN DATA KE LOCAL STORAGE ---
function saveDataToLocalStorage() {
    const data = {
        timestamp: new Date().toLocaleString('id-ID'),
        fullTranscript: resultText.innerText,
        kognitif: kognitifList.innerHTML,
        afektif: afektifList.innerHTML,
        psikomotorik: psikomotorikList.innerHTML
    };
    
    try {
        // Menyimpan data sebagai string JSON
        localStorage.setItem('voiceGraderData', JSON.stringify(data));
        statusMessage.innerText = '✅ Data Penilaian berhasil disimpan!';
    } catch (e) {
        statusMessage.innerText = '⚠️ Gagal menyimpan data (localStorage penuh).';
        console.error("Local storage save error:", e);
    }
}

// --- FUNGSI BARU: MUAT DATA DARI LOCAL STORAGE ---
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

    // === Recognition Berhenti ===
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

// --- REGEX UNTUK KATEGORI ---
const kognitifRegex = /\b(analisis|menghitung|konsep|memahami|menjawab|logika|pengetahuan)\b/i;
const afektifRegex = /\b(disiplin|kerjasama|tanggung jawab|tanggungjawab|sopan|inisiatif|toleransi|sikap)\b/i;
const psikomotorikRegex = /\b(praktik|menyusun|gerakan|melakukan|membuat|keterampilan|fisik|demonstrasi)\b/i;

// --- KLASIFIKASI ---
function processTranscript(text) {
    const lowerText = text.toLowerCase();
    let classified = false;

    // Fungsi bantuan untuk menambahkan list item dan menghapus placeholder
    const appendComment = (listElement, commentText) => {
        if (listElement.innerHTML.includes('Belum ada')) {
            listElement.innerHTML = '';
        }
        listElement.innerHTML += `<li>${commentText}</li>`;
    };

    if (kognitifRegex.test(lowerText)) {
        appendComment(kognitifList, text);
        classified = true;
    }

    if (afektifRegex.test(lowerText)) {
        appendComment(afektifList, text);
        classified = true;
    }

    if (psikomotorikRegex.test(lowerText)) {
        appendComment(psikomotorikList, text);
        classified = true;
    }

    if (!classified) console.log(`Tidak terklasifikasi: "${text}"`);
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