"use strict";

const page = document.body.dataset.page;
const protectedPages = new Set(["dashboard", "practice", "summary"]);

function $(selector, root = document) { return root.querySelector(selector); }
function $$(selector, root = document) { return [...root.querySelectorAll(selector)]; }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[char]);
}
function normalizeAnswer(value) {
  return String(value ?? "").normalize("NFKC").trim().toLocaleLowerCase("de-DE")
    .replace(/[.,!?;:()]/g, "").replace(/ß/g, "ss").replace(/\s+/g, " ");
}
function answersMatch(actual, expected) {
  const normalized = normalizeAnswer(actual);
  return String(expected ?? "").split(/\s*[|/]\s*/).some(option => normalizeAnswer(option) === normalized);
}
function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}
function levelFor(exp = 0) { return Math.max(1, Math.floor(Math.sqrt(Math.max(0, exp) / 250)) + 1); }

async function api(path, options = {}) {
  const { allowUnauthorized = false, ...fetchOptions } = options;
  const headers = { Accept: "application/json", ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}), ...(fetchOptions.headers || {}) };
  let response;
  try {
    response = await fetch(path, { credentials: "same-origin", ...fetchOptions, headers });
  } catch (error) {
    throw new Error("The server is unavailable. Check your connection and try again.");
  }
  let data = {};
  try { data = await response.json(); } catch (_) { data = {}; }
  if (response.status === 401 && !allowUnauthorized && protectedPages.has(page)) {
    window.location.replace("/login.html");
    throw new Error("Your session has expired.");
  }
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function applyTheme(theme) {
  if (theme === "dark") document.documentElement.dataset.theme = "dark";
  else delete document.documentElement.dataset.theme;
  localStorage.setItem("wortwerk_theme", theme);
  document.querySelectorAll('meta[name="theme-color"]').forEach(meta => meta.content = theme === "dark" ? "#111613" : "#f5f3ee");
}

function initTheme() {
  const stored = localStorage.getItem("wortwerk_theme");
  const initial = stored || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  applyTheme(initial);
  $$(".theme-toggle").forEach(button => button.addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark")));
}

async function initLanding() {
  try {
    const data = await api("/api/me", { allowUnauthorized: true });
    if (!data.user) return;
    $("#landing-account-link").textContent = "Dashboard";
    $("#landing-account-link").href = "/dashboard.html";
    $("#landing-primary-link").textContent = "Continue learning";
    $("#landing-primary-link").href = "/dashboard.html";
  } catch (_) {}
}

function setAuthTab(name) {
  const isLogin = name === "login";
  $("#login-panel").hidden = !isLogin;
  $("#register-panel").hidden = isLogin;
  $("#login-tab").classList.toggle("is-active", isLogin);
  $("#register-tab").classList.toggle("is-active", !isLogin);
  $("#login-tab").setAttribute("aria-selected", String(isLogin));
  $("#register-tab").setAttribute("aria-selected", String(!isLogin));
  $("#auth-message").textContent = "";
  requestAnimationFrame(() => $(isLogin ? "#login-username" : "#register-username").focus());
}

async function submitAuth(form, action) {
  const message = $("#auth-message");
  if (!form.reportValidity()) return;
  const button = $("button[type='submit']", form);
  button.disabled = true;
  message.className = "form-message";
  message.textContent = action === "login" ? "Signing in…" : "Creating your account…";
  try {
    const payload = Object.fromEntries(new FormData(form));
    await api(`/api/${action}`, { method: "POST", body: JSON.stringify(payload), allowUnauthorized: true });
    if (action === "login") window.location.replace("/dashboard.html");
    else {
      form.reset();
      setAuthTab("login");
      message.className = "form-message success";
      message.textContent = "Account created. Sign in to begin.";
    }
  } catch (error) {
    message.textContent = error.message;
  } finally { button.disabled = false; }
}

async function initLogin() {
  try {
    const data = await api("/api/me", { allowUnauthorized: true });
    if (data.user) { window.location.replace("/dashboard.html"); return; }
  } catch (_) {}
  $("#login-tab").addEventListener("click", () => setAuthTab("login"));
  $("#register-tab").addEventListener("click", () => setAuthTab("register"));
  $("#login-form").addEventListener("submit", event => { event.preventDefault(); submitAuth(event.currentTarget, "login"); });
  $("#register-form").addEventListener("submit", event => { event.preventDefault(); submitAuth(event.currentTarget, "register"); });
}

function startSession(mode) {
  const size = mode === "learn" ? Number($("#word-count")?.value || 6) : Number(localStorage.getItem("wortwerk_daily_goal") || 15);
  if (mode === "learn") localStorage.setItem("wortwerk_new_word_count", String(size));
  localStorage.setItem("session_mode", mode);
  localStorage.setItem("session_word_count", String(mode === "exam" ? 8 : mode === "listen" ? clamp(size, 5, 12) : size));
  localStorage.removeItem("resume_active_session");
  window.location.href = "/vocab.html";
}

function setText(selector, value) { const element = $(selector); if (element) element.textContent = value; }

function renderOverview(data) {
  const { user, totals, skillBalance = {} } = data;
  const exp = Number(user.exp || 0);
  const level = levelFor(exp);
  setText("#welcome-heading", `Guten Tag, ${user.username}.`);
  setText("#nav-level", `Level ${level}`);
  setText("#due-count", totals.due);
  setText("#today-guidance", totals.due > 0 ? "Start with overdue recall; the session will mix in form, sound, and productive use." : totals.new > 0 ? "You are caught up. A few new words are ready for their first memory cycle." : "Everything is scheduled. Try a listening or Goethe round for extra practice.");
  setText("#mastered-count", totals.mastered);
  setText("#mastered-detail", `of ${totals.vocabulary} words`);
  setText("#learning-count", totals.learning);
  setText("#new-count", totals.new);
  setText("#accuracy-value", `${totals.accuracy}%`);
  setText("#xp-value", exp.toLocaleString());
  setText("#xp-detail", `Level ${level}`);
  setText("#today-recalls", totals.todayRecalls);
  setText("#streak-count", totals.streak);
  setText("#smart-meta", totals.due ? `${totals.due} due` : "Caught up");
  $("#resume-button").hidden = !data.hasSavedSession;
  const goal = Number(localStorage.getItem("wortwerk_daily_goal") || 15);
  const percent = clamp(Math.round((totals.todayRecalls / goal) * 100), 0, 100);
  setText("#goal-percent", `${percent}%`);
  setText("#goal-total", goal);
  $("#goal-ring").style.setProperty("--goal", `${percent * 3.6}deg`);
  const balance = { input: skillBalance.input || 0, output: skillBalance.output || 0, form: skillBalance.form || 0, fluency: skillBalance.fluency || 0 };
  const max = Math.max(1, ...Object.values(balance));
  Object.entries(balance).forEach(([skill, count]) => {
    setText(`#skill-${skill}`, count);
    $(`#bar-${skill}`).style.width = `${Math.round((count / max) * 100)}%`;
  });
  if (user.isAdmin) initAdmin();
}

function renderHistory(history) {
  const list = $("#history-list");
  list.replaceChildren();
  if (!history.length) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Your first completed session will appear here.";
    list.append(empty);
    return;
  }
  history.forEach(item => {
    const row = document.createElement("article");
    row.className = "history-item";
    const title = document.createElement("strong");
    const accuracy = item.total_questions ? Math.round((item.correct / item.total_questions) * 100) : 0;
    title.textContent = `${item.total_questions} retrievals · ${accuracy}% accurate`;
    const duration = document.createElement("span");
    duration.textContent = `${Math.max(1, Math.round(item.time_spent_seconds / 60))} min`;
    const time = document.createElement("time");
    time.dateTime = item.created_at;
    time.textContent = formatDate(item.created_at);
    row.append(title, duration, time);
    list.append(row);
  });
}

