// ====================================================================================
// TOBACCO AI PLATFORM: VISUAL GRADER (Versi Fokus Kamera)
// ====================================================================================

const URL = "https://teachablemachine.withgoogle.com/models/dl4n5z5V-/"; // Ganti jika perlu
let model, webcam, labelContainer, maxPredictions;
let visualActive = true;

// Elemen UI
const statusMessage = document.getElementById('statusMessage');
const predictionText = document.getElementById('predictionText');
const descriptionText = document.getElementById('descriptionText');
const refreshButton = document.getElementById('refreshButton');

// ====================================================================================
// 1. Inisialisasi Visual Grader
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

    statusMessage.innerHTML = "✅ Kamera & Model Aktif. Memulai prediksi...";
    window.requestAnimationFrame(loop);

    setInterval(checkCameraStatus, 2000);
  } catch (err) {
    console.error("Error initVisualGrader:", err);
    statusMessage.innerHTML = `⚠️ Gagal memuat model atau kamera: ${err.message}`;
    visualActive = false;
  }
}

// ====================================================================================
// 2. Loop Kamera
// ====================================================================================
async function loop() {
  if (visualActive && webcam && webcam.canvas) {
    webcam.update();
    await predict();
    window.requestAnimationFrame(loop);
  } else {
    statusMessage.innerHTML = "⚠️ Kamera tidak aktif. Penilaian visual dihentikan.";
  }
}

// ====================================================================================
// 3. Prediksi
// ====================================================================================
async function predict() {
  const prediction = await model.predict(webcam.canvas);
  let highestProb = 0;
  let highestClass = "Membaca...";

  for (let i = 0; i < maxPredictions; i++) {
    const classPrediction =
      prediction[i].className + ": " + prediction[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
    if (prediction[i].probability > highestProb) {
      highestProb = prediction[i].probability;
      highestClass = prediction[i].className;
    }
  }

  if (highestProb > 0.6) {
    predictionText.innerHTML = highestClass;
    predictionText.style.color =
      highestClass.includes("Grade A") ? "#2ecc71" :
      highestClass.includes("Grade B") ? "#FFC300" :
      "#e74c3c";

    const features = analyzeImageFeatures(webcam.canvas);
    const desc = buildDescriptionFromFeatures(highestClass, highestProb, features);
    descriptionText.innerHTML = desc;
  } else {
    predictionText.innerHTML = "Fokuskan Daun (Di Bawah 60%)";
    predictionText.style.color = "#b0b0c0";
    descriptionText.innerHTML = "Model belum cukup yakin — perbaiki pencahayaan atau jarak kamera.";
  }
}

// ====================================================================================
// 4. Analisis Warna
// ====================================================================================
function analyzeImageFeatures(canvas) {
  const ctx = canvas.getContext('2d');
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  let r = 0, g = 0, b = 0, total = 0;

  for (let i = 0; i < data.length; i += 16) {
    r += data[i];
    g += data[i + 1];
    b += data[i + 2];
    total++;
  }

  const meanR = r / total;
  const meanG = g / total;
  const meanB = b / total;
  const greenRatio = meanG / ((meanR + meanB) / 2 + 1e-6);
  const yellowLikelihood = (meanR + meanG) / 2 - meanB;

  return { meanR, meanG, meanB, greenRatio, yellowLikelihood };
}

// ====================================================================================
// 5. Deskripsi Otomatis
// ====================================================================================
function buildDescriptionFromFeatures(highestClass, prob, f) {
  let base = "";
  if (highestClass.includes("Grade A")) {
    base = "Daun tembakau kualitas premium terdeteksi. Warna hijau segar, tekstur rata tanpa cacat.";
  } else if (highestClass.includes("Grade B")) {
    base = "Daun tembakau kualitas menengah. Warna mulai pudar dan tekstur agak tidak rata.";
  } else {
    base = "Daun tembakau kualitas rendah. Warna menguning dan menunjukkan bercak atau kerusakan.";
  }

  let cues = [];
  if (f.greenRatio > 1.3) cues.push("warna dominan hijau cerah");
  else if (f.yellowLikelihood > 30) cues.push("kecenderungan menguning");
  else cues.push("warna normal");

  const conf = Math.round(prob * 100);
  return `${base} (${conf}% keyakinan sistem). Catatan: ${cues.join(', ')}.`;
}

// ====================================================================================
// 6. Cek Kamera
// ====================================================================================
function checkCameraStatus() {
  try {
    const stream = webcam.webcam.srcObject;
    const tracks = stream ? stream.getVideoTracks() : [];
    const active = tracks.length > 0 && tracks[0].readyState === "live";

    if (!active && visualActive) {
      visualActive = false;
      statusMessage.innerHTML = "⚠️ Kamera tidak aktif. Penilaian visual dihentikan.";
    } else if (active && !visualActive) {
      visualActive = true;
      statusMessage.innerHTML = "✅ Kamera aktif kembali. Melanjutkan prediksi...";
      window.requestAnimationFrame(loop);
    }
  } catch (err) {
    visualActive = false;
  }
}

// ====================================================================================
// 7. Tombol Refresh Model
// ====================================================================================
refreshButton.addEventListener('click', () => {
  statusMessage.innerHTML = "🔄 Memuat ulang model...";
  initVisualGrader();
});

// ====================================================================================
// 8. Jalankan
// ====================================================================================
window.onload = initVisualGrader;
