const video = document.querySelector("#video");
const stage = document.querySelector("#video-stage");
const fileInput = document.querySelector("#file-input");
const chooseButton = document.querySelector("#choose-video-button");
const playButton = document.querySelector("#play-button");
const timeline = document.querySelector("#timeline");
const compareButton = document.querySelector("#compare-button");
const resetButton = document.querySelector("#reset-button");
const exportButton = document.querySelector("#export-button");
const exportNote = document.querySelector("#export-note");
const toast = document.querySelector("#toast");
const kernel = document.querySelector("#sharpen-kernel");
const settings = { sharpness: 35, clarity: 10, vibrance: 12, brightness: 50 };
let objectUrl = null;
let toastTimer = null;

const presets = {
  custom: { sharpness: 35, clarity: 10, vibrance: 12, brightness: 50 },
  crisp: { sharpness: 62, clarity: 27, vibrance: 18, brightness: 51 },
  vivid: { sharpness: 42, clarity: 19, vibrance: 42, brightness: 53 },
  soft: { sharpness: 14, clarity: 6, vibrance: 9, brightness: 52 },
};

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function updateSlider(slider) {
  const value = Number(slider.value);
  const name = slider.id;
  settings[name] = value;
  document.querySelector(`#${name}-value`).value = value;
  document.querySelector(`#${name}-value`).textContent = value;
  slider.style.setProperty("--progress", `${((value - Number(slider.min)) / (Number(slider.max) - Number(slider.min))) * 100}%`);
  applyAdjustments();
}

function applyAdjustments() {
  const strength = settings.sharpness / 100;
  kernel.setAttribute("kernelMatrix", `0 ${-strength} 0 ${-strength} ${1 + 4 * strength} ${-strength} 0 ${-strength} 0`);
  const contrast = 1 + settings.clarity / 125;
  const saturation = 1 + settings.vibrance / 100;
  const brightness = 0.5 + settings.brightness / 100;
  video.style.filter = `url(#sharpen) contrast(${contrast}) saturate(${saturation}) brightness(${brightness})`;
}

function choosePreset(name) {
  const values = presets[name];
  if (!values) return;
  for (const [key, value] of Object.entries(values)) {
    settings[key] = value;
    const slider = document.querySelector(`#${key}`);
    slider.value = value;
    document.querySelector(`#${key}-value`).value = value;
    document.querySelector(`#${key}-value`).textContent = value;
    slider.style.setProperty("--progress", `${value}%`);
  }
  document.querySelectorAll(".preset-card").forEach((button) => {
    const selected = button.dataset.preset === name;
    button.classList.toggle("selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  applyAdjustments();
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, "0");
  return `${minutes}:${remainder}`;
}

function getSupportedVideoMimeType() {
  if (typeof MediaRecorder === "undefined" || typeof MediaRecorder.isTypeSupported !== "function") return null;
  return ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type)) || null;
}

function loadVideo(file) {
  if (!file || !file.type.startsWith("video/")) {
    showToast("Choose a supported video file to get started.");
    return;
  }
  if (file.size > 500 * 1024 * 1024) {
    showToast("Choose a video smaller than 500 MB.");
    return;
  }
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  video.src = objectUrl;
  video.load();
  document.querySelector("#clip-name").textContent = file.name;
  document.querySelector("#clip-status").textContent = "READY";
  const canExport = typeof MediaRecorder !== "undefined" &&
    typeof HTMLCanvasElement.prototype.captureStream === "function" &&
    typeof video.captureStream === "function" &&
    Boolean(getSupportedVideoMimeType());
  exportNote.textContent = canExport
    ? "Export an enhanced WebM copy of your video."
    : "Video export is not supported in this browser.";
  stage.classList.add("has-video");
  [playButton, timeline, compareButton].forEach((control) => { control.disabled = false; });
  exportButton.disabled = !canExport;
  video.onloadedmetadata = () => {
    document.querySelector("#duration").textContent = formatTime(video.duration);
    document.querySelector("#resolution-label").textContent = `${video.videoWidth} × ${video.videoHeight}`;
  };
  video.onerror = () => {
    stage.classList.remove("has-video");
    [playButton, timeline, compareButton, exportButton].forEach((control) => { control.disabled = true; });
    document.querySelector("#clip-status").textContent = "UNSUPPORTED";
    showToast("This video could not be opened. Try an MP4 or WebM file.");
  };
}

function setOriginalPreview(isOriginal) {
  stage.classList.toggle("comparing", isOriginal);
  video.style.filter = isOriginal ? "none" : "";
}

chooseButton.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (event) => {
  loadVideo(event.target.files[0]);
  fileInput.value = "";
});

