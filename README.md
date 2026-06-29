# 🌿 Tobacco AI Grader

A real-time tobacco leaf quality grading dashboard that runs entirely in the browser. Point your camera at a tobacco leaf and the app instantly classifies it into **Grade A (Premium)**, **Grade B (Menengah)**, or **Grade C (Rendah)** using a machine learning model trained with Google Teachable Machine.

> Built for a school competition. No server, no build tools — just HTML, CSS, and JavaScript.

---

## Demo

🔗 **[Live Demo](https://rafa0xdev.github.io/Tobacco-grader-AI/)**

---

## Preview

| Grader Dashboard | Tentang |
|---|---|
| Camera + grade prediction, probability bars, session stats, log | App description and feature overview |

---

## Features

- **Live camera grading** — uses the rear camera (`facingMode: environment`) to scan leaves in real time
- **AI classification** — Teachable Machine model classifies into 3 grades with confidence score
- **Probability bars** — visual breakdown of Grade A / B / C probabilities per prediction
- **Session statistics** — tracks how many of each grade detected in the current session
- **Grade distribution** — segmented bar showing the A/B/C proportion across the session
- **Auto analysis** — generates a text description of the detected leaf quality
- **System log** — timestamped activity log of every prediction and camera event
- **Refresh** — restart the camera and model without reloading the page
- **Mobile friendly** — responsive layout, single column on mobile, two columns on desktop
- **No dependencies** — no npm, no build step, works on any static host

---

## Tech Stack

| Layer | Technology |
|---|---|
| UI | Plain HTML + CSS |
| Fonts | Inter, JetBrains Mono (Google Fonts) |
| ML Model | [Google Teachable Machine](https://teachablemachine.withgoogle.com/) |
| ML Runtime | TensorFlow.js + `@teachablemachine/image` (CDN) |
| Camera | `navigator.mediaDevices.getUserMedia` |
| Hosting | GitHub Pages |

---

## Project Structure

```
/
├── index.html       # App shell and all UI markup
├── style.css        # All styles
├── grader.js        # Camera init, TM model, prediction loop, UI updates
└── DESIGN.md        # Design system reference (colors, typography, layout)
```

---

## How It Works

1. On load, `grader.js` fetches the Teachable Machine model from the hosted URL
2. `getUserMedia` requests the rear camera with `facingMode: { ideal: "environment" }`
3. The camera stream is piped into a `<canvas>` element that TF.js reads each frame
4. Every frame, the model outputs a probability for each grade class
5. If confidence exceeds 60%, the top grade is displayed and the UI updates
6. Session counters increment only when the grade *changes* (not every frame) to avoid flooding stats

---

## Dataset

The model was trained on images of tobacco leaves sourced from the internet, manually sorted into three folders using a Python script:

```
dataset/
├── grade_a/    # Clean, uniform color, no damage
├── grade_b/    # Minor spots or uneven color
└── grade_c/    # Yellowing, damage, or inconsistent appearance
```

Model training was done via the [Teachable Machine image project](https://teachablemachine.withgoogle.com/train/image).

---

## Local Development

No build tools needed. Just open the file directly:

```bash
# Clone the repo
git clone https://github.com/rafa0xDev/Tobacco-grader-AI.git
cd Tobacco-grader-AI

# Open in browser (camera requires a local server or HTTPS)
npx serve .
# or
python -m http.server 8000
```

> ⚠️ Camera access requires either `localhost` or an HTTPS connection. Opening `index.html` directly as a `file://` URL will not work.

---

## Grade Reference

| Grade | Label | Description |
|---|---|---|
| **A** | Premium | Smooth leaf, uniform color, optimal texture for export quality |
| **B** | Menengah | Decent leaf with minor spots or slightly uneven color |
| **C** | Rendah | Visible damage, staining, or inconsistent appearance |

---

## Author

**Moch Rafa Alief Rohan**
Class 11 · SMAN 1 Kudus · TIK Extracurricular
GitHub: [@rafa0xDev](https://github.com/rafa0xDev)
