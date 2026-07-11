// functions/voice.js — speech proxy. Primary: Butterbase gateway (openai/gpt-audio-mini,
// billed to app credits). Fallback: Groq (whisper STT / orpheus TTS). Last resort for
// TTS: {fallback:true} -> client uses browser speechSynthesis. Keys live HERE only.
//   POST {op:"stt", audio:"<base64>", mime:"audio/webm"} -> {text}
//   POST {op:"tts", text:"...", voice:"ballad"}          -> audio/wav bytes

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type, authorization"
};
function json(obj, status) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...CORS } });
}

// 24kHz mono 16-bit PCM -> WAV
function pcmToWav(pcm, sampleRate) {
  const header = new ArrayBuffer(44);
  const v = new DataView(header);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
  w(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); w(8, "WAVE");
  w(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, sampleRate, true); v.setUint32(28, sampleRate * 2, true);
  v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  w(36, "data"); v.setUint32(40, pcm.length, true);
  const out = new Uint8Array(44 + pcm.length);
  out.set(new Uint8Array(header), 0);
  out.set(pcm, 44);
  return out;
}

async function gatewaySTT(ctx, b64, mime) {
  const fmt = (mime || "").includes("wav") ? "wav" : "mp3";   // webm/opus usually decodes via mp3 path
  const res = await fetch(ctx.env.BUTTERBASE_API_URL + "/v1/" + ctx.env.BUTTERBASE_APP_ID + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + ctx.env.BUTTERBASE_API_KEY },
    body: JSON.stringify({
      model: "openai/gpt-audio-mini", max_tokens: 400,
      messages: [{ role: "user", content: [
        { type: "text", text: "Transcribe this audio exactly, as plain text. Output ONLY the transcription." },
        { type: "input_audio", input_audio: { data: b64, format: fmt } }
      ]}]
    })
  });
  if (!res.ok) throw new Error("gateway stt " + res.status);
  const data = await res.json();
  const text = (data.choices?.[0]?.message?.content || "").trim();
  if (!text) throw new Error("gateway stt empty");
  return text;
}

async function groqSTT(ctx, b64, mime) {
  const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  const form = new FormData();
  form.append("file", new Blob([bin], { type: mime || "audio/webm" }), "speech.webm");
  form.append("model", "whisper-large-v3-turbo");
  form.append("language", "en");
  const res = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
    method: "POST",
    headers: { authorization: "Bearer " + ctx.env.GROQ_API_KEY },
    body: form
  });
  if (!res.ok) throw new Error("groq stt " + res.status);
  return ((await res.json()).text || "").trim();
}

async function gatewayTTS(ctx, text, voice) {
  const res = await fetch(ctx.env.BUTTERBASE_API_URL + "/v1/" + ctx.env.BUTTERBASE_APP_ID + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + ctx.env.BUTTERBASE_API_KEY },
    body: JSON.stringify({
      model: "openai/gpt-audio-mini", max_tokens: 2000, stream: true,
      modalities: ["text", "audio"],
      audio: { voice: voice || "ballad", format: "pcm16" },
      messages: [{ role: "user", content: "Say exactly the following, sounding like " + (voice === "ballad" || !voice ? "an excited curious kid" : "a lively middle schooler") + ", natural pace, no additions: " + text.slice(0, 900) }]
    })
  });
  if (!res.ok) throw new Error("gateway tts " + res.status);
  const reader = res.body.getReader();
  const dec = new TextDecoder();
  let buf = "", audioB64 = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop();
    for (const line of lines) {
      if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
      try {
        const d = JSON.parse(line.slice(6)).choices?.[0]?.delta;
        if (d?.audio?.data) audioB64 += d.audio.data;
      } catch { /* partial */ }
    }
  }
  if (!audioB64) throw new Error("gateway tts no audio");
  return pcmToWav(Uint8Array.from(atob(audioB64), c => c.charCodeAt(0)), 24000);
}

async function groqTTS(ctx, text, voice) {
  const res = await fetch("https://api.groq.com/openai/v1/audio/speech", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + ctx.env.GROQ_API_KEY },
    body: JSON.stringify({
      model: "canopylabs/orpheus-v1-english",
      voice: voice && ["tara","leah","jess","leo","dan","mia","zac","zoe"].includes(voice) ? voice : "zac",
      input: text.slice(0, 1200),
      response_format: "wav"
    })
  });
  if (!res.ok) throw new Error("groq tts " + res.status);
  return new Uint8Array(await res.arrayBuffer());
}

export default async function handler(req, ctx) {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json();

    if (body.op === "stt") {
      if (!body.audio) return json({ error: "audio (base64) required" }, 400);
      try {
        return json({ text: await gatewaySTT(ctx, body.audio, body.mime) }, 200);
      } catch (e1) {
        console.warn("stt gateway failed:", e1.message);
        try {
          return json({ text: await groqSTT(ctx, body.audio, body.mime) }, 200);
        } catch (e2) {
          return json({ error: "stt failed: " + e2.message }, 502);
        }
      }
    }

    if (body.op === "tts") {
      if (!body.text) return json({ error: "text required" }, 400);
      let wav = null;
      try { wav = await gatewayTTS(ctx, body.text, body.voice); }
      catch (e1) {
        console.warn("tts gateway failed:", e1.message);
        try { wav = await groqTTS(ctx, body.text, body.voice); }
        catch (e2) { console.warn("tts groq failed:", e2.message); }
      }
      if (!wav) return json({ fallback: true }, 200);   // browser speechSynthesis
      return new Response(wav, { status: 200, headers: { "content-type": "audio/wav", ...CORS } });
    }

    return json({ error: "unknown op" }, 400);
  } catch (err) {
    return json({ error: String((err && err.message) || err) }, 500);
  }
}
