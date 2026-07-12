// src/lib/voice.js — speech I/O service (Groq via our proxy; browser fallback for TTS).
// All audio flows through /fn/voice; the Groq key never reaches the client.

const API_BASE = "https://api.butterbase.ai/v1/app_c3jiru08r6vi";

export async function speechToText(blob) {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  const res = await fetch(`${API_BASE}/fn/voice`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ op: "stt", audio: btoa(bin), mime: blob.type || "audio/webm" })
  });
  const data = await res.json();
  if (!res.ok || data.error) throw new Error(data.error || "transcription failed");
  return data.text;
}

// Speaks text. Resolves when playback ends. Gateway TTS when available,
// otherwise browser speechSynthesis — the call never goes silent.
// onStart fires the moment audio actually begins (synthesis can take a
// second or two) so the UI can reveal the text in sync with the voice.
let currentAudio = null;   // gateway audio must be stoppable too, not just speechSynthesis

export async function speak(text, { voice = "zac", rate = 1.05, onStart } = {}) {
  let started = false;
  const fireStart = () => { if (!started) { started = true; try { onStart?.(); } catch { /* ui only */ } } };
  try {
    const res = await fetch(`${API_BASE}/fn/voice`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ op: "tts", text, voice })
    });
    const type = res.headers.get("content-type") || "";
    if (res.ok && type.startsWith("audio/")) {
      const url = URL.createObjectURL(await res.blob());
      await new Promise((resolve, reject) => {
        const a = new Audio(url);
        currentAudio = a;
        a.onplaying = fireStart;
        a.onended = resolve;
        a.onerror = reject;
        a.onpause = resolve;   // stopSpeaking() pauses -> resolve, don't hang
        a.play().catch(reject);
      });
      if (currentAudio) currentAudio = null;
      URL.revokeObjectURL(url);
      fireStart();   // safety: never leave the text hidden
      return "groq";
    }
  } catch (err) {
    console.warn("[milo] gateway tts unavailable:", err.message);
  }
  // Fallback: browser voice.
  await new Promise(resolve => {
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 1.15;
    const voices = speechSynthesis.getVoices();
    u.voice = voices.find(v => /en[-_]US/i.test(v.lang) && /male|boy|fred|alex|daniel/i.test(v.name))
      || voices.find(v => /en/i.test(v.lang)) || null;
    u.onstart = fireStart;
    u.onend = resolve;
    u.onerror = resolve;
    speechSynthesis.speak(u);
  });
  fireStart();
  return "browser";
}

export function stopSpeaking() {
  try { speechSynthesis.cancel(); } catch { /* noop */ }
  try { if (currentAudio) { currentAudio.pause(); currentAudio = null; } } catch { /* noop */ }
}

// Demo-mode helpers: synthesize ahead of time (cached), play on cue. Keeping
// synthesis separate from playback lets the guided demo run without gaps.
// The cache stores PROMISES so duplicate calls (StrictMode double-effects,
// retakes) share one in-flight request — the voice fn wedges on concurrency.
const synthCache = new Map();
export function synthesizeSpeech(text, { voice = "ash" } = {}) {
  const key = voice + "|" + text;
  if (synthCache.has(key)) return synthCache.get(key);
  const p = (async () => {
    try {
      const res = await fetch(`${API_BASE}/fn/voice`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ op: "tts", text, voice })
      });
      const type = res.headers.get("content-type") || "";
      if (res.ok && type.startsWith("audio/")) {
        return URL.createObjectURL(await res.blob());
      }
    } catch (err) {
      console.warn("[demo] tts synth failed:", err.message);
    }
    return null;
  })();
  synthCache.set(key, p);
  p.then(v => { if (v === null) synthCache.delete(key); });   // failed lines retry next run
  return p;
}

export function playAudioUrl(url) {
  return new Promise((resolve, reject) => {
    const a = new Audio(url);
    a.onended = resolve;
    a.onerror = reject;
    a.play().catch(reject);
  });
}

// Push-to-talk recorder. start() then stop() -> Blob.
export function createRecorder() {
  let mediaRecorder = null;
  let chunks = [];
  let stream = null;
  return {
    async start() {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunks = [];
      mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      mediaRecorder.ondataavailable = e => e.data.size && chunks.push(e.data);
      mediaRecorder.start();
    },
    stop() {
      return new Promise(resolve => {
        if (!mediaRecorder || mediaRecorder.state === "inactive") return resolve(null);
        mediaRecorder.onstop = () => {
          stream?.getTracks().forEach(t => t.stop());
          resolve(new Blob(chunks, { type: "audio/webm" }));
        };
        mediaRecorder.stop();
      });
    }
  };
}