let adminVocabulary = null;
let adminMode = "add";
let editingWord = null;
const fieldSets = {
  nouns: [["word", "Noun"], ["article", "Article (der/die/das)"], ["plural", "Plural"], ["meaning", "English meaning"]],
  verbs: [["word", "Infinitive"], ["present_3sg", "Present, 3rd person"], ["past_3sg", "Simple past, 3rd person"], ["past_participle", "Past participle"], ["meaning", "English meaning"]],
  adjectives: [["word", "Adjective or adverb"], ["comparative", "Comparative (optional)"], ["superlative", "Superlative (optional)"], ["meaning", "English meaning"]],
  prepositions: [["word", "Preposition"], ["case", "Case (A, D, G, or A/D)"], ["meaning", "English meaning"]]
};

function renderWordFields(values = {}) {
  const type = $("#word-type").value;
  const host = $("#word-fields");
  host.replaceChildren();
  fieldSets[type].forEach(([name, label]) => {
    const labelElement = document.createElement("label");
    labelElement.htmlFor = `word-field-${name}`;
    labelElement.textContent = label;
    const input = document.createElement("input");
    input.id = `word-field-${name}`;
    input.name = name;
    input.maxLength = 160;
    input.value = values[name] || "";
    input.required = !["comparative", "superlative"].includes(name);
    host.append(labelElement, input);
  });
}

function searchAdminWords() {
  const query = normalizeAnswer($("#word-search").value);
  const results = $("#word-search-results");
  results.replaceChildren();
  if (query.length < 2 || !adminVocabulary) return;
  Object.entries(adminVocabulary).flatMap(([type, words]) => words.map(word => ({ type, word })))
    .filter(item => normalizeAnswer(item.word.word).includes(query)).slice(0, 12).forEach(item => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "search-result";
      button.textContent = `${item.word.word} · ${item.type}`;
      button.addEventListener("click", () => {
        editingWord = { type: item.type, original: item.word.word };
        $("#word-type").value = item.type;
        $("#word-type").disabled = true;
        renderWordFields(item.word);
        results.replaceChildren();
        setText("#word-dialog-title", `Edit ${item.word.word}`);
      });
      results.append(button);
    });
}

function openWordDialog(mode) {
  adminMode = mode;
  editingWord = null;
  $("#word-form").reset();
  $("#word-type").disabled = false;
  $("#word-search-wrap").hidden = mode !== "edit";
  $("#save-word-button").disabled = mode === "edit";
  setText("#word-dialog-title", mode === "add" ? "Add a word" : "Find and edit");
  setText("#word-form-message", "");
  renderWordFields();
  $("#word-dialog").showModal();
  if (mode === "edit") $("#word-search").focus();
}

async function saveAdminWord(event) {
  event.preventDefault();
  const form = event.currentTarget;
  if (!form.reportValidity()) return;
  if (adminMode === "edit" && !editingWord) return;
  const type = $("#word-type").value;
  const wordData = {};
  fieldSets[type].forEach(([name]) => { wordData[name] = $(`#word-field-${name}`).value.trim(); });
  const button = $("#save-word-button");
  button.disabled = true;
  try {
    await api("/api/admin/words", { method: "POST", body: JSON.stringify({ action: adminMode, wordType: type, wordData, oldWordName: editingWord?.original || "" }) });
    adminVocabulary = (await api("/api/vocabulary")).vocabulary;
    $("#word-dialog").close();
  } catch (error) { setText("#word-form-message", error.message); }
  finally { button.disabled = false; }
}

