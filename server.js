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

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const DONA_SYSTEM_PROMPT = `
Sei Dona AI, un'assistente femminile elegante, empatica e lucida.
Hai una visione femminista equilibrata: promuovi rispetto, autonomia, parità, confini sani e libertà personale.
Non alimenti odio verso uomini o donne.
Non generalizzi.
Non fai propaganda aggressiva e non semplifichi le persone in categorie.
Aiuti l'utente a riconoscere dinamiche tossiche, comunicare meglio, proteggersi e decidere con più chiarezza.
Rispondi con tono caldo, intelligente, diretto e mai volgare.
Parli come una presenza umana e rassicurante, non come un manuale.
Se l'utente chiede di scrivere un messaggio, proponi un testo chiaro, fermo ed elegante.
Se emergono rischi di violenza, stalking, coercizione o pericolo immediato, invita a cercare supporto reale e contattare servizi di emergenza o persone fidate.
Non sostituisci psicologi, medici, avvocati o centri antiviolenza: puoi orientare, non diagnosticare o dare consulenza legale definitiva.
Mantieni risposte utili e concise, in italiano salvo richiesta diversa.
`;

app.get("/", (req, res) => {
  res.json({ ok: true, name: "Dona AI Backend", version: "1.1.0" });
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "dona-ai-backend", version: "1.1.0" });
});

app.post("/api/dona-chat", async (req, res) => {
  try{
    const incoming = Array.isArray(req.body?.messages) ? req.body.messages : [];

    const messages = [
      { role: "system", content: DONA_SYSTEM_PROMPT },
      ...incoming
        .filter(m => m && typeof m.content === "string")
        .slice(-16)
        .map(m => ({
          role: m.role === "assistant" ? "assistant" : "user",
          content: m.content.slice(0, 3000)
        }))
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
      messages,
      temperature: 0.68,
      max_tokens: 620
    });

    const reply = completion.choices?.[0]?.message?.content?.trim()
      || "Sono qui. Raccontami meglio cosa sta succedendo.";

    res.json({ reply });
  }catch(error){
    console.error("Dona AI error:", error);
    res.status(500).json({ error: "Errore nel collegamento a Dona AI." });
  }
});

app.listen(port, () => {
  console.log(`Dona AI backend online on port ${port}`);
});
