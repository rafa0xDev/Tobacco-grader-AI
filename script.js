const recordButton = document.getElementById('recordButton');
const stopButton = document.getElementById('stopButton');
const statusMessage = document.getElementById('statusMessage');
const resultText = document.getElementById('resultText');

const kognitifList = document.getElementById('kognitif-list');
const afektifList = document.getElementById('afektif-list');
const psikomotorikList = document.getElementById('psikomotorik-list');

let recognition;
let finalTranscript = '';
let isRecording = false;

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

  if (kognitifRegex.test(lowerText)) {
    if (kognitifList.innerHTML.includes('Belum ada')) kognitifList.innerHTML = '';
    kognitifList.innerHTML += `<li>${text}</li>`;
    classified = true;
  }

  if (afektifRegex.test(lowerText)) {
    if (afektifList.innerHTML.includes('Belum ada')) afektifList.innerHTML = '';
    afektifList.innerHTML += `<li>${text}</li>`;
    classified = true;
  }

  if (psikomotorikRegex.test(lowerText)) {
    if (psikomotorikList.innerHTML.includes('Belum ada')) psikomotorikList.innerHTML = '';
    psikomotorikList.innerHTML += `<li>${text}</li>`;
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