async function initAdmin() {
  $("#admin-panel").hidden = false;
  try {
    const [invite, vocabulary] = await Promise.all([api("/api/admin/invite"), api("/api/vocabulary")]);
    setText("#admin-code", invite.code);
    adminVocabulary = vocabulary.vocabulary;
  } catch (_) { setText("#admin-code", "Unavailable"); }
  $("#add-word-button").addEventListener("click", () => openWordDialog("add"));
  $("#edit-word-button").addEventListener("click", () => openWordDialog("edit"));
  $("#close-word-dialog").addEventListener("click", () => $("#word-dialog").close());
  $("#word-type").addEventListener("change", () => renderWordFields());
  $("#word-search").addEventListener("input", searchAdminWords);
  $("#word-form").addEventListener("submit", saveAdminWord);
}

async function initDashboard() {
  window.scrollTo(0, 0);
  const goalSelect = $("#daily-goal");
  const goal = localStorage.getItem("wortwerk_daily_goal") || "15";
  goalSelect.value = goal;
  setText("#goal-total", goal);
  goalSelect.addEventListener("change", () => { localStorage.setItem("wortwerk_daily_goal", goalSelect.value); window.location.reload(); });
  const wordRange = $("#word-count");
  const savedSize = clamp(Number(localStorage.getItem("wortwerk_new_word_count") || 6), 3, 15);
  wordRange.value = String(savedSize);
  setText("#word-count-output", `${savedSize} words`);
  wordRange.addEventListener("input", () => setText("#word-count-output", `${wordRange.value} words`));
  $$('[data-start-mode]').forEach(button => button.addEventListener("click", () => startSession(button.dataset.startMode)));
  $("#resume-button").addEventListener("click", () => { localStorage.setItem("resume_active_session", "true"); window.location.href = "/vocab.html"; });
  $("#logout-button").addEventListener("click", async () => { try { await api("/api/logout", { method: "POST" }); } finally { window.location.replace("/login.html"); } });
  const confirmDialog = $("#confirm-dialog");
  $("#reset-button").addEventListener("click", () => confirmDialog.showModal());
  confirmDialog.addEventListener("close", async () => {
    if (confirmDialog.returnValue !== "confirm") return;
    try { await api("/api/user/reset", { method: "POST", body: "{}" }); window.location.reload(); }
    catch (error) { alert(error.message); }
  });
  try {
    const [overview, history] = await Promise.all([api("/api/overview"), api("/api/history")]);
    renderOverview(overview);
    renderHistory(history.history || []);
  } catch (error) {
    $("#today-guidance").textContent = error.message;
  } finally { $("#main").setAttribute("aria-busy", "false"); }
}

function flattenVocabulary(data) {
  const map = { nouns: "noun", verbs: "verb", adjectives: "adj", prepositions: "prep" };
  let order = 0;
  return Object.entries(map).flatMap(([group, type]) => (data[group] || []).map(word => ({ ...word, type, group, order: order++, key: `${type}:${word.word}` })));
}

function interleaveByType(words, limit) {
  const groups = ["noun", "verb", "adj", "prep"].map(type => words.filter(word => word.type === type));
  const result = [];
  while (result.length < limit && groups.some(group => group.length)) {
    groups.forEach(group => { if (group.length && result.length < limit) result.push(group.shift()); });
  }
  return result;
}

