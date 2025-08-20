// Dad's Excel Tutor client script
// Requirements covered:
// - Single page chat UI
// - Lessons sidebar
// - Session-scoped chat history in sessionStorage
// - Local progress in localStorage under 'dadTutorProgress'
// - Reset Progress button clears both

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
  },
};

const els = {
  lessonList: document.getElementById('lessonList'),
  messages: document.getElementById('messages'),
  input: document.getElementById('input'),
  send: document.getElementById('send'),
  composer: document.getElementById('composer'),
  reset: document.getElementById('resetProgress'),
  currentLesson: document.getElementById('currentLesson'),
  markDone: document.getElementById('markDone'),
  // Tool tray elements
  createPracticeFile: document.getElementById('createPracticeFile'),
  showExample: document.getElementById('showExample'),
  cheatSheet: document.getElementById('cheatSheet'),
  retryEasier: document.getElementById('retryEasier'),
  advanceTopic: document.getElementById('advanceTopic'),
  improveSyllabus: document.getElementById('improveSyllabus'),
  // Modal elements
  cheatSheetModal: document.getElementById('cheatSheetModal'),
  closeCheatSheet: document.getElementById('closeCheatSheet')
};

const HISTORY_KEY = 'history';
const PROGRESS_KEY = 'dadTutorProgress';

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
}

function addMessage(role, content) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.textContent = content;
  els.messages.appendChild(div);
  div.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function renderHistory(history) {
  els.messages.innerHTML = '';
  for (const m of history) {
    addMessage(m.role, m.content);
  }
}

function renderLessons(progress) {
  els.lessonList.innerHTML = '';
  Object.entries(LESSONS).forEach(([id, info]) => {
    const li = document.createElement('li');
    li.className = 'lesson';
    li.tabIndex = 0;
    li.setAttribute('data-lesson-id', id);

    const title = document.createElement('div');
    title.className = 'lesson-title';
    title.textContent = info.title;

    const summary = document.createElement('div');
    summary.className = 'lesson-summary';
    summary.textContent = info.summary;

    const status = document.createElement('div');
    const p = progress[id];
    const badge = document.createElement('span');
    badge.className = 'badge';
    if (p?.done) {
      badge.textContent = 'Done';
    } else if (p?.last) {
      badge.textContent = 'In progress';
    } else {
      badge.textContent = 'Not started';
    }
    status.appendChild(badge);

    if (progress[id]?.last) {
      const last = document.createElement('div');
      last.className = 'lesson-summary';
      last.textContent = `Last: ${progress[id].last}`;
      status.appendChild(last);
    }

    li.appendChild(title);
    li.appendChild(summary);
    li.appendChild(status);

    li.addEventListener('click', () => startLesson(id));
    li.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') startLesson(id);
    });

    els.lessonList.appendChild(li);
  });
}

function setInitialMessage() {
  const history = loadHistory();
  if (history.length === 0) {
    const welcome = "Welcome! I can teach Excel step-by-step on Windows. You can pick a lesson on the left or ask a question. For example: ‘Start from the very beginning.’";
    addMessage('assistant', welcome);
    history.push({ role: 'assistant', content: welcome });
    saveHistory(history);
  } else {
    renderHistory(history);
  }
}

