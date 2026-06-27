// ====================================================================================
// TOBACCO AI GRADER — grader.js
// Teachable Machine + kamera belakang + wired ke index.html baru
// ====================================================================================

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/dl4n5z5V-/";

const GRADE_COLORS = { A: "#16a34a", B: "#f59e0b", C: "#dc2626" };
const GRADE_INFO = {
  A: { title: "Premium",   desc: "Daun tembakau mulus, warna merata, tekstur optimal untuk kualitas ekspor." },
  B: { title: "Menengah",  desc: "Daun cukup baik dengan sedikit bercak atau warna kurang merata." },
  C: { title: "Rendah",    desc: "Daun memiliki kerusakan, noda, atau warna tidak konsisten." },
};

let model, webcam, maxPredictions;
let visualActive = false;
let lastGrade = null;
let counts = { A: 0, B: 0, C: 0 };

// ── UI refs ──────────────────────────────────────────────────────────────────
const $id = (id) => document.getElementById(id);

// ── Timestamp helper ─────────────────────────────────────────────────────────
function nowTimestamp() {
  const d = new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

// ── Log ──────────────────────────────────────────────────────────────────────
function addLog(msg) {
  const list = $id("logList");
  // Remove "Belum ada aktivitas" placeholder
  if (list.firstElementChild?.classList.contains("text-gray-400")) {
    list.innerHTML = "";
  }
  const li = document.createElement("li");
  li.className = "flex items-start gap-2 text-xs";
  li.innerHTML = `
    <span class="shrink-0 font-mono text-gray-400">${nowTimestamp()}</span>
    <span class="text-gray-600">${msg}</span>
  `;
  list.prepend(li);
  // Keep max 50
  while (list.children.length > 50) list.removeChild(list.lastChild);
}

// ── Status helpers ────────────────────────────────────────────────────────────
function setStatus(fullMsg, shortLabel, isLive) {
  const msgEl = $id("statusMessage");
  const shortEl = $id("statusShort");
  const dotEl = $id("statusDot");

  if (msgEl) msgEl.textContent = fullMsg;
  if (shortEl) shortEl.textContent = shortLabel;
  if (dotEl) {
    if (isLive) {
      dotEl.className = "h-2 w-2 rounded-full animate-pulse-dot bg-[#16a34a]";
    } else {
      dotEl.className = "h-2 w-2 rounded-full bg-gray-400";
    }
  }
}

// ── UI update helpers ─────────────────────────────────────────────────────────
function updatePrediction(grade, confidence, probs) {
  // Grade + confidence
  const predEl = $id("predictionText");
  const confEl = $id("confValue");

  if (grade) {
    predEl.textContent = grade;
    predEl.style.color = GRADE_COLORS[grade];
    confEl.textContent = `${confidence.toFixed(0)}%`;
    confEl.style.color = "#111827";
  } else {
    predEl.textContent = "—";
    predEl.style.color = "#9ca3af";
    confEl.textContent = "—";
    confEl.style.color = "#111827";
  }

  // Probability bars
  ["A", "B", "C"].forEach((g) => {
    const val = probs ? (probs[g] ?? 0) : 0;
    const bar = $id(`bar${g}`);
    const pct = $id(`pct${g}`);
    if (bar) bar.style.width = `${val}%`;
    if (pct) pct.textContent = `${val.toFixed(1)}%`;
  });
}

function updateCounts() {
  const total = counts.A + counts.B + counts.C;
  ["A", "B", "C"].forEach((g) => {
    const el = $id(`count${g}`);
    if (el) el.textContent = counts[g];

    // Distribution bar
    const pct = total === 0 ? 0 : (counts[g] / total) * 100;
    const dist = $id(`dist${g}`);
    const distPct = $id(`distPct${g}`);
    if (dist) dist.style.width = `${pct}%`;
    if (distPct) distPct.textContent = `${pct.toFixed(0)}%`;
  });
}

function updateDescription(grade, confidence) {
  const el = $id("descriptionText");
  if (!el) return;
  if (!grade) {
    el.textContent = "Arahkan daun tembakau ke kamera untuk memulai analisis kualitas secara otomatis.";
    return;
  }
  const info = GRADE_INFO[grade];
  el.textContent = `Terdeteksi daun dengan kualitas Grade ${grade} (${info.title}). ${info.desc} Keyakinan sistem: ${confidence.toFixed(1)}%.`;
}

// ── Refresh button spinner ────────────────────────────────────────────────────
function setRefreshSpinning(on) {
  const icon = $id("refreshIcon");
  if (!icon) return;
  if (on) icon.classList.add("spinning");
  else icon.classList.remove("spinning");
}

// ====================================================================================
// 1. INIT — kamera belakang via getUserMedia + Teachable Machine
// ====================================================================================
async function initVisualGrader() {
  setRefreshSpinning(true);
  setStatus("status: memuat model AI...", "Memuat", false);
  addLog("Memuat model Teachable Machine...");

  try {
    // Load model
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    maxPredictions = model.getTotalClasses();

    addLog("Model berhasil dimuat. Meminta akses kamera...");
    setStatus("status: meminta akses kamera...", "Kamera", false);

    // Request rear camera
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 320 }, height: { ideal: 240 } },
      audio: false,
    });

    // Build TM webcam but override with rear stream
    webcam = new tmImage.Webcam(320, 240, false); // flip=false for rear
    await webcam.setup();

    const internalVideo = webcam.webcam;
    internalVideo.srcObject.getTracks().forEach((t) => t.stop()); // stop default front cam
    internalVideo.srcObject = stream;
    await internalVideo.play();

    // Override canvas + update()
    webcam.canvas = document.createElement("canvas");
    webcam.canvas.width = 320;
    webcam.canvas.height = 240;
    webcam.ctx = webcam.canvas.getContext("2d");
    webcam.update = function () {
      this.ctx.drawImage(internalVideo, 0, 0, 320, 240);
    };

    // Attach canvas to DOM
    const container = $id("webcam-container");
    const placeholder = $id("camPlaceholder");
    if (placeholder) placeholder.style.display = "none";

    // Style canvas to fill container
    webcam.canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    container.appendChild(webcam.canvas);

    visualActive = true;
    setRefreshSpinning(false);
    setStatus("status: kamera aktif — model siap", "Live", true);
    addLog("Kamera berhasil diaktifkan. Prediksi berjalan.");

    window.requestAnimationFrame(loop);
    setInterval(checkCameraStatus, 3000);

  } catch (err) {
    console.error(err);
    setRefreshSpinning(false);
    setStatus(`status: error — ${err.message}`, "Error", false);
    addLog(`Gagal: ${err.message}`);
    visualActive = false;
  }
}