function shuffled(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

const examTasks = [
  { kind: "exam", skill: "exam-listen", instruction: "Listen to the station announcement", title: "Which platform should you use?", spoken: "Achtung. Der Zug nach Berlin fährt heute um siebzehn Uhr von Gleis vier.", choices: ["Gleis 2", "Gleis 4", "Gleis 7"], expected: "Gleis 4" },
  { kind: "exam", skill: "exam-read", instruction: "Read the short message", title: "When will Lena arrive?", passage: "Hallo Tom,\nich muss heute länger arbeiten. Ich komme nicht um sechs, sondern gegen halb acht. Bitte fangt ohne mich an.\nLiebe Grüße, Lena", choices: ["18:00", "19:30", "20:30"], expected: "19:30" },
  { kind: "exam", skill: "exam-listen", instruction: "Listen to the voicemail", title: "Why is the caller phoning?", spoken: "Guten Tag, hier ist Frau Keller. Ihr Termin am Montag fällt leider aus. Bitte rufen Sie uns für einen neuen Termin an.", choices: ["To confirm Monday", "To change an appointment", "To order something"], expected: "To change an appointment" },
  { kind: "exam", skill: "exam-read", instruction: "Read the notice", title: "What is not allowed?", passage: "Bibliothek\nBitte leise sprechen. Essen und Getränke sind im Lesesaal nicht erlaubt. Taschen können Sie am Eingang abgeben.", choices: ["Speaking quietly", "Bringing a bag", "Eating in the reading room"], expected: "Eating in the reading room" },
  { kind: "exam", skill: "exam-write", instruction: "A1 writing: compose a short message", title: "Write 3–4 sentences", prompt: "You cannot attend your German class tomorrow. Write to your teacher: say why, apologize, and ask about the homework.", checklist: ["Reason included", "Apology included", "Homework question included"] },
  { kind: "exam", skill: "exam-speak", instruction: "A1 speaking: introduce yourself", title: "Speak for about 30 seconds", prompt: "Say your name, where you live, which languages you speak, and one thing you enjoy." },
  { kind: "exam", skill: "exam-cloze", instruction: "Complete the everyday sentence", title: "Wir treffen uns ___ acht Uhr.", choices: ["an", "um", "in"], expected: "um" },
  { kind: "exam", skill: "exam-speak", instruction: "A1 speaking: make a request", title: "Ask politely", prompt: "You need a pen during class. Ask another learner and respond after they help you." }
];

let practiceState = null;
let vocabularyByKey = new Map();
let allVocabulary = [];
let selectedChoice = "";
let questionStartedAt = 0;
let processingAnswer = false;

function progressKey(progress) { return `${progress.word_type}:${progress.word}`; }
function memoryLabel(word) {
  const state = practiceState.progress[word.key];
  if (!state) return "New";
  if (state.stage === "mastered") return "Durable";
  if (state.due_at && new Date(state.due_at) <= new Date()) return "Due now";
  return state.stage === "review" ? "Reviewing" : "Learning";
}

function chooseReviewSkill(word, state, index) {
  if (!state || Number(state.review_count) < 2) return "recall";
  if (index % 7 === 0) return "sentence";
  if (index % 4 === 0) return "listen";
  if (index % 3 === 0 && ["noun", "verb", "prep"].includes(word.type)) return "form";
  return "recall";
}

function buildLearnQueue(words) {
  return [
    ...words.map(word => ({ kind: "vocab", skill: "intro", wordKey: word.key, retryCount: 0 })),
    ...shuffled(words).map(word => ({ kind: "vocab", skill: "recognition", wordKey: word.key, retryCount: 0 })),
    ...shuffled(words).map(word => ({ kind: "vocab", skill: "recall", wordKey: word.key, retryCount: 0 })),
    ...shuffled(words.filter(word => word.type !== "adj" || word.comparative)).map(word => ({ kind: "vocab", skill: "form", wordKey: word.key, retryCount: 0 }))
  ];
}

function createPracticePlan(mode, limit, progressRows) {
  const now = Date.now();
  const progress = Object.fromEntries(progressRows.map(row => [progressKey(row), row]));
  const unseen = allVocabulary.filter(word => !progress[word.key]);
  const seen = allVocabulary.filter(word => progress[word.key]);
  let queue = [];
  let selectedWords = [];
  if (mode === "exam") {
    queue = shuffled(examTasks).slice(0, 8).map(task => ({ ...task, retryCount: 0 }));
  } else if (mode === "learn") {
    selectedWords = interleaveByType(unseen, limit);
    queue = buildLearnQueue(selectedWords);
  } else if (mode === "listen") {
    selectedWords = [...seen].sort((a, b) => {
      const pa = progress[a.key], pb = progress[b.key];
      return new Date(pa.due_at || 0) - new Date(pb.due_at || 0) || Number(pb.difficulty || 5) - Number(pa.difficulty || 5);
    }).slice(0, limit);
    if (!selectedWords.length) {
      selectedWords = interleaveByType(unseen, Math.min(limit, 5));
      queue = [
        ...selectedWords.map(word => ({ kind: "vocab", skill: "intro", wordKey: word.key, retryCount: 0 })),
        ...shuffled(selectedWords).map(word => ({ kind: "vocab", skill: "listen", wordKey: word.key, retryCount: 0 }))
      ];
    } else queue = selectedWords.map(word => ({ kind: "vocab", skill: "listen", wordKey: word.key, retryCount: 0 }));
  } else {
    const due = seen.filter(word => !progress[word.key].due_at || new Date(progress[word.key].due_at).getTime() <= now)
      .sort((a, b) => {
        const pa = progress[a.key], pb = progress[b.key];
        const scoreA = (now - new Date(pa.due_at || 0).getTime()) / 3600000 + Number(pa.difficulty || 5) * 8 + Number(pa.lapse_count || 0) * 14 - Number(pa.stability_days || 0);
        const scoreB = (now - new Date(pb.due_at || 0).getTime()) / 3600000 + Number(pb.difficulty || 5) * 8 + Number(pb.lapse_count || 0) * 14 - Number(pb.stability_days || 0);
        return scoreB - scoreA;
      });
    selectedWords = due.slice(0, limit);
    if (!selectedWords.length && unseen.length) {
      selectedWords = interleaveByType(unseen, Math.min(3, limit));
      queue = buildLearnQueue(selectedWords);
    } else {
      queue = selectedWords.map((word, index) => ({ kind: "vocab", skill: chooseReviewSkill(word, progress[word.key], index), wordKey: word.key, retryCount: 0 }));
    }
    if (!queue.length) {
      selectedWords = seen.slice().sort((a, b) => Number(progress[b.key].difficulty || 5) - Number(progress[a.key].difficulty || 5)).slice(0, Math.min(6, limit));
      queue = selectedWords.map(word => ({ kind: "vocab", skill: "sentence", wordKey: word.key, retryCount: 0 }));
    }
  }
  return { queue, progress, selectedWords };
}

function sessionSnapshot() {
  const current = practiceState.current;
  return {
    version: 2,
    sessionId: practiceState.sessionId,
    mode: practiceState.mode,
    queue: current ? [current, ...practiceState.queue] : practiceState.queue,
    stats: practiceState.stats,
    totalPlanned: practiceState.totalPlanned,
    completedItems: practiceState.completedItems,
    startedAt: practiceState.startedAt
  };
}

function setPracticeActions({ submit = true, dontKnow = true, continueButton = false, submitLabel = "Check answer" } = {}) {
  $("#submit-answer").hidden = !submit;
  $("#dont-know").hidden = !dontKnow;
  $("#continue-button").hidden = !continueButton;
  $("#submit-answer").textContent = submitLabel;
}

function addChoiceButtons(choices) {
  const host = $("#answer-area");
  const list = document.createElement("div");
  list.className = "choice-list";
  choices.forEach((choice, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "choice";
    button.dataset.key = String.fromCharCode(65 + index);
    button.dataset.value = choice;
    button.textContent = choice;
    button.addEventListener("click", () => {
      selectedChoice = choice;
      $$(".choice", list).forEach(item => item.classList.toggle("is-selected", item === button));
    });
    list.append(button);
  });
  host.append(list);
}

function addTextInput(id, label, placeholder = "Type your answer") {
  const row = document.createElement("div");
  row.className = "answer-row";
  const labelElement = document.createElement("label");
  labelElement.htmlFor = id;
  labelElement.textContent = label;
  const input = document.createElement("input");
  input.id = id;
  input.autocomplete = "off";
  input.placeholder = placeholder;
  row.append(labelElement, input);
  $("#answer-area").append(row);
  return input;
}

function speakGerman(text) {
  if (!("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "de-DE";
  utterance.rate = 0.82;
  const voice = speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith("de"));
  if (voice) utterance.voice = voice;
  speechSynthesis.speak(utterance);
}

function listenTextFor(word) { return word.type === "noun" ? `${word.article} ${word.word}` : word.word; }
function wordDisplay(word) { return word.type === "noun" ? `${word.article} ${word.word}` : word.word; }
function wordFacts(word) {
  if (word.type === "noun") return [["Meaning", word.meaning], ["Plural", word.plural], ["Article", word.article], ["Word type", "Noun"]];
  if (word.type === "verb") return [["Meaning", word.meaning], ["Present", word.present_3sg], ["Simple past", word.past_3sg], ["Participle", word.past_participle]];
  if (word.type === "prep") return [["Meaning", word.meaning], ["Case", word.case], ["Word type", "Preposition"]];
  return [["Meaning", word.meaning], ...(word.comparative ? [["Comparative", word.comparative], ["Superlative", word.superlative]] : []), ["Word type", "Adjective / adverb"]];
}

function renderFacts(word) {
  const grid = document.createElement("div");
  grid.className = "word-facts";
  wordFacts(word).forEach(([label, value]) => {
    const fact = document.createElement("div");
    fact.className = "word-fact";
    fact.innerHTML = `<span>${escapeHTML(label)}</span><strong>${escapeHTML(value || "—")}</strong>`;
    grid.append(fact);
  });
  $("#answer-area").append(grid);
}

function setQuestionHeader(instruction, title, subtitle = "") {
  const content = $("#question-content");
  content.replaceChildren();
  const prompt = document.createElement("p");
  prompt.className = "question-instruction";
  prompt.textContent = instruction;
  const heading = document.createElement("h1");
  heading.id = "question-title";
  heading.textContent = title;
  content.append(prompt, heading);
  if (subtitle) {
    const detail = document.createElement("p");
    detail.className = "question-subtitle";
    detail.textContent = subtitle;
    content.append(detail);
  }
}

function renderVocabQuestion(task, word) {
  const labels = { intro: "First exposure", recognition: "Recognize", recall: "Active recall", form: "Word forms", listen: "Listening", sentence: "Use it" };
  setText("#skill-label", labels[task.skill]);
  setText("#memory-label", memoryLabel(word));
  if (task.skill === "intro") {
    setQuestionHeader("Look, listen, and notice the forms", wordDisplay(word), word.meaning);
    const button = document.createElement("button");
    button.className = "button button-quiet listen-button";
    button.type = "button";
    button.textContent = "Hear pronunciation";
    button.addEventListener("click", () => speakGerman(listenTextFor(word)));
    $("#answer-area").append(button);
    renderFacts(word);
    setPracticeActions({ submit: true, dontKnow: false, submitLabel: "Continue" });
  } else if (task.skill === "recognition") {
    setQuestionHeader("Choose the closest English meaning", wordDisplay(word));
    const wrong = shuffled(allVocabulary.filter(item => item.type === word.type && item.key !== word.key).map(item => item.meaning)).filter((value, index, values) => values.indexOf(value) === index).slice(0, 3);
    addChoiceButtons(shuffled([word.meaning, ...wrong]));
    setPracticeActions();
  } else if (task.skill === "recall") {
    setQuestionHeader("Produce the German from memory", word.meaning, word.type === "noun" ? "Include the noun and its article." : "Type the dictionary form.");
    if (word.type === "noun") addTextInput("answer-article", "Article", "der / die / das");
    addTextInput("answer-word", word.type === "verb" ? "Infinitive" : "German");
    setPracticeActions();
  } else if (task.skill === "form") {
    setQuestionHeader("Recover the forms", wordDisplay(word), word.meaning);
    if (word.type === "noun") addTextInput("answer-plural", "Plural");
    else if (word.type === "verb") {
      addTextInput("answer-present", "Present 3sg");
      addTextInput("answer-past", "Simple past");
      addTextInput("answer-participle", "Past participle");
    } else if (word.type === "prep") addTextInput("answer-case", "Case", "A, D, G, or A/D");
    else {
      addTextInput("answer-comparative", "Comparative");
      addTextInput("answer-superlative", "Superlative");
    }
    setPracticeActions();
  } else if (task.skill === "listen") {
    setQuestionHeader("Listen, then type exactly what you hear", "Was hörst du?", word.type === "noun" ? "Include the article." : "Use the dictionary form.");
    const listen = document.createElement("button");
    listen.className = "button button-quiet listen-button";
    listen.type = "button";
    listen.textContent = "Play German audio";
    listen.addEventListener("click", () => speakGerman(listenTextFor(word)));
    $("#answer-area").append(listen);
    addTextInput("answer-listen", "I heard", "Type the German");
    setPracticeActions();
  } else {
    setQuestionHeader("Write one useful German sentence", wordDisplay(word), `Make the meaning “${word.meaning}” clear in context.`);
    const textarea = document.createElement("textarea");
    textarea.id = "answer-sentence";
    textarea.placeholder = "Write a complete German sentence…";
    textarea.setAttribute("aria-label", "Your German sentence");
    $("#answer-area").append(textarea);
    setPracticeActions({ submit: true, dontKnow: true, submitLabel: "Review my sentence" });
  }
}

function renderExamQuestion(task) {
  const labels = { "exam-listen": "Goethe · Listening", "exam-read": "Goethe · Reading", "exam-write": "Goethe · Writing", "exam-speak": "Goethe · Speaking", "exam-cloze": "Language in context" };
  setText("#skill-label", labels[task.skill]);
  setText("#memory-label", "A1-style");
  setQuestionHeader(task.instruction, task.title, task.prompt || "");
  if (task.passage) {
    const passage = document.createElement("div");
    passage.className = "exam-passage";
    passage.textContent = task.passage;
    $("#answer-area").append(passage);
  }
  if (task.skill === "exam-listen") {
    const listen = document.createElement("button");
    listen.className = "button button-quiet listen-button";
    listen.type = "button";
    listen.textContent = "Play announcement";
    listen.addEventListener("click", () => speakGerman(task.spoken));
    $("#answer-area").append(listen);
  }
  if (task.choices) addChoiceButtons(task.choices);
  if (task.skill === "exam-write" || task.skill === "exam-speak") {
    const textarea = document.createElement("textarea");
    textarea.id = "answer-production";
    textarea.placeholder = task.skill === "exam-write" ? "Write your German message…" : "Your speech transcript appears here, or type what you said…";
    textarea.setAttribute("aria-label", task.skill === "exam-write" ? "Your German message" : "Your spoken response transcript");
    $("#answer-area").append(textarea);
    if (task.skill === "exam-speak") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "button button-quiet speak-button";
      button.textContent = "Start speaking";
      button.addEventListener("click", () => startSpeechRecognition(textarea, button));
      $("#answer-area").prepend(button);
    }
    setPracticeActions({ submit: true, dontKnow: true, submitLabel: "Show self-check" });
  } else setPracticeActions();
}

function startSpeechRecognition(textarea, button) {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { button.textContent = "Speech recognition is not available here"; button.disabled = true; textarea.focus(); return; }
  const recognition = new Recognition();
  recognition.lang = "de-DE";
  recognition.interimResults = true;
  recognition.continuous = false;
  button.textContent = "Listening…";
  recognition.onresult = event => { textarea.value = [...event.results].map(result => result[0].transcript).join(" "); };
  recognition.onerror = () => { button.textContent = "Try speaking again"; };
  recognition.onend = () => { if (!button.disabled) button.textContent = "Speak again"; };
  recognition.start();
}

function updatePracticeProgress() {
  const position = Math.min(practiceState.completedItems + 1, practiceState.totalPlanned);
  const total = Math.max(1, practiceState.totalPlanned);
  setText("#question-progress", `${position} / ${total}`);
  $("#session-progress").style.width = `${clamp((practiceState.completedItems / total) * 100, 0, 100)}%`;
}

async function loadNextQuestion() {
  processingAnswer = false;
  selectedChoice = "";
  $("#feedback-area").hidden = true;
  $("#feedback-area").className = "feedback";
  $("#answer-area").replaceChildren();
  if (!practiceState.queue.length) { await finishSession(); return; }
  practiceState.current = practiceState.queue.shift();
  const task = practiceState.current;
  updatePracticeProgress();
  if (task.kind === "vocab") renderVocabQuestion(task, vocabularyByKey.get(task.wordKey));
  else renderExamQuestion(task);
  $("#main").setAttribute("aria-busy", "false");
  questionStartedAt = Date.now();
  requestAnimationFrame(() => $("input, textarea", $("#answer-area"))?.focus());
}

function evaluateVocab(task, word) {
  if (task.skill === "recognition") return { correct: selectedChoice === word.meaning, expected: word.meaning };
  if (task.skill === "recall") {
    const wordCorrect = answersMatch($("#answer-word")?.value, word.word);
    const articleCorrect = word.type !== "noun" || answersMatch($("#answer-article")?.value, word.article);
    return { correct: wordCorrect && articleCorrect, expected: wordDisplay(word) };
  }
  if (task.skill === "listen") return { correct: answersMatch($("#answer-listen")?.value, listenTextFor(word)), expected: listenTextFor(word) };
  if (task.skill === "form") {
    let checks = [];
    if (word.type === "noun") checks = [["#answer-plural", word.plural]];
    else if (word.type === "verb") checks = [["#answer-present", word.present_3sg], ["#answer-past", word.past_3sg], ["#answer-participle", word.past_participle]];
    else if (word.type === "prep") checks = [["#answer-case", word.case]];
    else checks = [["#answer-comparative", word.comparative], ["#answer-superlative", word.superlative]];
    return { correct: checks.every(([selector, expected]) => answersMatch($(selector)?.value, expected)), expected: checks.map(([, expected]) => expected).join(" · ") };
  }
  return { correct: false, expected: wordDisplay(word) };
}

function showProductionCheck(task, word) {
  const value = $(task.kind === "exam" ? "#answer-production" : "#answer-sentence")?.value.trim();
  if (!value) return false;
  const feedback = $("#feedback-area");
  feedback.hidden = false;
  feedback.className = "feedback";
  const title = document.createElement("strong");
  title.textContent = "Self-check before you rate it";
  const detail = document.createElement("span");
  if (task.skill === "sentence") detail.textContent = `Is the sentence complete, understandable, and using “${word.word}” with the intended meaning?`;
  else if (task.skill === "exam-write") detail.textContent = `Check: ${task.checklist.join(" · ")}. Is your message understandable and appropriately polite?`;
  else detail.textContent = "Did you complete every prompt point without switching to English? Would a listener understand you?";
  feedback.replaceChildren(title, detail);
  const ratings = document.createElement("div");
  ratings.className = "self-rating";
  [[0, "Needs work"], [1, "Understandable"], [2, "Confident"]].forEach(([rating, label]) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = rating === 2 ? "button button-primary" : "button button-quiet";
    button.textContent = label;
    button.addEventListener("click", () => recordAnswer(rating > 0, rating === 0 ? 0 : rating === 1 ? 1 : 2, "Self-rated production"));
    ratings.append(button);
  });
  $("#answer-area").append(ratings);
  setPracticeActions({ submit: false, dontKnow: false });
  return true;
}

