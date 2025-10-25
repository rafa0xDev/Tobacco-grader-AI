const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const statusMessage = document.getElementById('statusMessage');
const resultText = document.getElementById('resultText');

// Area untuk menampilkan hasil kategorisasi
const kognitifResult = document.querySelector('#kognitif .result-content');
const afektifResult = document.querySelector('#afektif .result-content');
const psikomotorikResult = document.querySelector('#psikomotorik .result-content');


// --- KONFIGURASI SPEECH RECOGNITION ---

let recognition;

if (window.SpeechRecognition || window.webkitSpeechRecognition) {
    recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    
    // Konfigurasi Kunci untuk proyek VoiceGrader
    recognition.continuous = false; // Lebih baik false agar rekaman selesai setelah jeda panjang
    recognition.interimResults = true; 
    recognition.lang = 'id-ID'; // *** PENTING: Mengatur Bahasa Indonesia ***

    recognition.onstart = () => {
        recordButton.disabled = true;
        stopButton.disabled = false;
        statusMessage.innerText = "🎤 Sedang Mendengarkan...";
        resultText.innerText = ''; // Bersihkan hasil sebelumnya
        
        // Bersihkan kolom hasil
        kognitifResult.innerText = '';
        afektifResult.innerText = '';
        psikomotorikResult.innerText = '';
    };

    recognition.onresult = function (event) {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalTranscript += transcript + ' ';
            } else {
                interimTranscript += transcript;
            }
        }
        
        // Tampilkan hasil final dan sementara
        resultText.innerText = finalTranscript + interimTranscript;
        
        // Hanya proses kategorisasi jika ada hasil final
        if (finalTranscript) {
            processTranscript(finalTranscript);
        }
    };

    recognition.onerror = function (event) {
        console.error('Speech recognition error:', event.error);
        statusMessage.innerText = `Error: ${event.error}`;
        recordButton.disabled = false;
        stopButton.disabled = true;
    };

    recognition.onend = function () {
        statusMessage.innerText = "Siap mendengarkan";
        recordButton.disabled = false;
        stopButton.disabled = true;
    };
    
} else {
    statusMessage.innerText = "Speech recognition tidak didukung di browser ini.";
    recordButton.disabled = true;
    stopButton.disabled = true;
}


// --- FUNGSI KLASIFIKASI (TUGAS 5) ---

const keywordsKognitif = ['menghitung', 'analisis', 'logika', 'memahami', 'menjawab', 'konsep'];
const keywordsAfektif = ['disiplin', 'kerjasama', 'tanggung jawab', 'sopan', 'inisiatif', 'toleransi'];
const keywordsPsikomotorik = ['praktik', 'menyusun', 'gerakan', 'melakukan', 'membuat', 'ketrampilan'];


function processTranscript(text) {
    const lowerText = text.toLowerCase();
    
    let kognitifComments = [];
    let afektifComments = [];
    let psikomotorikComments = [];
    
    // Simulasi pengelompokan berdasarkan kata kunci
    
    if (keywordsKognitif.some(keyword => lowerText.includes(keyword))) {
        kognitifComments.push(text);
    }
    
    if (keywordsAfektif.some(keyword => lowerText.includes(keyword))) {
        afektifComments.push(text);
    }
    
    if (keywordsPsikomotorik.some(keyword => lowerText.includes(keyword))) {
        psikomotorikComments.push(text);
    }
    
    // Tampilkan di dashboard (simulasi)
    if (kognitifComments.length > 0) {
        kognitifResult.innerText += kognitifComments.join('\n') + '\n';
    } else {
         kognitifResult.innerText = '— Tidak ada komentar kognitif —';
    }
     if (afektifComments.length > 0) {
        afektifResult.innerText += afektifComments.join('\n') + '\n';
    } else {
        afektifResult.innerText = '— Tidak ada komentar afektif —';
    }
     if (psikomotorikComments.length > 0) {
        psikomotorikResult.innerText += psikomotorikComments.join('\n') + '\n';
    } else {
        psikomotorikResult.innerText = '— Tidak ada komentar psikomotorik —';
    }
}


// --- EVENT LISTENERS ---

recordButton.addEventListener('click', () => {
    if (recognition) {
        recognition.start();
    }
});

stopButton.addEventListener('click', () => {
    if (recognition) {
        recognition.stop();
    }
});