// ====================================================================================
// 2. LOOP
// ====================================================================================
async function loop() {
  if (!visualActive || !webcam) return;
  webcam.update();
  await predict();
  window.requestAnimationFrame(loop);
}

// ====================================================================================
// 3. PREDICT
// ====================================================================================
async function predict() {
  const prediction = await model.predict(webcam.canvas);

  let highestProb = 0;
  let highestClass = "";

  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].probability > highestProb) {
      highestProb = prediction[i].probability;
      highestClass = prediction[i].className;
    }
  }

  // Build probs object — map class name to A/B/C
  const probs = { A: 0, B: 0, C: 0 };
  for (let i = 0; i < maxPredictions; i++) {
    const name = prediction[i].className;
    const grade = name.includes("Grade A") ? "A" : name.includes("Grade B") ? "B" : "C";
    probs[grade] = Math.round(prediction[i].probability * 1000) / 10;
  }

  if (highestProb > 0.6) {
    const grade = highestClass.includes("Grade A") ? "A" : highestClass.includes("Grade B") ? "B" : "C";
    const confidence = Math.round(highestProb * 1000) / 10;

    updatePrediction(grade, confidence, probs);
    updateDescription(grade, confidence);
    setStatus(`status: prediksi=${grade} conf=${confidence.toFixed(1)}% — aktif`, "Live", true);

    // Count only on grade change
    if (lastGrade !== grade) {
      counts[grade]++;
      updateCounts();
      addLog(`Prediksi Grade ${grade} dengan keyakinan ${confidence.toFixed(1)}%.`);
      lastGrade = grade;
    }
  } else {
    updatePrediction(null, 0, probs);
    updateDescription(null, 0);
    setStatus("status: keyakinan rendah — fokuskan daun", "Live", true);
    lastGrade = null;
  }
}

// ====================================================================================
// 4. CAMERA HEALTH CHECK
// ====================================================================================
function checkCameraStatus() {
  try {
    const internalVideo = webcam?.webcam;
    const stream = internalVideo?.srcObject;
    const tracks = stream ? stream.getVideoTracks() : [];
    const active = tracks.length > 0 && tracks[0].readyState === "live";

    if (!active && visualActive) {
      visualActive = false;
      setStatus("status: kamera terputus", "Offline", false);
      addLog("Kamera terputus.");
    } else if (active && !visualActive) {
      visualActive = true;
      setStatus("status: kamera aktif kembali", "Live", true);
      addLog("Kamera tersambung kembali.");
      window.requestAnimationFrame(loop);
    }
  } catch (_) {
    visualActive = false;
  }
}

// ====================================================================================
// 5. REFRESH
// ====================================================================================
function handleRefresh() {
  addLog("Menyegarkan sesi...");
  visualActive = false;

  // Stop existing stream
  if (webcam?.webcam?.srcObject) {
    webcam.webcam.srcObject.getTracks().forEach((t) => t.stop());
  }

  // Remove old canvas
  const container = $id("webcam-container");
  const oldCanvas = container.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  // Show placeholder again
  const placeholder = $id("camPlaceholder");
  if (placeholder) placeholder.style.display = "";

  // Reset state
  lastGrade = null;
  counts = { A: 0, B: 0, C: 0 };
  updatePrediction(null, 0, { A: 0, B: 0, C: 0 });
  updateCounts();
  updateDescription(null, 0);

  setTimeout(() => initVisualGrader(), 400);
}

// ====================================================================================
// 6. BOOT
// ====================================================================================
window.addEventListener("DOMContentLoaded", () => {
  $id("refreshButton").addEventListener("click", handleRefresh);
  initVisualGrader();
});