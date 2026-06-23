import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Do Ut Dona Backend V1.7.2
// Fix principale: niente OpenAI SDK / node-fetch.
// Usiamo fetch nativo di Node 18+ e chiediamo risposta non compressa
// per evitare ERR_STREAM_PREMATURE_CLOSE / Gunzip premature close su Render.

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const VERSION = "1.7.2";

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("CORS non consentito"));
  },
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(express.json({ limit: "1mb" }));

const DO_UT_DONA_SYSTEM_PROMPT = `
IDENTITÀ
Sei Do Ut Dona, una piattaforma conversazionale di intelligenza artificiale nata dal pensiero della differenza femminile.
Sei una voce culturalmente fondata, femminoantropocentrica: rimetti al centro l'essere umano attraverso la prospettiva femminile come punto di osservazione dichiarato.

NOME E SIGNIFICATO
Do Ut Dona nasce dalla trasformazione di "do ut des" in "do ut dona": do perché tu doni.
Non ragioni secondo una logica transazionale, ma generativa, circolare, relazionale.

POSIZIONE CULTURALE
Non sei neutrale in senso astratto: hai una prospettiva dichiarata.
Non pensi "delle femmine" dall'esterno: provi a pensare dentro una logica femminile riconosciuta.
Usi "femmine" come scelta culturale consapevole quando il contesto riguarda il progetto e il pensiero della differenza; se l'utente preferisce altro, rispetti il suo linguaggio.

PRINCIPI DI PENSIERO
- Pensiero relazionale: il problema non esiste isolato ma in una rete viva di connessioni e contesti.
- Cura come categoria conoscitiva: la cura non è solo emozione, è modo di produrre sapere.
- Tolleranza dell'ambiguità: sai stare nel non ancora risolto senza chiudere prematuramente.
- Pensiero circolare: puoi tornare su una questione e arricchirla, non solo procedere in linea retta.
- Attenzione al contesto: la regola astratta cede il passo alla situazione concreta.
- Memoria della relazione: non accumuli dati, ma tieni il senso del percorso conversazionale.

STILE
Rispondi in italiano, con tono profondo ma comprensibile, caldo ma non sdolcinato, fermo ma non aggressivo.
Non devi sempre dare subito "la soluzione": spesso devi aprire una domanda migliore.
Evita slogan, moralismi e odio verso uomini o donne.
Non generalizzare gruppi umani.
Non sostituire psicologi, medici, avvocati, centri antiviolenza o servizi di emergenza.
Se emergono pericolo, violenza, stalking, coercizione o urgenza, invita a cercare aiuto reale e immediato.
`;

function getOpenAIKey() {
  return String(process.env.OPENAI_API_KEY || "").trim();
}

function openAIHeaders() {
  return {
    "Authorization": `Bearer ${getOpenAIKey()}`,
    "Content-Type": "application/json",
    "Accept": "application/json",
    // Importante su Render: evita decompressione gzip difettosa / premature close.
    "Accept-Encoding": "identity"
  };
}

app.get("/", (req, res) => {
  res.json({
    ok: true,
    name: "Do Ut Dona Backend",
    version: VERSION
  });
});

app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "do-ut-dona-backend",
    version: VERSION,
    openai_configured: Boolean(getOpenAIKey()),
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini"
  });
});

app.post("/api/dona-chat", async (req, res) => {
  try {
    if (!getOpenAIKey()) {
      return res.status(500).json({
        error: "OPENAI_API_KEY mancante su Render."
      });
    }

    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const messages = [
      { role: "system", content: DO_UT_DONA_SYSTEM_PROMPT },
      ...incoming
        .filter((m) => m && typeof m.content === "string")
        .slice(-16)
        .map((m) => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content.slice(0, 3500)
        }))
    ];

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: openAIHeaders(),
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
        messages,
        temperature: 0.72,
        max_tokens: 760
      })
    });

    const raw = await response.text();

    if (!response.ok) {
      console.error("OpenAI chat HTTP error:", response.status, raw);
      let detail = raw;
      try {
        detail = JSON.parse(raw)?.error?.message || raw;
      } catch {}
      return res.status(response.status).json({
        error: "Errore OpenAI nella chat.",
        detail
      });
    }

    let data;
    try {
      data = JSON.parse(raw);
    } catch (parseError) {
      console.error("OpenAI chat JSON parse error:", parseError, raw.slice(0, 500));
      return res.status(502).json({
        error: "Risposta OpenAI non leggibile.",
        detail: "JSON non valido dalla risposta OpenAI."
      });
    }

    const reply = data.choices?.[0]?.message?.content?.trim()
      || "Rimaniamo nella domanda: raccontami il contesto, non solo il fatto.";

    res.json({ reply });
  } catch (error) {
    console.error("Do Ut Dona chat error:", error);
    res.status(500).json({
      error: "Errore nel collegamento a Do Ut Dona.",
      detail: error?.message || String(error)
    });
  }
});

app.post("/api/dona-tts", async (req, res) => {
  try {
    if (!getOpenAIKey()) {
      return res.status(500).json({
        error: "OPENAI_API_KEY mancante su Render."
      });
    }

    const text = String(req.body?.text || "").trim().slice(0, 3500);
    if (!text) {
      return res.status(400).json({ error: "Testo mancante." });
    }

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        ...openAIHeaders(),
        "Accept": "audio/mpeg"
      },
      body: JSON.stringify({
        model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
        voice: process.env.OPENAI_TTS_VOICE || "shimmer",
        input: text,
        response_format: "mp3"
      })
    });

    if (!response.ok) {
      const raw = await response.text();
      console.error("OpenAI TTS HTTP error:", response.status, raw);
      return res.status(response.status).json({
        error: "Errore nella generazione voce.",
        detail: raw
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = Buffer.from(arrayBuffer);

    res.json({
      audio: "data:audio/mpeg;base64," + audioBuffer.toString("base64")
    });
  } catch (error) {
    console.error("Do Ut Dona TTS error:", error);
    res.status(500).json({
      error: "Errore nella generazione voce.",
      detail: error?.message || String(error)
    });
  }
});

app.listen(port, () => {
  console.log(`Do Ut Dona backend V${VERSION} online on port ${port}`);
});
