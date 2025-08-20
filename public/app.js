// Dad's Excel Tutor client script
// Requirements covered:
// - Single page chat UI
// - Lessons sidebar
// - Session-scoped chat history in sessionStorage
// - Local progress in localStorage under 'dadTutorProgress'
// - Reset Progress button clears both

// Adaptive Syllabus Structure (from section 4 of requirements)
const SYLLABUS = {
  units: {
    A: {
      title: "Unit A — Foundations",
      lessons: {
        orientation: {
          title: 'Orientation',
          summary: 'Workbook vs. worksheet; rows/columns/cells; the Ribbon; saving a file.',
          objectives: ['Understand workbook vs worksheet', 'Navigate rows/columns/cells', 'Use the Ribbon interface', 'Save a file properly'],
          seed: 'Teach the very first Excel lesson on Windows. Explain workbook, worksheet, rows, columns, cells, the Ribbon, and saving a file. Include a 5-step hands-on practice and then a 3-question quiz.'
        },
        navigation: {
          title: 'Navigation & selection',
          summary: 'Entering text/numbers; basic file management.',
          objectives: ['Move with arrow keys', 'Select cells', 'Enter text and numbers', 'Basic file management'],
          seed: 'Teach moving with arrow keys, selecting cells, typing text/numbers, and saving with a clear file name. Include a tiny practice table and a 3-question quiz.'
        },
        formatting: {
          title: 'Formatting basics',
          summary: 'Bold, borders, column width, row height, number formats.',
          objectives: ['Apply bold formatting', 'Add borders', 'Adjust column width and row height', 'Set number formats'],
          seed: 'Teach bold, borders, column width, row height, and number formats. Include an exact mini-table and a 3-question quiz.'
        }
      }
    },
    B: {
      title: "Unit B — Core Skills",
      lessons: {
        formulas1: {
          title: 'Formulas 1',
          summary: '=SUM, =AVERAGE (exact keystrokes).',
          objectives: ['Enter =SUM formula with exact keystrokes', 'Enter =AVERAGE formula', 'Work with cell ranges', 'Understand basic formula structure'],
          seed: 'Teach `=SUM` and `=AVERAGE` with exact keystrokes. Provide a tiny dataset, compute totals/averages, then a 3-question quiz.'
        },
        autofill: {
          title: 'Autofill & relative references',
          summary: 'Copying formulas safely.',
          objectives: ['Use Autofill handle', 'Understand relative references', 'Copy formulas safely', 'Recognize formula patterns'],
          seed: 'Teach Autofill handle, relative references, and safe copying of formulas. Include a small table and a 3-question quiz.'
        },
        sortfilter: {
          title: 'Sort & Filter',
          summary: 'Turn on Filter, sort A→Z, filter by value.',
          objectives: ['Enable Filter feature', 'Sort data A→Z', 'Filter by specific values', 'Understand data organization'],
          seed: 'Teach turning on Filter, sorting A→Z, and filtering by value. Include a small sample and a 3-question quiz.'
        }
      }
    },
    C: {
      title: "Unit C — Presenting & Printing", 
      lessons: {
        charts: {
          title: 'Intro charts',
          summary: 'Build a Column chart from a 2-column table.',
          objectives: ['Select data for charts', 'Insert Column chart', 'Understand chart basics', 'Format chart elements'],
          seed: 'Teach inserting a Column chart from a 2-column table. Provide the sample data and a 3-question quiz.'
        },
        printing: {
          title: 'Printing basics',
          summary: 'Print Preview, orientation, margins, fit to one page.',
          objectives: ['Use Print Preview', 'Set page orientation', 'Adjust margins', 'Fit content to one page'],
          seed: 'Teach Print Preview, orientation, margins, and \'Fit Sheet on One Page\'. Include a 3-question quiz.'
        }
      }
    }
  }
};

// Helper function to get flat lesson list for compatibility
function getFlatLessons() {
  const lessons = {};
  Object.values(SYLLABUS.units).forEach(unit => {
    Object.entries(unit.lessons).forEach(([id, lesson]) => {
      lessons[id] = lesson;
    });
  });
  return lessons;
}

const LESSONS = getFlatLessons();

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
const PROGRESS_KEY = 'dadTutorProgress'; // Keep for backward compatibility
const SYLLABUS_KEY = 'dadTutorSyllabusV1';

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

