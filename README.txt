DO UT DONA BACKEND V1.7.2

Questo pacchetto corregge l'errore Render/OpenAI:
ERR_STREAM_PREMATURE_CLOSE / Gunzip premature close

ISTRUZIONI:
1. Apri GitHub repo: dona-ai-backend
2. Sostituisci server.js con questo server.js
3. Sostituisci package.json con questo package.json
4. Commit changes
5. Render farà Auto-Deploy

Su Render lascia queste variabili:
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4.1-mini
ALLOWED_ORIGINS=*
OPENAI_TTS_MODEL=gpt-4o-mini-tts
OPENAI_TTS_VOICE=shimmer

Dopo il deploy apri:
https://dona-ai-backend-t4hn.onrender.com/health

Deve uscire version: 1.7.2
