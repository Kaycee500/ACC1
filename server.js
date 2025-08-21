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
const SYSTEM_PROMPT = `You are **Dad's Excel Tutor**, a calm, patient teacher for a 70-year-old visual and interactive learner who is new to Excel.
**Language:** English only.
**Platform:** Windows 10/11 only.
**Teaching style:**

1. Use short sentences and **numbered** steps.
2. Always reference **exact** menu names, buttons, and keystrokes.
3. Include **micro-exercises** after teaching a concept.
4. Offer a **3-question quiz** (2 multiple-choice + 1 short action task).
5. Provide clear **on-screen cues** (e.g., "Look for the **Home** tab on the top Ribbon").
6. **Never approximate numbers** unless the user explicitly requests an approximation.
7. If uncertain, say so and propose a safe check or alternative.
8. Always tailor pace and complexity based on the learner's performance and feedback.
   **Excel level:** true beginner.
   **Improvement loop:** When the user struggles or asks for more, (a) simplify and repeat, (b) show a small example with **exact** values, (c) add a follow-up practice file, and (d) propose a revised mini-syllabus for the next steps.`;

// Lesson seed prompts (from section 8 of requirements)
const LESSONS = {
  orientation: {
    title: 'Orientation',
    summary: 'Workbook vs. worksheet; rows/columns/cells; the Ribbon; saving a file.',
    seed: 'Teach the very first Excel lesson on Windows. Explain workbook, worksheet, rows, columns, cells, the Ribbon, and saving a file. Include a 5-step hands-on practice and a 3-question quiz.'
  },
  navigation: {
    title: 'Navigation & Entry',
    summary: 'Moving with arrow keys, selecting cells, typing text/numbers, and saving with a clear file name.',
    seed: 'Teach moving with arrow keys, selecting cells, typing text/numbers, and saving with a clear file name. Include a tiny practice table and a 3-question quiz.'
  },
  formatting: {
    title: 'Formatting Basics',
    summary: 'Bold, borders, column width, row height, and number formats.',
    seed: 'Teach bold, borders, column width, row height, and number formats. Include an exact mini-table and a 3-question quiz.'
  },
  formulas1: {
    title: 'Formulas 1',
    summary: '=SUM and =AVERAGE with exact keystrokes.',
    seed: 'Teach `=SUM` and `=AVERAGE` with exact keystrokes. Provide a tiny dataset, compute totals/averages, then a 3-question quiz.'
  },
  autofill: {
    title: 'Autofill & Copy',
    summary: 'Autofill handle, relative references, and safe copying of formulas.',
    seed: 'Teach Autofill handle, relative references, and safe copying of formulas. Include a small table and a 3-question quiz.'
  },
  sortfilter: {
    title: 'Sort & Filter',
    summary: 'Turn on Filter, sort A→Z, filter by value.',
    seed: 'Teach turning on Filter, sorting A→Z, and filtering by value. Include a small sample and a 3-question quiz.'
  },
  charts: {
    title: 'Intro Charts',
    summary: 'Insert a Column chart from a 2-column table.',
    seed: 'Teach inserting a Column chart from a 2-column table. Provide the sample data and a 3-question quiz.'
  },
  printing: {
    title: 'Printing',
    summary: 'Print Preview, orientation, margins, and \'Fit Sheet on One Page\'.',
    seed: 'Teach Print Preview, orientation, margins, and \'Fit Sheet on One Page\'. Include a 3-question quiz.'
  }
};

// Helper: build messages array with system and optional lesson seed
function buildMessages(inputMessages = [], lessonId, mode = 'normal') {
  const messages = [];
  messages.push({ role: 'system', content: SYSTEM_PROMPT });

  // Add orchestration seeds based on mode
  if (mode === 'remediate') {
    messages.push({ 
      role: 'user', 
      content: 'The learner struggled with the current topic and needs help. Provide an easier explanation, a tiny data example, and a new micro-exercise with exact steps.' 
    });
  } else if (mode === 'advance') {
    messages.push({ 
      role: 'user', 
      content: 'The learner mastered the current concept. Introduce the next concept in the syllabus map with one micro-exercise and then a short 3-question quiz.' 
    });
  }

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
    const { messages: clientMessages, lessonId, mode = 'normal' } = req.body || {};
    const messages = buildMessages(Array.isArray(clientMessages) ? clientMessages : [], lessonId, mode);

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'Server is missing OPENAI_API_KEY. Please add it to your Replit secrets.' });
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
    let reply = data?.choices?.[0]?.message?.content || 'I could not get a response just now. Please try again.';
    
    // Filter out "#" and "*" characters from AI responses
    reply = reply.replace(/[#*]/g, '');

    res.json({ reply });
  } catch (err) {
    console.error('Chat endpoint error:', err?.message || err);
    res.status(500).json({ error: 'Server error.' });
  }
});

app.listen(PORT, () => {
  // Print local URL for convenience
  console.log(`Dad\'s Microsoft Excel Tutor is running at http://localhost:${PORT}`);
});

// Optional: expose lessons metadata (no secrets)
app.get('/lessons.json', (req, res) => {
  res.json(Object.fromEntries(Object.entries(LESSONS).map(([k, v]) => [k, { title: v.title, summary: v.summary }])));
});

// Simple health endpoint
app.get('/health', (req, res) => {
  res.json({ ok: true });
});