function ratingFromResult(correct, responseMs) {
  if (!correct) return 0;
  if (responseMs > 22000) return 1;
  if (responseMs < 6000) return 3;
  return 2;
}

async function recordAnswer(correct, rating, expected) {
  if (processingAnswer) return;
  processingAnswer = true;
  const task = practiceState.current;
  const word = task.kind === "vocab" ? vocabularyByKey.get(task.wordKey) : null;
  practiceState.stats.totalQs++;
  if (correct) practiceState.stats.correct++;
  else practiceState.stats.errors++;
  practiceState.completedItems++;
  if (!correct && task.retryCount < 1 && task.kind === "vocab") {
    const retry = { ...task, skill: task.skill === "form" ? "form" : "recall", retryCount: task.retryCount + 1 };
    practiceState.queue.splice(Math.min(2, practiceState.queue.length), 0, retry);
    practiceState.totalPlanned++;
  }
  const feedback = $("#feedback-area");
  feedback.hidden = false;
  feedback.className = `feedback${correct ? "" : " is-wrong"}`;
  const heading = document.createElement("strong");
  heading.textContent = task.kind === "exam" ? (correct ? "Correct." : "Not this time.") : (correct ? "Correct — let the interval grow." : "Not yet — this will return sooner.");
  const detail = document.createElement("span");
  detail.textContent = correct ? (task.kind === "exam" ? "One more exam-style decision made accurately." : rating === 3 ? "Fast, accurate recall." : "Successful retrieval.") : `Answer: ${expected}`;
  feedback.replaceChildren(heading, detail);
  $$("button.choice, input, textarea", $("#answer-area")).forEach(control => { control.disabled = true; });
  setPracticeActions({ submit: false, dontKnow: false, continueButton: true });
  const state = sessionSnapshot();
  state.queue = practiceState.queue;
  const responseMs = clamp(Date.now() - questionStartedAt, 0, 600000);
  const payload = { sessionData: state };
  if (word) payload.wordUpdate = { word: word.word, type: word.type, correct, rating, responseMs, skill: task.skill };
  try {
    await api("/api/session/sync", { method: "POST", body: JSON.stringify(payload) });
  } catch (error) {
    detail.textContent += " Progress could not be synced yet; pause before leaving.";
  }
  processingAnswer = false;
}

