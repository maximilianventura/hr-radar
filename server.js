import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";
import axios from "axios";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

const promptIstruzioni = `Analizza le risposte riportate di seguito e valuta se sono sufficienti per elaborare un'analisi utile e coerente.

1. Una risposta e considerata inutilizzabile solo se:
- E priva di significato (es. "asdf", "xxx", "qwerty"),
- Contiene insulti, bestemmie o contenuti inappropriati,
- Fa riferimento a personaggi di fantasia scollegati dal contesto (es. "Batman", "Goku").

Nota:
- Non considerare errate le risposte con errori di ortografia, battitura o grammatica, se il significato è comunque comprensibile.
- Anche risposte brevi come "formazione", "permessi", "excel", "onboarding", "sì", "no", "non so", "boh" possono essere valide, in base al contesto della domanda.
- Se una risposta è poco articolata ma mostra un’intuizione rilevante, assegnale comunque un punteggio positivo (>=2).

2. Assegna un punteggio da 1 (molto debole) a 5 (molto avanzato) per ciascuna delle seguenti aree:
- Efficienza
- Tracciabilità
- Centralizzazione
- Automazione
- Strategia

3. Soglia di esclusione:
Se tutte e 5 le risposte sono inutilizzabili secondo il punto 1, restituisci:
{
  "errore": true,
  "messaggio": "Le risposte non sono sufficienti per elaborare un'analisi significativa. Ti invitiamo a rifare il test oppure fissare una call con i nostri esperti."
}

4. Altrimenti, restituisci un oggetto JSON valido con:
- "valutazioni": un punteggio da 1 a 5 per ciascuna area (coerenti con i criteri sopra);
- "testo": una breve analisi strutturata, che includa almeno questi quattro elementi, anche in forma compatta:
  - una sintesi generale dello stato di compliance,
  - un punto di forza osservato,
  - un’area che richiede miglioramento,
  - un suggerimento operativo o progettuale.

La stringa deve essere lineare, su una sola riga, facilmente leggibile e priva di interruzioni (\n).

5. Rispondi solo con un oggetto JSON ben formato, privo di testo aggiuntivo esterno. Esempio:

{
  "valutazioni": {
    "Efficienza operativa HR": 3,
    "Controllo e tracciabilità dei processi": 2,
    "Integrazione e centralizzazione dati": 4,
    "Automazione delle attività ripetitive": 3,
    "Supporto alle strategie HR": 5
  },
  "testo": "..."
}
`;

app.post("/chat", async (req, res) => {
  try {
    console.log("Dati ricevuti dal client:", req.body);

    const { domandeRisposte, email, r1, r2, r3, r4, r5 } = req.body;
    const promptFinale = `${promptIstruzioni}\n\nDomande e risposte:\n${domandeRisposte}`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: promptFinale }],
        temperature: 0.3,
        top_p: 1,
        frequency_penalty: 0,
        presence_penalty: 0,
        max_tokens: 800,
      }),
    });

    const data = await response.json();

    const zapierWebhookUrl = "https://hooks.zapier.com/hooks/catch/6421650/2vjiiz8/";

    const zapierData = {
      email: email || "",
      r1,
      r2,
      r3,
      r4,
      r5,
      domandeRisposte,
      analisi: data.choices[0].message.content,
    };

    await axios.post(zapierWebhookUrl, zapierData);

    res.json(data);
  } catch (err) {
    console.error("Errore proxy:", err);
    res.status(500).json({ error: "Errore nel proxy GPT" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server GPT proxy attivo sulla porta ${PORT}`));