// Syllabus management functions
function loadSyllabus() {
  try {
    const raw = localStorage.getItem(SYLLABUS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Fall through to create default
  }
  
  // Create default syllabus with lesson statuses
  const syllabus = {
    units: {},
    lastUpdated: new Date().toISOString()
  };
  
  Object.entries(SYLLABUS.units).forEach(([unitId, unit]) => {
    syllabus.units[unitId] = {
      title: unit.title,
      lessons: {}
    };
    
    Object.entries(unit.lessons).forEach(([lessonId, lesson]) => {
      syllabus.units[unitId].lessons[lessonId] = {
        title: lesson.title,
        summary: lesson.summary,
        objectives: lesson.objectives,
        status: 'not_started', // not_started | in_progress | mastered
        lastResult: null, // { score: number, answers: array, timestamp: string }
        attempts: 0
      };
    });
  });
  
  saveSyllabus(syllabus);
  return syllabus;
}

function saveSyllabus(syllabus) {
  syllabus.lastUpdated = new Date().toISOString();
  localStorage.setItem(SYLLABUS_KEY, JSON.stringify(syllabus));
}

function updateLessonStatus(lessonId, status, result = null) {
  const syllabus = loadSyllabus();
  
  // Find the lesson in the syllabus structure
  for (const [unitId, unit] of Object.entries(syllabus.units)) {
    if (unit.lessons[lessonId]) {
      unit.lessons[lessonId].status = status;
      if (result) {
        unit.lessons[lessonId].lastResult = result;
        unit.lessons[lessonId].attempts++;
      }
      saveSyllabus(syllabus);
      return;
    }
  }
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
  const syllabus = loadSyllabus();
  
  Object.entries(syllabus.units).forEach(([unitId, unit]) => {
    // Create unit header
    const unitHeader = document.createElement('div');
    unitHeader.className = 'unit-header';
    unitHeader.innerHTML = `<h3>${unit.title}</h3>`;
    els.lessonList.appendChild(unitHeader);
    
    // Create lessons for this unit
    Object.entries(unit.lessons).forEach(([lessonId, lesson]) => {
      const li = document.createElement('li');
      li.className = 'lesson';
      li.tabIndex = 0;
      li.setAttribute('data-lesson-id', lessonId);

      const title = document.createElement('div');
      title.className = 'lesson-title';
      title.textContent = lesson.title;

      const summary = document.createElement('div');
      summary.className = 'lesson-summary';
      summary.textContent = lesson.summary;

      const status = document.createElement('div');
      const badge = document.createElement('span');
      badge.className = 'badge';
      
      // Use new status system
      switch(lesson.status) {
        case 'mastered':
          badge.textContent = 'Mastered';
          badge.classList.add('badge-mastered');
          break;
        case 'in_progress':
          badge.textContent = 'In Progress';
          badge.classList.add('badge-progress');
          break;
        default:
          badge.textContent = 'Not Started';
          badge.classList.add('badge-not-started');
      }
      status.appendChild(badge);

      // Show quiz results if available
      if (lesson.lastResult) {
        const resultDiv = document.createElement('div');
        resultDiv.className = 'lesson-summary';
        resultDiv.textContent = `Last quiz: ${lesson.lastResult.score}/3 (${new Date(lesson.lastResult.timestamp).toLocaleDateString()})`;
        status.appendChild(resultDiv);
      }

      li.appendChild(title);
      li.appendChild(summary);
      li.appendChild(status);

      li.addEventListener('click', () => startLesson(lessonId));
      li.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startLesson(lessonId);
      });

      els.lessonList.appendChild(li);
    });
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
  // Update both old progress and new syllabus for backward compatibility
  const progress = loadProgress();
  progress[lessonId] = progress[lessonId] || { done: false, last: '' };
  progress[lessonId].last = new Date().toISOString();
  saveProgress(progress);
  
  // Update syllabus status
  updateLessonStatus(lessonId, 'in_progress');

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
  // Update old progress for backward compatibility  
  const progress = loadProgress();
  if (!progress[lessonId]) progress[lessonId] = { done: false, last: '' };
  progress[lessonId].done = true;
  progress[lessonId].last = new Date().toISOString();
  saveProgress(progress);
  
  // Update syllabus - mark as mastered (assuming 3/3 quiz score)
  const result = {
    score: 3,
    answers: ['completed'],
    timestamp: new Date().toISOString()
  };
  updateLessonStatus(lessonId, 'mastered', result);
  
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
  localStorage.removeItem(SYLLABUS_KEY); // Clear syllabus data too
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
      filename = 'UnitA_Orientation_Practice.csv';
      break;
    case 'navigation':
      csvData = 'Name,Age,City\nJohn Smith,45,Seattle\nMary Johnson,52,Portland\nBob Wilson,38,Vancouver\nSusan Davis,41,Spokane';
      filename = 'UnitA_Navigation_Practice.csv';
      break;
    case 'formatting':
      csvData = 'Product,Price,In Stock\nLaptop,899.99,Yes\nMouse,29.99,No\nKeyboard,79.99,Yes\nMonitor,299.99,Yes';
      filename = 'UnitA_Formatting_Practice.csv';
      break;
    case 'formulas1':
      csvData = 'Month,Sales\nJanuary,1250\nFebruary,1380\nMarch,1195\nApril,1425\nMay,1340';
      filename = 'UnitB_Formulas1_Practice.csv';
      break;
    case 'autofill':
      csvData = 'Week,Orders\nWeek 1,45\nWeek 2,52\nWeek 3,48\nWeek 4,61\nWeek 5,55';
      filename = 'UnitB_Autofill_Practice.csv';
      break;
    case 'sortfilter':
      csvData = 'Employee,Department,Salary\nAlice Brown,Marketing,52000\nBob Smith,Sales,48000\nCarol Jones,Marketing,55000\nDave Wilson,Sales,51000\nEve Davis,IT,58000';
      filename = 'UnitB_Sort_Filter_Practice.csv';
      break;
    case 'charts':
      csvData = 'Quarter,Revenue\nQ1,25000\nQ2,32000\nQ3,28000\nQ4,35000';
      filename = 'UnitC_Charts_Practice.csv';
      break;
    case 'printing':
      csvData = 'Item,Jan,Feb,Mar,Total\nOffice Supplies,450,520,480,1450\nSoftware,1200,1100,1350,3650\nHardware,800,920,760,2480';
      filename = 'UnitC_Printing_Practice.csv';
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