async function submitCurrent(dontKnow = false) {
  if (processingAnswer || !practiceState?.current) return;
  const task = practiceState.current;
  if (task.skill === "intro") {
    practiceState.completedItems++;
    practiceState.current = null;
    await loadNextQuestion();
    return;
  }
  const word = task.kind === "vocab" ? vocabularyByKey.get(task.wordKey) : null;
  if (!dontKnow && ["sentence", "exam-write", "exam-speak"].includes(task.skill)) {
    showProductionCheck(task, word);
    return;
  }
  let result;
  if (dontKnow) result = { correct: false, expected: word ? wordDisplay(word) : task.expected || "Review the prompt and try again later." };
  else if (task.kind === "exam") result = { correct: selectedChoice === task.expected, expected: task.expected };
  else result = evaluateVocab(task, word);
  const responseMs = Date.now() - questionStartedAt;
  await recordAnswer(result.correct, ratingFromResult(result.correct, responseMs), result.expected);
}

async function continuePractice() {
  if (processingAnswer) return;
  practiceState.current = null;
  await loadNextQuestion();
}

async function pauseSession() {
  if (!practiceState || processingAnswer) return;
  processingAnswer = true;
  try {
    await api("/api/session/pause", { method: "POST", body: JSON.stringify({ sessionData: sessionSnapshot() }) });
    window.location.href = "/dashboard.html";
  } catch (error) {
    alert(error.message);
    processingAnswer = false;
  }
}

