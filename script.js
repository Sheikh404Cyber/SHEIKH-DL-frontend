// ==================== CONFIG ====================
const BACKEND_URL = "https://sheikh-dl-backend.onrender.com";

// ==================== THEME TOGGLE ====================
const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");
const html = document.documentElement;

const savedTheme = localStorage.getItem("theme") || "dark";
html.setAttribute("data-theme", savedTheme);
updateThemeIcon(savedTheme);

themeToggle.addEventListener("click", () => {
  const current = html.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";
  html.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
  updateThemeIcon(next);
});

function updateThemeIcon(theme) {
  themeIcon.className = theme === "dark" ? "fas fa-moon" : "fas fa-sun";
}

// ==================== PARTICLES ====================
const particleContainer = document.getElementById("particles");
const colors = ["#00FFB2", "#7B2FFF", "#FF2F7B", "#1DA1F2", "#ffffff"];

function createParticle() {
  const p = document.createElement("div");
  p.classList.add("particle");
  const size = Math.random() * 4 + 1;
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const duration = Math.random() * 15 + 8;
  const delay = Math.random() * 5;
  p.style.cssText = `
    width: ${size}px;
    height: ${size}px;
    background: ${color};
    left: ${left}%;
    bottom: -10px;
    animation-duration: ${duration}s;
    animation-delay: ${delay}s;
    box-shadow: 0 0 ${size * 2}px ${color};
  `;
  particleContainer.appendChild(p);
  setTimeout(() => p.remove(), (duration + delay) * 1000);
}

setInterval(createParticle, 400);
for (let i = 0; i < 20; i++) createParticle();

// ==================== DOTS ANIMATION ====================
const dotsEl = document.querySelector(".dots");
if (dotsEl) {
  let dotCount = 0;
  setInterval(() => {
    dotCount = (dotCount + 1) % 4;
    dotsEl.textContent = ".".repeat(dotCount);
  }, 400);
}

// ==================== SCROLL ANIMATIONS ====================
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.animation = "fadeInUp 0.6s ease forwards";
        observer.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.querySelectorAll(".step-card").forEach((card) => {
  card.style.opacity = "0";
  observer.observe(card);
});

// ==================== HELPERS ====================
function showLoading(show) {
  document.getElementById("loading").style.display = show ? "flex" : "none";
}

function showVideoInfo(show) {
  document.getElementById("videoInfo").style.display = show ? "flex" : "none";
}

function showError(msg) {
  const box = document.getElementById("errorBox");
  const msgEl = document.getElementById("errorMsg");
  if (msg) {
    msgEl.textContent = msg;
    box.style.display = "flex";
  } else {
    box.style.display = "none";
  }
}

function resetAll() {
  showLoading(false);
  showVideoInfo(false);
  showError(null);
}

function formatDuration(seconds) {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// ==================== FETCH QUALITIES ====================
async function fetchQualities() {
  const url = document.getElementById("videoUrl").value.trim();

  if (!url) {
    showError("Please paste a video URL first!");
    return;
  }

  try {
    new URL(url);
  } catch {
    showError("Invalid URL! Please paste a valid video link.");
    return;
  }

  resetAll();
  showLoading(true);

  const fetchBtn = document.getElementById("fetchBtn");
  fetchBtn.disabled = true;
  fetchBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Analyzing...`;

  try {
    const response = await fetch(`${BACKEND_URL}/info`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      throw new Error(data.error || "Failed to fetch video info");
    }

    document.getElementById("videoTitle").textContent =
      data.title || "Unknown Title";
    document.getElementById("videoDuration").textContent = data.duration
      ? `⏱ ${formatDuration(data.duration)}`
      : "";

    const thumb = document.getElementById("videoThumb");
    if (data.thumbnail) {
      thumb.src = data.thumbnail;
      thumb.onerror = () => {
        thumb.src = "https://via.placeholder.com/200x120?text=No+Thumbnail";
      };
    }

    const select = document.getElementById("qualitySelect");
    select.innerHTML = "";

    if (data.formats && data.formats.length > 0) {
      data.formats.forEach((fmt) => {
        const option = document.createElement("option");
        option.value = fmt.format_id;
        option.textContent = fmt.label;
        select.appendChild(option);
      });
    } else {
      const option = document.createElement("option");
      option.value = "best";
      option.textContent = "Best Quality (Auto)";
      select.appendChild(option);
    }

    showLoading(false);
    showVideoInfo(true);
  } catch (err) {
    showLoading(false);
    showError(err.message || "Something went wrong. Please try again.");
  } finally {
    fetchBtn.disabled = false;
    fetchBtn.innerHTML = `<i class="fas fa-bolt"></i> Analyze`;
  }
}

// ==================== DOWNLOAD VIDEO ====================
async function downloadVideo() {
  const url = document.getElementById("videoUrl").value.trim();
  const formatId = document.getElementById("qualitySelect").value;
  const downloadBtn = document.querySelector(".download-btn");

  if (!url || !formatId) return;

  downloadBtn.disabled = true;
  downloadBtn.innerHTML = `
    <div class="loader-ring" style="width:20px;height:20px;border-width:2px;"></div>
    <span>Preparing Download...</span>
  `;

  try {
    const response = await fetch(`${BACKEND_URL}/download`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, format_id: formatId }),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Download failed");
    }

    const disposition = response.headers.get("Content-Disposition");
    let filename = "video.mp4";
    if (disposition) {
      const match = disposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/
      );
      if (match) filename = match[1].replace(/['"]/g, "");
    }

    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(blobUrl);

    downloadBtn.innerHTML = `<i class="fas fa-check"></i> <span>Downloaded!</span><div class="btn-shine"></div>`;
    downloadBtn.style.background =
      "linear-gradient(135deg, #00c853, #00e676)";

    setTimeout(() => {
      downloadBtn.disabled = false;
      downloadBtn.innerHTML = `<i class="fas fa-download"></i><span>Download Now</span><div class="btn-shine"></div>`;
      downloadBtn.style.background = "";
    }, 3000);
  } catch (err) {
    showError(err.message || "Download failed. Please try again.");
    downloadBtn.disabled = false;
    downloadBtn.innerHTML = `<i class="fas fa-download"></i><span>Download Now</span><div class="btn-shine"></div>`;
  }
}

// ==================== ENTER KEY ====================
document.getElementById("videoUrl").addEventListener("keypress", (e) => {
  if (e.key === "Enter") fetchQualities();
});

// ==================== PASTE AUTO FETCH ====================
document.getElementById("videoUrl").addEventListener("paste", () => {
  setTimeout(() => {
    const val = document.getElementById("videoUrl").value.trim();
    if (val.startsWith("http")) fetchQualities();
  }, 100);
});
