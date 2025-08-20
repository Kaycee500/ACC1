import express from 'express';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Use Node 18+ global fetch
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '1mb' }));
app.use(express.static('public', { index: 'index.html' }));

// System Prompt used for every AI request
const SYSTEM_PROMPT = `You are “Dad’s Excel Tutor,” a calm, patient AI teacher for a 70-year-old accountant who is a visual learner and new to computers.
Language: English only.
Platform: Windows 10/11 only.
Style: Numbered, step-by-step instructions with short sentences and simple words. Avoid jargon unless you define it immediately.
Visual guidance: Describe what to look for on screen (e.g., “A green ‘Home’ tab at the top”).
Pacing: One concept at a time. Include a “Try it” micro-exercise when teaching. When the user finishes a mini-lesson, offer a 3-question quiz (2 multiple-choice + 1 short action task).
Excel level: Absolute beginner.
Clarity rules: Never approximate numbers. If uncertain, say so and propose a safe next step.
Safety: Never ask for or display API keys or private info.`;

// Lesson seed prompts
const LESSONS = {
  orientation: {
    title: 'Excel Orientation',
    summary: 'Workbooks vs. worksheets, rows, columns, cells, and the Ribbon.',
    seed: 'Teach the very first Excel lesson on Windows. Explain workbook, worksheet, rows, columns, cells, and the Ribbon. Include a 5-step hands-on practice and then a 3-question quiz.'
  },
  data: {
    title: 'Entering & Saving Data',
    summary: 'Type text and numbers, move around, and save a workbook.',
    seed: 'Teach how to enter text and numbers, move with arrow keys, and save a workbook on Windows. Include a small practice table and a 3-question quiz.'
  },
  formatting: {
    title: 'Formatting Basics',
    summary: 'Bold, borders, resize columns/rows, number formats.',
    seed: 'Teach bold text, borders, column width, row height, and number formats in Excel on Windows. Include a guided practice and a 3-question quiz.'
  },
  formulas: {
    title: 'Simple Formulas',
    summary: '=SUM and =AVERAGE with exact keystrokes.',
    seed: 'Teach =SUM and =AVERAGE with exact keystrokes for Windows. Provide a tiny data set, have me compute totals and averages, then a 3-question quiz.'
  },
  sortfilter: {
    title: 'Sort & Filter',
    summary: 'Turn on Filter, sort A→Z, filter by value.',
    seed: 'Teach how to enable Filter, sort A→Z, and filter by a value in Excel on Windows. Include a tiny sample table and a 3-question quiz.'
  },
  charts: {
    title: 'Intro to Charts',
    summary: 'Insert a column chart from a small table.',
    seed: 'Teach how to insert a simple column chart from a small table in Excel on Windows. Provide a practice table and a 3-question quiz.'
  },
  printing: {
    title: 'Printing Basics',
    summary: 'Print preview and fit to one page.',
    seed: 'Teach print preview, page orientation, margins, and fit to one page in Excel on Windows. Include a 3-question quiz.'
  }
};

// Helper: build messages array with system and optional lesson seed
function buildMessages(inputMessages = [], lessonId) {
  const messages = [];
  messages.push({ role: 'system', content: SYSTEM_PROMPT });

  if (lessonId && LESSONS[lessonId]) {
    messages.push({ role: 'user', content: LESSONS[lessonId].seed });
  }

  for (const m of inputMessages) {
    if (!m || !m.role || !m.content) continue;
  // Do not allow client to inject additional system messages
  if (m.role !== 'user' && m.role !== 'assistant') continue;
    // Enforce English-only and Windows framing in case client sends other context
    const safeContent = String(m.content);
    messages.push({ role: m.role, content: safeContent });
  }
  return messages;
}

// POST /chat: proxies to OpenAI Responses API
app.post('/chat', async (req, res) => {
  try {
    const { messages: clientMessages, lessonId } = req.body || {};
    const messages = buildMessages(Array.isArray(clientMessages) ? clientMessages : [], lessonId);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY.' });
    }

    // Model can be switched by changing this one line
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini'; // change to 'gpt-4o' if desired

    // Call OpenAI Chat Completions API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: messages.map(m => ({ role: m.role, content: String(m.content) })),
        temperature: 0.3
      })
    });

    if (!response.ok) {
      let detail = 'Upstream error';
      try {
        const j = await response.json();
        detail = j?.error?.message || j?.message || JSON.stringify(j);
      } catch {
        detail = await response.text().catch(() => 'Upstream error');
      }
      console.error('OpenAI Chat Completions error:', response.status, detail);
      return res.status(response.status).json({ error: detail || 'Upstream error' });
    }

    const data = await response.json();
    const reply = data?.choices?.[0]?.message?.content || 'I could not get a response just now. Please try again.';

    res.json({ reply });
  } catch (err) {
    console.error('Chat endpoint error:', err?.message || err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.listen(PORT, () => {
  // Print local URL for convenience
  console.log(`Dad\'s Excel Tutor is running at http://localhost:${PORT}`);
});

// Optional: expose lessons metadata (no secrets)
app.get('/lessons.json', (req, res) => {
  res.json(Object.fromEntries(Object.entries(LESSONS).map(([k, v]) => [k, { title: v.title, summary: v.summary }])));
});

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});
