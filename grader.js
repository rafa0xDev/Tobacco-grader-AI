// ====================================================================================
// TOBACCO AI GRADER — grader.js
// ====================================================================================

const MODEL_URL = "https://teachablemachine.withgoogle.com/models/dl4n5z5V-/";

const GRADE_COLORS = { A: "#16a34a", B: "#f59e0b", C: "#dc2626" };
const GRADE_INFO = {
  A: { title: "Premium",  desc: "Daun tembakau mulus, warna merata, tekstur optimal untuk kualitas ekspor." },
  B: { title: "Menengah", desc: "Daun cukup baik dengan sedikit bercak atau warna kurang merata." },
  C: { title: "Rendah",   desc: "Daun memiliki kerusakan, noda, atau warna tidak konsisten." },
};

let model, webcam, maxPredictions;
let visualActive = false;
let lastGrade = null;
let counts = { A: 0, B: 0, C: 0 };

const $id = (id) => document.getElementById(id);

function nowTimestamp() {
  const d = new Date();
  const p = (n) => n.toString().padStart(2, "0");
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function addLog(msg) {
  const list = $id("logList");
  const first = list.firstElementChild;
  if (first && first.classList.contains("log-empty")) list.innerHTML = "";
  const li = document.createElement("li");
  li.className = "log-item";
  li.innerHTML = `<span class="log-time">${nowTimestamp()}</span><span class="log-msg">${msg}</span>`;
  list.prepend(li);
  while (list.children.length > 50) list.removeChild(list.lastChild);
}

function setStatus(fullMsg, shortLabel, isLive) {
  const msgEl   = $id("statusMessage");
  const shortEl = $id("statusShort");
  const dotEl   = $id("statusDot");
  if (msgEl)   msgEl.textContent   = fullMsg;
  if (shortEl) shortEl.textContent = shortLabel;
  if (dotEl)   dotEl.className     = "status-dot" + (isLive ? " live" : "");
}

function updatePrediction(grade, confidence, probs) {
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
    const pct     = total === 0 ? 0 : (counts[g] / total) * 100;
    const dist    = $id(`dist${g}`);
    const distPct = $id(`distPct${g}`);
    if (dist)    dist.style.width    = `${pct}%`;
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

function setRefreshSpinning(on) {
  const btn = $id("refreshButton");
  if (!btn) return;
  if (on) btn.classList.add("spinning");
  else    btn.classList.remove("spinning");
}

// ====================================================================================
// Camera stream helper
// gotRearCam = true  → draw langsung, no flip
// gotRearCam = false → flip ctx + flip CSS (front cam / desktop webcam)
// ====================================================================================
async function getCamera() {
  // 1. Coba kamera belakang exact (mobile)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { exact: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    addLog("Kamera belakang berhasil (exact environment).");
    return { stream, gotRearCam: true };
  } catch (_) { /* lanjut ke fallback */ }

  // 2. Coba ideal environment (desktop atau HP tertentu)
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: "environment" }, width: { ideal: 640 }, height: { ideal: 480 } },
      audio: false,
    });
    // Cek apakah benar-benar dapat rear cam
    const facing = stream.getVideoTracks()[0]?.getSettings?.()?.facingMode ?? "";
    const gotRear = facing === "environment";
    addLog(`Kamera fallback ideal: facingMode="${facing}" → ${gotRear ? "belakang" : "depan/unknown"}`);
    return { stream, gotRearCam: gotRear };
  } catch (_) { /* lanjut */ }

  // 3. Last resort — any camera
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  });
  addLog("Kamera any (last resort). Mungkin kamera depan.");
  return { stream, gotRearCam: false };
}