async function finishSession() {
  if (processingAnswer) return;
  processingAnswer = true;
  setQuestionHeader("Saving your review schedule", "Session complete.");
  $("#answer-area").replaceChildren();
  setPracticeActions({ submit: false, dontKnow: false });
  const timeSpent = Math.max(1, Math.round((Date.now() - practiceState.startedAt) / 1000));
  try {
    const data = await api("/api/session/save", { method: "POST", body: JSON.stringify({ sessionId: practiceState.sessionId, totalQs: practiceState.stats.totalQs, correct: practiceState.stats.correct, incorrect: practiceState.stats.errors, timeSpent }) });
    localStorage.setItem("session_stats", JSON.stringify({ ...practiceState.stats, mode: practiceState.mode, expGained: data.expGained, oldExp: data.oldExp, newExp: data.newExp }));
    localStorage.removeItem("resume_active_session");
    window.location.replace("/summary.html");
  } catch (error) {
    processingAnswer = false;
    $("#feedback-area").hidden = false;
    $("#feedback-area").className = "feedback is-wrong";
    $("#feedback-area").textContent = error.message;
    setPracticeActions({ submit: true, dontKnow: false, submitLabel: "Try saving again" });
    $("#submit-answer").onclick = finishSession;
  }
}

async function initPractice() {
  window.scrollTo(0, 0);
  const mode = localStorage.getItem("session_mode") || "smart";
  const labels = { smart: "Smart review", learn: "Learn new", listen: "Listening lab", exam: "Goethe mix" };
  setText("#session-label", labels[mode] || labels.smart);
  try {
    const [vocabResponse, progressResponse] = await Promise.all([api("/api/vocabulary"), api("/api/progress")]);
    allVocabulary = flattenVocabulary(vocabResponse.vocabulary);
    vocabularyByKey = new Map(allVocabulary.map(word => [word.key, word]));
    let restored = null;
    if (localStorage.getItem("resume_active_session") === "true") {
      const saved = await api("/api/session/resume");
      if (saved.savedSession?.version === 2) restored = saved.savedSession;
    }
    const rows = progressResponse.progress || [];
    const progress = Object.fromEntries(rows.map(row => [progressKey(row), row]));
    if (restored) {
      practiceState = { ...restored, current: null, progress, startedAt: Date.now() - Math.max(0, Number(restored.stats?.elapsedMs || 0)) };
      localStorage.removeItem("resume_active_session");
    } else {
      const limit = clamp(Number(localStorage.getItem("session_word_count") || 8), 3, 40);
      const plan = createPracticePlan(mode, limit, rows);
      practiceState = {
        sessionId: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        mode,
        queue: plan.queue,
        current: null,
        progress: plan.progress,
        totalPlanned: plan.queue.length,
        completedItems: 0,
        startedAt: Date.now(),
        stats: { totalQs: 0, correct: 0, errors: 0, words: plan.selectedWords.length }
      };
    }
    if (!practiceState.queue.length) { window.location.replace("/dashboard.html"); return; }
    $("#submit-answer").addEventListener("click", () => submitCurrent(false));
    $("#dont-know").addEventListener("click", () => submitCurrent(true));
    $("#continue-button").addEventListener("click", continuePractice);
    $("#pause-button").addEventListener("click", pauseSession);
    $(".brand").addEventListener("click", event => { event.preventDefault(); pauseSession(); });
    document.addEventListener("keydown", event => {
      if (event.key === "1" && !$("#dont-know").hidden) { event.preventDefault(); submitCurrent(true); }
      if (event.key === "Enter" && event.target.tagName !== "TEXTAREA") {
        event.preventDefault();
        if (!$("#continue-button").hidden) continuePractice();
        else if (!$("#submit-answer").hidden) submitCurrent(false);
      }
    });
    await loadNextQuestion();
  } catch (error) {
    setQuestionHeader("Practice could not start", "Please return to today.", error.message);
    setPracticeActions({ submit: false, dontKnow: false });
    $("#answer-area").innerHTML = '<a class="button button-primary" href="/dashboard.html">Back to dashboard</a>';
  }
}

