import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "*")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback){
    if(!origin || allowedOrigins.includes("*") || allowedOrigins.includes(origin)){
      return callback(null, true);
    }
    return callback(new Error("CORS non consentito"));
  }
}));

app.use(express.json({ limit: "1mb" }));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

app.get("/", (req, res) => {
  res.json({ ok: true, name: "Do Ut Dona Backend", version: "1.7.0" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "do-ut-dona-backend", version: "1.7.0" });
});

app.post("/api/dona-chat", async (req, res) => {
  try{
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const messages = [
      { role: "system", content: DO_UT_DONA_SYSTEM_PROMPT },
      ...incoming.filter(m => m && typeof m.content === "string").slice(-16).map(m => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content.slice(0, 3500)
      }))
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages,
      temperature: 0.72,
      max_tokens: 760
    });

    const reply = completion.choices?.[0]?.message?.content?.trim()
      || "Rimaniamo nella domanda: raccontami il contesto, non solo il fatto.";

    res.json({ reply });
  }catch(error){
    console.error("Do Ut Dona chat error:", error);
    res.status(500).json({ error: "Errore nel collegamento a Do Ut Dona." });
  }
});

app.post("/api/dona-tts", async (req, res) => {
  try{
    const text = String(req.body?.text || "").trim().slice(0, 3500);
    if(!text) return res.status(400).json({ error: "Testo mancante." });

    const speech = await openai.audio.speech.create({
      model: process.env.OPENAI_TTS_MODEL || "gpt-4o-mini-tts",
      voice: process.env.OPENAI_TTS_VOICE || "shimmer",
      input: text,
      response_format: "mp3"
    });

    const audioBuffer = Buffer.from(await speech.arrayBuffer());
    res.json({ audio: "data:audio/mpeg;base64," + audioBuffer.toString("base64") });
  }catch(error){
    console.error("Do Ut Dona TTS error:", error);
    res.status(500).json({ error: "Errore nella generazione voce." });
  }
});

app.listen(port, () => {
  console.log(`Do Ut Dona backend V1.7 online on port ${port}`);
});