async function sendToTutor(text, lessonId, mode = 'normal') {
  const history = loadHistory();
  const payload = {
    messages: history,
    mode: mode
  };
  if (lessonId) payload.lessonId = lessonId;

  setTyping(true);
  const res = await fetch('/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  setTyping(false);

  if (!res.ok) {
    try {
      const errorData = await res.json();
      return { error: errorData.error || 'Request failed' };
    } catch {
      const err = await res.text().catch(() => '');
      return { error: err || 'Request failed' };
    }
  }
  return res.json();
}

async function startLesson(lessonId) {
  const progress = loadProgress();
  progress[lessonId] = progress[lessonId] || { done: false, last: '' };
  progress[lessonId].last = new Date().toISOString();
  saveProgress(progress);

  els.currentLesson.textContent = `Current lesson: ${LESSONS[lessonId].title}`;
  els.markDone.style.display = 'inline-block';
  els.markDone.onclick = () => markLessonDone(lessonId);
  highlightActiveLesson(lessonId);

  // Seed the chat with the actual lesson seed prompt so the user sees it
  const seed = LESSONS[lessonId].seed;
  addMessage('user', seed);
  const history = loadHistory();
  history.push({ role: 'user', content: seed });
  saveHistory(history);

  disableSend(true);
  // We already included the seed in history, so do not pass lessonId here to avoid double seeding
  const { reply, error } = await sendToTutor(seed);
  disableSend(false);
  if (error) {
    const errorMsg = error.includes('OPENAI_API_KEY') 
      ? 'OpenAI API key is missing or invalid. Please check your environment settings.'
      : 'Sorry, I could not reach the tutor. Please try again.';
    toast(errorMsg);
    addMessage('assistant', errorMsg);
    return;
  }
  addMessage('assistant', reply);
  const updated = loadHistory();
  updated.push({ role: 'assistant', content: reply });
  saveHistory(updated);
}

function markLessonDone(lessonId) {
  const progress = loadProgress();
  if (!progress[lessonId]) progress[lessonId] = { done: false, last: '' };
  progress[lessonId].done = true;
  progress[lessonId].last = new Date().toISOString();
  saveProgress(progress);
  renderLessons(progress);
}

async function onSend(e) {
  e.preventDefault();
  const text = els.input.value.trim();
  if (!text) return;

  addMessage('user', text);
  els.input.value = '';

  const history = loadHistory();
  history.push({ role: 'user', content: text });
  saveHistory(history);

  disableSend(true);
  const { reply, error } = await sendToTutor(text);
  disableSend(false);
  if (error) {
    const errorMsg = error.includes('OPENAI_API_KEY') 
      ? 'OpenAI API key is missing or invalid. Please check your environment settings.'
      : 'Sorry, I could not reach the tutor. Please try again.';
    toast(errorMsg);
    addMessage('assistant', errorMsg);
    return;
  }
  addMessage('assistant', reply);
  const updated = loadHistory();
  updated.push({ role: 'assistant', content: reply });
  saveHistory(updated);
}

function resetAll() {
  sessionStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  els.messages.innerHTML = '';
  els.currentLesson.textContent = '';
  els.markDone.style.display = 'none';
  setInitialMessage();
  renderLessons(loadProgress());
}

// Tool Tray Functions
function showCheatSheet() {
  els.cheatSheetModal.style.display = 'block';
}

function hideCheatSheet() {
  els.cheatSheetModal.style.display = 'none';
}

async function createPracticeFile() {
  // Get current lesson context
  const activeLesson = document.querySelector('.lesson.active');
  if (!activeLesson) {
    toast('Please select a lesson first');
    return;
  }
  
  const lessonId = activeLesson.getAttribute('data-lesson-id');
  const lesson = LESSONS[lessonId];
  
  // Generate practice data based on lesson type
  let csvData = '';
  let filename = '';
  
  switch(lessonId) {
    case 'orientation':
      csvData = 'Item,Quantity\nApples,12\nBananas,8\nOranges,15\nGrapes,20';
      filename = 'Lesson1_Orientation_Practice.csv';
      break;
    case 'data':
      csvData = 'Name,Age,City\nJohn Smith,45,Seattle\nMary Johnson,52,Portland\nBob Wilson,38,Vancouver\nSusan Davis,41,Spokane';
      filename = 'Lesson2_Data_Entry_Practice.csv';
      break;
    case 'formatting':
      csvData = 'Product,Price,In Stock\nLaptop,899.99,Yes\nMouse,29.99,No\nKeyboard,79.99,Yes\nMonitor,299.99,Yes';
      filename = 'Lesson3_Formatting_Practice.csv';
      break;
    case 'formulas':
      csvData = 'Month,Sales\nJanuary,1250\nFebruary,1380\nMarch,1195\nApril,1425\nMay,1340';
      filename = 'Lesson4_SUM_Average_Practice.csv';
      break;
    case 'sortfilter':
      csvData = 'Employee,Department,Salary\nAlice Brown,Marketing,52000\nBob Smith,Sales,48000\nCarol Jones,Marketing,55000\nDave Wilson,Sales,51000\nEve Davis,IT,58000';
      filename = 'Lesson5_Sort_Filter_Practice.csv';
      break;
    case 'charts':
      csvData = 'Quarter,Revenue\nQ1,25000\nQ2,32000\nQ3,28000\nQ4,35000';
      filename = 'Lesson6_Charts_Practice.csv';
      break;
    case 'printing':
      csvData = 'Item,Jan,Feb,Mar,Total\nOffice Supplies,450,520,480,1450\nSoftware,1200,1100,1350,3650\nHardware,800,920,760,2480';
      filename = 'Lesson7_Printing_Practice.csv';
      break;
    default:
      csvData = 'Name,Value\nSample 1,100\nSample 2,200\nSample 3,150';
      filename = 'Practice_Data.csv';
  }
  
  // Create and download the file
  const blob = new Blob([csvData], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  window.URL.revokeObjectURL(url);
  
  toast(`Downloaded ${filename} - Open it in Excel to practice!`);
}

async function showExample() {
  const activeLesson = document.querySelector('.lesson.active');
  if (!activeLesson) {
    toast('Please select a lesson first');
    return;
  }
  
  const lessonId = activeLesson.getAttribute('data-lesson-id');
  const examplePrompt = `Show me a specific micro-example for the ${LESSONS[lessonId].title} lesson with exact values and step-by-step instructions.`;
  
  await sendMessageToTutor(examplePrompt, 'normal');
}

async function retryEasier() {
  const retryPrompt = `The learner is struggling with the current topic. Please provide an easier explanation, simplify the steps, and show a very small example with exact numbers. Break it down into smaller pieces.`;
  
  await sendMessageToTutor(retryPrompt, 'remediate');
}

async function advanceTopic() {
  const advancePrompt = `The learner has mastered the current concept. Please introduce the next concept in the syllabus with one micro-exercise and then a short 3-question quiz.`;
  
  await sendMessageToTutor(advancePrompt, 'advance');
}

async function improveSyllabus() {
  const progress = loadProgress();
  const lastResults = Object.entries(progress)
    .filter(([_, p]) => p.last)
    .map(([lesson, p]) => `${lesson}: ${p.done ? 'completed' : 'in progress'} (${p.last})`)
    .join(', ');
  
  const improvePrompt = `Based on the user's recent progress and any struggles in [${lastResults}], please propose a revised 3-lesson sequence with measurable objectives and one tiny practice per lesson. Keep all steps Windows-specific.`;
  
  await sendMessageToTutor(improvePrompt, 'normal');
}

async function sendMessageToTutor(prompt, mode = 'normal') {
  addMessage('user', prompt);
  const history = loadHistory();
  history.push({ role: 'user', content: prompt });
  saveHistory(history);

  disableSend(true);
  const { reply, error } = await sendToTutor(prompt, null, mode);
  disableSend(false);
  
  if (error) {
    const errorMsg = error.includes('OPENAI_API_KEY') 
      ? 'OpenAI API key is missing or invalid. Please check your environment settings.'
      : 'Sorry, I could not reach the tutor. Please try again.';
    toast(errorMsg);
    addMessage('assistant', errorMsg);
    return;
  }
  
  addMessage('assistant', reply);
  const updated = loadHistory();
  updated.push({ role: 'assistant', content: reply });
  saveHistory(updated);
}

function init() {
  renderLessons(loadProgress());
  setInitialMessage();
  els.composer.addEventListener('submit', onSend);
  els.reset.addEventListener('click', resetAll);
  autoResize(els.input);
  
  // Tool tray event listeners
  els.createPracticeFile.addEventListener('click', createPracticeFile);
  els.showExample.addEventListener('click', showExample);
  els.cheatSheet.addEventListener('click', showCheatSheet);
  els.retryEasier.addEventListener('click', retryEasier);
  els.advanceTopic.addEventListener('click', advanceTopic);
  els.improveSyllabus.addEventListener('click', improveSyllabus);
  
  // Modal event listeners
  els.closeCheatSheet.addEventListener('click', hideCheatSheet);
  els.cheatSheetModal.addEventListener('click', (e) => {
    if (e.target === els.cheatSheetModal) hideCheatSheet();
  });
}

window.addEventListener('DOMContentLoaded', init);

// UI helpers
function highlightActiveLesson(lessonId) {
  document.querySelectorAll('.lesson').forEach(li => {
    if (li.getAttribute('data-lesson-id') === lessonId) li.classList.add('active');
    else li.classList.remove('active');
  });
}

function toast(text) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

function autoResize(textarea) {
  const resize = () => {
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(220, textarea.scrollHeight) + 'px';
  };
  ['input', 'change'].forEach(ev => textarea.addEventListener(ev, resize));
  resize();
}

function disableSend(disabled) {
  els.send.disabled = disabled;
  els.input.disabled = disabled;
}

function setTyping(show) {
  const id = 'typing-indicator';
  let el = document.getElementById(id);
  if (show) {
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'message assistant typing';
      el.textContent = 'Tutor is typing…';
      els.messages.appendChild(el);
      el.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  } else if (el) {
    el.remove();
  }
}