document.querySelectorAll(".adjustment-slider").forEach((slider) => {
  slider.style.setProperty("--progress", `${(Number(slider.value) / 100) * 100}%`);
  slider.addEventListener("input", () => {
    document.querySelectorAll(".preset-card").forEach((button) => {
      button.classList.toggle("selected", button.dataset.preset === "custom");
      button.setAttribute("aria-pressed", String(button.dataset.preset === "custom"));
    });
    updateSlider(slider);
  });
});

document.querySelectorAll(".preset-card").forEach((button) => {
  button.addEventListener("click", () => choosePreset(button.dataset.preset));
});

resetButton.addEventListener("click", () => choosePreset("custom"));

playButton.addEventListener("click", async () => {
  if (video.paused) {
    try {
      await video.play();
    } catch {
      showToast("Your browser couldn't play this video.");
    }
  } else {
    video.pause();
  }
});

video.addEventListener("play", () => {
  playButton.classList.add("is-playing");
  playButton.setAttribute("aria-label", "Pause video");
});
video.addEventListener("pause", () => {
  playButton.classList.remove("is-playing");
  playButton.setAttribute("aria-label", "Play video");
});
video.addEventListener("timeupdate", () => {
  if (!video.duration) return;
  const progress = (video.currentTime / video.duration) * 1000;
  timeline.value = progress;
  timeline.style.setProperty("--progress", `${(progress / 1000) * 100}%`);
  document.querySelector("#current-time").textContent = formatTime(video.currentTime);
});
timeline.addEventListener("input", () => {
  if (!video.duration) return;
  video.currentTime = (Number(timeline.value) / 1000) * video.duration;
});

compareButton.addEventListener("pointerdown", () => setOriginalPreview(true));
["pointerup", "pointerleave", "pointercancel", "blur"].forEach((eventName) => {
  compareButton.addEventListener(eventName, () => setOriginalPreview(false));
});
compareButton.addEventListener("keydown", (event) => {
  if (event.key === " " || event.key === "Enter") setOriginalPreview(true);
});
compareButton.addEventListener("keyup", () => setOriginalPreview(false));

document.querySelector("#fullscreen-button").addEventListener("click", async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await stage.requestFullscreen();
  } catch {
    showToast("Fullscreen is not available in this browser.");
  }
});

["dragenter", "dragover"].forEach((eventName) => {
  stage.addEventListener(eventName, (event) => {
    event.preventDefault();
    stage.classList.add("dragging");
  });
});
["dragleave", "drop"].forEach((eventName) => {
  stage.addEventListener(eventName, (event) => {
    event.preventDefault();
    stage.classList.remove("dragging");
  });
});
stage.addEventListener("drop", (event) => loadVideo(event.dataTransfer.files[0]));
document.addEventListener("dragover", (event) => event.preventDefault());
document.addEventListener("drop", (event) => event.preventDefault());

function createShader(gl, type, source) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("Could not initialize the video renderer.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error(message || "Could not compile the video renderer.");
  }
  return shader;
}

function createExportRenderer(width, height) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: false, antialias: false });
  if (!gl) throw new Error("WebGL is not available, so video export cannot start.");

  const vertexSource = `
    attribute vec2 position;
    varying vec2 uv;
    void main() {
      uv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec2 uv;
    uniform sampler2D frame;
    uniform vec2 texel;
    uniform float sharpness;
    uniform float clarity;
    uniform float vibrance;
    uniform float brightness;
    void main() {
      vec3 center = texture2D(frame, uv).rgb;
      vec3 neighbors =
        texture2D(frame, uv + vec2(texel.x, 0.0)).rgb +
        texture2D(frame, uv - vec2(texel.x, 0.0)).rgb +
        texture2D(frame, uv + vec2(0.0, texel.y)).rgb +
        texture2D(frame, uv - vec2(0.0, texel.y)).rgb;
      vec3 color = clamp(center * (1.0 + 4.0 * sharpness) - neighbors * sharpness, 0.0, 1.0);
      color = (color - 0.5) * (1.0 + clarity) + 0.5;
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luminance), color, vibrance);
      color *= brightness;
      gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
    }
  `;
  const program = gl.createProgram();
  if (!program) throw new Error("Could not initialize the video renderer.");
  const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const message = gl.getProgramInfoLog(program);
    gl.deleteProgram(program);
    throw new Error(message || "Could not link the video renderer.");
  }

  const buffer = gl.createBuffer();
  const texture = gl.createTexture();
  if (!buffer || !texture) throw new Error("Could not allocate video export resources.");
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.uniform1i(gl.getUniformLocation(program, "frame"), 0);
  gl.uniform2f(gl.getUniformLocation(program, "texel"), 1 / width, 1 / height);
  gl.uniform1f(gl.getUniformLocation(program, "sharpness"), settings.sharpness / 100);
  gl.uniform1f(gl.getUniformLocation(program, "clarity"), settings.clarity / 125);
  gl.uniform1f(gl.getUniformLocation(program, "vibrance"), 1 + settings.vibrance / 100);
  gl.uniform1f(gl.getUniformLocation(program, "brightness"), 0.5 + settings.brightness / 100);

  return {
    canvas,
    draw() {
      gl.viewport(0, 0, width, height);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, video);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    },
    dispose() {
      gl.deleteTexture(texture);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.getExtension("WEBGL_lose_context")?.loseContext();
    },
  };
}