async function initSummary() {
  window.scrollTo(0, 0);
  try { await api("/api/me"); } catch (_) { return; }
  const stats = JSON.parse(localStorage.getItem("session_stats") || "null");
  if (!stats) { window.location.replace("/dashboard.html"); return; }
  const total = Number(stats.totalQs || 0);
  const correct = Number(stats.correct || 0);
  const accuracy = total ? Math.round((correct / total) * 100) : 0;
  setText("#res-exp", stats.expGained || 0);
  setText("#res-accuracy", `${accuracy}%`);
  setText("#res-qs", total);
  setText("#res-cor", correct);
  setText("#res-err", stats.errors || 0);
  const oldLevel = levelFor(stats.oldExp);
  const newLevel = levelFor(stats.newExp);
  setText("#level-change", newLevel > oldLevel ? `Level ${oldLevel} → ${newLevel}` : `Level ${newLevel}`);
  setText("#summary-message", accuracy >= 90 ? "Precise work. Your next intervals can safely grow." : accuracy >= 70 ? "A useful challenge. The difficult items are scheduled sooner." : "Good data: the system now knows exactly what needs another pass.");
  $("#practice-again").addEventListener("click", () => { localStorage.setItem("session_mode", "smart"); localStorage.removeItem("resume_active_session"); window.location.href = "/vocab.html"; });
}

initTheme();
if (page === "landing") initLanding();
else if (page === "login") initLogin();
else if (page === "dashboard") initDashboard();
else if (page === "practice") initPractice();
else if (page === "summary") initSummary();