// ====================================================================================
// 1. INIT
// ====================================================================================
async function initVisualGrader() {
  setRefreshSpinning(true);
  setStatus("status: memuat model AI...", "Memuat", false);
  addLog("Memuat model Teachable Machine...");

  try {
    model = await tmImage.load(MODEL_URL + "model.json", MODEL_URL + "metadata.json");
    maxPredictions = model.getTotalClasses();
    addLog("Model berhasil dimuat.");
    setStatus("status: meminta akses kamera...", "Kamera", false);

    const { stream, gotRearCam } = await getCamera();

    // Hidden video
    const video = document.createElement("video");
    video.srcObject   = stream;
    video.autoplay    = true;
    video.playsInline = true;
    video.muted       = true;
    video.style.display = "none";
    document.body.appendChild(video);

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = () => video.play().then(resolve).catch(reject);
      video.onerror = () => reject(new Error("Video element error"));
      setTimeout(() => reject(new Error("Timeout menunggu kamera")), 10000);
    });

    // Canvas untuk TM predict
    const canvas = document.createElement("canvas");
    canvas.width  = 640;
    canvas.height = 480;
    const ctx = canvas.getContext("2d");

    webcam = {
      canvas,
      _video: video,
      _stream: stream,
      update() {
        if (gotRearCam) {
          // Kamera belakang: draw langsung, orientasi sudah benar
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        } else {
          // Kamera depan / desktop: flip horizontal supaya TIDAK mirror
          ctx.save();
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      },
      stop() {
        stream.getTracks().forEach((t) => t.stop());
        video.remove();
      },
    };

    // Tampilkan canvas di viewport
    const container  = $id("webcam-container");
    const placeholder = $id("camPlaceholder");
    if (placeholder) placeholder.style.display = "none";

    // CSS: rear cam → normal, front/desktop → flip balik via CSS
    // Kenapa flip CSS juga? Karena ctx flip hanya untuk TM (internal canvas).
    // Yang user lihat di layar adalah canvas elemen itu sendiri.
    // Kalau kita flip di ctx, user lihat hasil flip — yang udah benar (tidak mirror).
    // Jadi CSS TIDAK perlu transform tambahan — biarkan normal.
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;";
    container.appendChild(canvas);

    visualActive = true;
    setRefreshSpinning(false);
    setStatus("status: kamera aktif — model siap", "Live", true);
    addLog(`Prediksi berjalan. Mode: ${gotRearCam ? "kamera belakang" : "kamera depan/desktop"}`);

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

  let highestProb  = 0;
  let highestClass = "";
  for (let i = 0; i < maxPredictions; i++) {
    if (prediction[i].probability > highestProb) {
      highestProb  = prediction[i].probability;
      highestClass = prediction[i].className;
    }
  }

  const probs = { A: 0, B: 0, C: 0 };
  for (let i = 0; i < maxPredictions; i++) {
    const name  = prediction[i].className;
    const grade = name.includes("Grade A") ? "A" : name.includes("Grade B") ? "B" : "C";
    probs[grade] = Math.round(prediction[i].probability * 1000) / 10;
  }

  if (highestProb > 0.6) {
    const grade      = highestClass.includes("Grade A") ? "A" : highestClass.includes("Grade B") ? "B" : "C";
    const confidence = Math.round(highestProb * 1000) / 10;

    updatePrediction(grade, confidence, probs);
    updateDescription(grade, confidence);
    setStatus(`status: prediksi=${grade} conf=${confidence.toFixed(1)}% — aktif`, "Live", true);

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
    const stream = webcam?._stream;
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
  } catch (_) { visualActive = false; }
}

// ====================================================================================
// 5. REFRESH
// ====================================================================================
function handleRefresh() {
  addLog("Menyegarkan sesi...");
  visualActive = false;
  if (webcam) { webcam.stop?.(); webcam = null; }

  const container = $id("webcam-container");
  const oldCanvas = container.querySelector("canvas");
  if (oldCanvas) oldCanvas.remove();

  const placeholder = $id("camPlaceholder");
  if (placeholder) placeholder.style.display = "";

  lastGrade = null;
  counts    = { A: 0, B: 0, C: 0 };
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