async function exportEnhancedVideo() {
  let renderer;
  let recorder;
  let animationFrame;
  let outputStream;
  let sourceStream;
  let hasFailed = false;
  const originalTime = video.currentTime;
  const wasPlaying = !video.paused;
  const restoreExportButton = () => {
    exportButton.disabled = false;
    exportButton.innerHTML = '<svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M10 3v9m0 0 3.5-3.5M10 12 6.5 8.5M4 13v3.5h12V13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>Export video<span class="export-arrow">→</span>';
    exportNote.textContent = "Export an enhanced WebM copy of your video.";
  };

  if (exportButton.disabled) return;
  exportButton.disabled = true;
  exportButton.textContent = "Preparing export…";
  exportNote.textContent = "Preparing your enhanced copy.";

  try {
    if (!window.MediaRecorder || !HTMLCanvasElement.prototype.captureStream || !video.captureStream) {
      throw new Error("Video export is not supported by this browser. Try a recent version of Chrome or Edge.");
    }

    const scale = Math.min(1, 1920 / video.videoWidth, 1920 / video.videoHeight);
    const width = Math.max(2, Math.round(video.videoWidth * scale / 2) * 2);
    const height = Math.max(2, Math.round(video.videoHeight * scale / 2) * 2);
    renderer = createExportRenderer(width, height);
    outputStream = renderer.canvas.captureStream(30);
    sourceStream = video.captureStream();
    sourceStream.getAudioTracks().forEach((track) => outputStream.addTrack(track));

    const mimeType = getSupportedVideoMimeType();
    if (!mimeType) throw new Error("This browser does not support WebM video export.");

    const chunks = [];
    recorder = new MediaRecorder(outputStream, { mimeType });
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onerror = () => {
      hasFailed = true;
      showToast("Video export failed while recording. Please try again.");
      if (recorder.state !== "inactive") recorder.stop();
    };
    recorder.onstop = () => {
      cancelAnimationFrame(animationFrame);
      outputStream.getTracks().forEach((track) => track.stop());
      sourceStream.getTracks().forEach((track) => track.stop());
      renderer.dispose();
      video.pause();
      video.currentTime = originalTime;
      if (!hasFailed && chunks.length) {
        const downloadUrl = URL.createObjectURL(new Blob(chunks, { type: mimeType }));
        const link = document.createElement("a");
        const baseName = document.querySelector("#clip-name").textContent.replace(/\.[^.]+$/, "").replace(/[<>:"/\\|?*\x00-\x1f]/g, "_");
        link.href = downloadUrl;
        link.download = `${baseName || "video"}-enhanced.webm`;
        link.click();
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 30_000);
        showToast("Your enhanced video has been exported.");
      }
      if (wasPlaying) video.play().catch(() => {});
      restoreExportButton();
    };

    const renderFrame = () => {
      if (recorder.state === "recording") {
        renderer.draw();
        animationFrame = requestAnimationFrame(renderFrame);
      }
    };
    video.pause();
    video.currentTime = 0;
    await new Promise((resolve, reject) => {
      if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) resolve();
      else {
        video.addEventListener("seeked", resolve, { once: true });
        video.addEventListener("error", () => reject(new Error("Could not seek to the beginning of this video.")), { once: true });
      }
    });
    renderer.draw();
    recorder.start(1000);
    renderFrame();
    await video.play();
    video.addEventListener("ended", () => {
      if (recorder.state === "recording") recorder.stop();
    }, { once: true });
    exportButton.disabled = true;
    exportButton.textContent = "Exporting…";
    exportNote.textContent = "Keep this tab open while your video exports.";
    showToast("Export started. This may take as long as your video.");
  } catch (error) {
    if (recorder && recorder.state !== "inactive") {
      hasFailed = true;
      recorder.stop();
    }
    else {
      outputStream?.getTracks().forEach((track) => track.stop());
      sourceStream?.getTracks().forEach((track) => track.stop());
      renderer?.dispose();
      video.currentTime = originalTime;
      if (wasPlaying) video.play().catch(() => {});
      restoreExportButton();
    }
    showToast(error instanceof Error ? error.message : "Could not export this video.");
  }
}

exportButton.addEventListener("click", exportEnhancedVideo);

applyAdjustments();
