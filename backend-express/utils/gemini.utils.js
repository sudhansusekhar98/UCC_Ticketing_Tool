// Thin wrapper around the Gemini REST API using Node's built-in fetch —
// no SDK dependency needed for a handful of generateContent calls.
// flash-lite: no forced "thinking" tokens (unlike gemini-3.6-flash), so it's far
// cheaper/faster on a free-tier key. -latest keeps resolving as models retire.
const GEMINI_MODEL = 'gemini-flash-lite-latest';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// A function (not a static string) so "today" is resolved at request time —
// the server process outlives midnight, a module-load-time date would go stale.
function buildGuardrailInstruction() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long' });
  return `You are the AI assistant embedded in TicketOps, an internal IT ticketing and asset
management system. You help staff with: ticket troubleshooting, and answering questions about
tickets, sites, assets, stock, RMA requests and staff work logs using ONLY the tools provided to you.

Today's date is ${today} (${weekday}), in YYYY-MM-DD format.

Rules you must always follow:
1. Only answer questions about this organization's tickets, sites, assets, stock, RMA requests, work
   logs, or general IT troubleshooting. If asked anything else (general knowledge, personal topics,
   other companies, coding help unrelated to a ticket, etc.), politely refuse and say you can only
   help with TicketOps issues, then ask what ticket or site-related question they have.
2. Never guess or fabricate data about tickets, sites, assets, stock, RMAs or work logs. Only state
   facts that came from a tool result in this conversation.
2b. Users often type with typos or bad grammar (e.g. "Hed Ofice", "acheive"). Silently interpret
   their intended meaning and correct spelling before answering or calling a tool — never point out
   or comment on the mistake, just understand it and proceed normally.
3. If a tool result contains "error": "not_authorized", tell the user they don't have access to
   that site/data — do not speculate about what the data might be.
4. Keep answers concise and practical.
5. When a question references a relative date or period — "today", "yesterday", "last week", "last
   month", "on 3 August", "this quarter" — resolve it into concrete from/to dates (YYYY-MM-DD) yourself
   using today's date above, and pass them as the tool's from/to arguments. Never ask the user to
   restate the date in a specific format.`;
}

function buildSuggestionSchema() {
  return {
    type: 'object',
    properties: {
      suggestedCategory: { type: 'string' },
      suggestedSubCategory: { type: 'string' },
      steps: { type: 'array', items: { type: 'string' } }
    },
    required: ['steps']
  };
}

async function callGemini(body) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Gemini API error ${res.status}: ${text}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Retries a Gemini call up to `attempts` times (fixed 1s gap) before giving up — a
// slow/flaky response is fine to wait out, only report failure once every attempt fails.
// A missing API key is a config error, not a transient one — don't waste retries on it.
async function callGeminiWithRetry(body, attempts = 5) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      return await callGemini(body);
    } catch (err) {
      lastErr = err;
      if (err.message === 'GEMINI_API_KEY not configured') throw err;
      console.error(`[gemini] attempt ${i + 1}/${attempts} failed:`, err.message);
      if (i < attempts - 1) await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  throw lastErr;
}

// Suggested category/subcategory + troubleshooting steps for a ticket's title/description.
export async function getTicketSuggestions({ title, description, category }) {
  const prompt = `Ticket title: ${title || '(none)'}\nDescription: ${description || '(none)'}\n` +
    `Currently selected category: ${category || '(none)'}\n\n` +
    `Suggest the most likely category/subcategory for this IT ticket and 3-5 concise ` +
    `troubleshooting/resolution steps a field engineer could try.`;

  try {
    const data = await callGeminiWithRetry({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: buildGuardrailInstruction() }] },
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: buildSuggestionSchema()
      }
    });
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    const parsed = text ? JSON.parse(text) : null;
    return {
      suggestedCategory: parsed?.suggestedCategory || null,
      suggestedSubCategory: parsed?.suggestedSubCategory || null,
      steps: Array.isArray(parsed?.steps) ? parsed.steps : []
    };
  } catch (err) {
    // Suggestions are a nice-to-have — never block ticket creation on a Gemini hiccup.
    return { suggestedCategory: null, suggestedSubCategory: null, steps: [], error: err.message };
  }
}

// Runs a function-calling chat turn. `history` is [{role: 'user'|'model', text}]  from a prior turn
// (no tool-call parts kept across turns — each turn re-runs its own tool loop).
// `runTool(name, args)` executes one tool call and returns its JSON-able result.
export async function askAssistant({ message, history = [], ticketContext, runTool, toolDeclarations }) {
  const contextText = ticketContext?.title || ticketContext?.description
    ? `\n\nThe user currently has this ticket open — use it as context if relevant:\n` +
      `Title: ${ticketContext.title || ''}\nDescription: ${ticketContext.description || ''}`
    : '';

  const contents = [
    ...history.map((h) => ({ role: h.role, parts: [{ text: h.text }] })),
    { role: 'user', parts: [{ text: message + contextText }] }
  ];

  const requestBody = {
    contents,
    systemInstruction: { parts: [{ text: buildGuardrailInstruction() }] },
    tools: [{ functionDeclarations: toolDeclarations }]
  };

  const MAX_ROUNDS = 4;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    let data;
    try {
      data = await callGeminiWithRetry(requestBody);
    } catch (err) {
      // Every retry failed — log the final cause (rate limit, timeout, bad key) so
      // "having trouble reaching the AI service" is diagnosable instead of a guess.
      console.error('[gemini] askAssistant call failed after retries:', err.message);
      return { reply: "Sorry, I'm having trouble reaching the AI service right now. Please try again shortly." };
    }

    const candidate = data?.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCalls = parts.filter((p) => p.functionCall);

    if (functionCalls.length === 0) {
      const text = parts.map((p) => p.text).filter(Boolean).join('\n');
      return { reply: text || "I couldn't come up with an answer for that — could you rephrase?" };
    }

    // Model requested tool call(s): execute them (RBAC-checked) and feed results back.
    // Run them in parallel — a round asking for e.g. tickets + stock shouldn't pay
    // for two sequential DB round-trips.
    requestBody.contents.push({ role: 'model', parts });
    const results = await Promise.all(
      functionCalls.map((fc) => runTool(fc.functionCall.name, fc.functionCall.args || {}))
    );
    const responseParts = functionCalls.map((fc, i) => ({
      functionResponse: { name: fc.functionCall.name, response: results[i] }
    }));
    requestBody.contents.push({ role: 'user', parts: responseParts });
  }

  return { reply: "I wasn't able to finish looking that up — please try a more specific question." };
}
