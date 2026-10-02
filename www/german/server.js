"use strict";

const express = require("express");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

const app = express();
const ROOT = __dirname;
const VOCAB_FILE = path.join(ROOT, "output.json");
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SESSION_HOURS = clampNumber(process.env.SESSION_HOURS, 1, 168, 12);
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex");

if (IS_PRODUCTION && !process.env.SESSION_SECRET) throw new Error("SESSION_SECRET is required in production.");
if (IS_PRODUCTION && !process.env.DB_PASSWORD) throw new Error("DB_PASSWORD is required in production.");
if (!process.env.SESSION_SECRET) console.warn("SESSION_SECRET is not set; sessions will be invalidated when the server restarts.");

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "vocabuser",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "german_vocab",
  waitForConnections: true,
  connectionLimit: clampNumber(process.env.DB_POOL_SIZE, 2, 30, 10),
  charset: "utf8mb4"
});

if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), geolocation=(), payment=(), microphone=(self)");
  if (IS_PRODUCTION || req.secure) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(express.json({ limit: "256kb", strict: true }));

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map(item => item.trim()).filter(Boolean).map(item => {
    const index = item.indexOf("=");
    const key = index >= 0 ? item.slice(0, index) : item;
    const value = index >= 0 ? item.slice(index + 1) : "";
    try { return [decodeURIComponent(key), decodeURIComponent(value)]; } catch (_) { return [key, value]; }
  }));
}

function signSession(userId) {
  const payload = Buffer.from(JSON.stringify({ uid: Number(userId), exp: Date.now() + SESSION_HOURS * 3600000, nonce: crypto.randomBytes(12).toString("hex") })).toString("base64url");
  const signature = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifySession(token) {
  if (!token || typeof token !== "string") return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("base64url");
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isInteger(data.uid) || data.uid < 1 || !Number.isFinite(data.exp) || data.exp <= Date.now()) return null;
    return { userId: data.uid };
  } catch (_) { return null; }
}

function setSessionCookie(req, res, token) {
  const secure = IS_PRODUCTION || req.secure;
  res.setHeader("Set-Cookie", `wortwerk_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${SESSION_HOURS * 3600}${secure ? "; Secure" : ""}`);
}

function clearSessionCookie(req, res) {
  const secure = IS_PRODUCTION || req.secure;
  res.setHeader("Set-Cookie", `wortwerk_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure ? "; Secure" : ""}`);
}

function requireAuth(req, res, next) {
  const auth = verifySession(parseCookies(req.headers.cookie).wortwerk_session);
  if (!auth) return res.status(401).json({ error: "Please sign in to continue." });
  req.auth = auth;
  res.setHeader("Cache-Control", "no-store");
  next();
}

function requirePageAuth(req, res, next) {
  const auth = verifySession(parseCookies(req.headers.cookie).wortwerk_session);
  if (!auth) return res.redirect(303, "/login.html");
  req.auth = auth;
  res.setHeader("Cache-Control", "no-store");
  next();
}

async function requireAdmin(req, res, next) {
  try {
    const [rows] = await pool.query("SELECT is_admin FROM users WHERE id = ? LIMIT 1", [req.auth.userId]);
    if (!rows.length || Number(rows[0].is_admin) !== 1) return res.status(403).json({ error: "Administrator access required." });
    next();
  } catch (error) { next(error); }
}

app.use((req, res, next) => {
  if (!["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) return next();
  const fetchSite = req.get("sec-fetch-site");
  if (fetchSite === "cross-site") return res.status(403).json({ error: "Cross-site request blocked." });
  const origin = req.get("origin");
  if (!origin) return next();
  try {
    if (new URL(origin).host !== req.get("host")) return res.status(403).json({ error: "Invalid request origin." });
  } catch (_) { return res.status(403).json({ error: "Invalid request origin." }); }
  next();
});

const rateBuckets = new Map();
function rateLimit({ windowMs, max, prefix, key }) {
  return (req, res, next) => {
    const now = Date.now();
    const bucketKey = `${prefix}:${key ? key(req) : req.ip}`;
    let bucket = rateBuckets.get(bucketKey);
    if (!bucket || bucket.resetAt <= now) bucket = { count: 0, resetAt: now + windowMs };
    bucket.count++;
    rateBuckets.set(bucketKey, bucket);
    if (bucket.count > max) {
      res.setHeader("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return res.status(429).json({ error: "Too many attempts. Please wait and try again." });
    }
    next();
  };
}
setInterval(() => { const now = Date.now(); for (const [key, bucket] of rateBuckets) if (bucket.resetAt <= now) rateBuckets.delete(key); }, 600000).unref();

const generalApiLimit = rateLimit({ windowMs: 60000, max: 180, prefix: "api" });
const loginLimit = rateLimit({ windowMs: 15 * 60000, max: 8, prefix: "login", key: req => `${req.ip}:${String(req.body?.username || "").toLowerCase()}` });
const registerLimit = rateLimit({ windowMs: 60 * 60000, max: 10, prefix: "register" });
app.use("/api", generalApiLimit);

function validUsername(value) { return typeof value === "string" && /^[A-Za-z0-9_-]{3,32}$/.test(value); }
function validPassword(value) { return typeof value === "string" && value.length >= 10 && value.length <= 128; }
function safeInteger(value, min, max, fallback = 0) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max ? number : fallback;
}

let vocabCache = null;
let vocabCacheMtime = 0;
async function readVocabulary() {
  const stat = await fs.promises.stat(VOCAB_FILE);
  if (!vocabCache || stat.mtimeMs !== vocabCacheMtime) {
    const parsed = JSON.parse(await fs.promises.readFile(VOCAB_FILE, "utf8"));
    for (const group of ["nouns", "verbs", "adjectives", "prepositions"]) if (!Array.isArray(parsed[group])) throw new Error(`Invalid vocabulary group: ${group}`);
    vocabCache = parsed;
    vocabCacheMtime = stat.mtimeMs;
  }
  return vocabCache;
}

function findVocabularyWord(vocabulary, type, word) {
  const groupMap = { noun: "nouns", verb: "verbs", adj: "adjectives", prep: "prepositions" };
  const group = groupMap[type];
  if (!group || typeof word !== "string") return null;
  return vocabulary[group].find(item => item.word === word) || null;
}

async function getUser(userId) {
  const [rows] = await pool.query("SELECT id, username, is_admin, exp, total_practiced, correct_answers, incorrect_answers FROM users WHERE id = ? LIMIT 1", [userId]);
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: Number(row.id),
    username: row.username,
    isAdmin: Number(row.is_admin) === 1,
    exp: Number(row.exp || 0),
    stats: { total: Number(row.total_practiced || 0), correct: Number(row.correct_answers || 0), incorrect: Number(row.incorrect_answers || 0) }
  };
}

let currentRawInviteCode = "";
async function generateInviteCode() {
  const rawCode = crypto.randomBytes(4).toString("hex").toUpperCase();
  const hash = await bcrypt.hash(rawCode, 10);
  await pool.query("INSERT INTO invite_codes (code_hash, expires_at) VALUES (?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))", [hash]);
  await pool.query("DELETE FROM invite_codes WHERE expires_at <= NOW()");
  currentRawInviteCode = rawCode;
}

async function ensureLearningSchema() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS vocabulary_review_state (
      user_id BIGINT NOT NULL,
      word VARCHAR(191) NOT NULL,
      word_type VARCHAR(16) NOT NULL,
      stage VARCHAR(16) NOT NULL DEFAULT 'learning',
      stability_days DOUBLE NOT NULL DEFAULT 0,
      difficulty DOUBLE NOT NULL DEFAULT 5,
      due_at DATETIME NULL,
      last_reviewed_at DATETIME NULL,
      review_count INT NOT NULL DEFAULT 0,
      lapse_count INT NOT NULL DEFAULT 0,
      correct_streak INT NOT NULL DEFAULT 0,
      last_rating TINYINT NULL,
      PRIMARY KEY (user_id, word, word_type),
      INDEX review_due_idx (user_id, due_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS practice_attempts (
      id BIGINT AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT NOT NULL,
      word VARCHAR(191) NOT NULL,
      word_type VARCHAR(16) NOT NULL,
      skill VARCHAR(32) NOT NULL,
      rating TINYINT NOT NULL,
      correct TINYINT(1) NOT NULL,
      response_ms INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX attempt_user_date_idx (user_id, created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS completed_session_keys (
      session_key VARCHAR(64) PRIMARY KEY,
      user_id BIGINT NOT NULL,
      exp_gained INT NOT NULL,
      old_exp INT NOT NULL,
      new_exp INT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX session_user_idx (user_id, created_at)
    ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
  `);
  try {
    await pool.query(`
      INSERT IGNORE INTO vocabulary_review_state
        (user_id, word, word_type, stage, stability_days, difficulty, due_at, review_count, lapse_count, correct_streak)
      SELECT user_id, word, word_type,
        CASE WHEN state = 'learned' THEN 'review' ELSE 'learning' END,
        CASE WHEN state = 'learned' THEN 3 ELSE 0.25 END,
        LEAST(10, GREATEST(1, 5 + times_wrong - (times_correct * 0.15))),
        NOW(), times_correct + times_wrong, times_wrong,
        CASE WHEN times_wrong = 0 THEN times_correct ELSE 0 END
      FROM vocabulary_progress
    `);
  } catch (error) { console.warn("Legacy progress was not migrated:", error.code || error.message); }
  const adminUsername = process.env.ADMIN_USERNAME;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (adminUsername && adminPassword && validUsername(adminUsername) && validPassword(adminPassword)) {
    const [admins] = await pool.query("SELECT id FROM users WHERE is_admin = 1 LIMIT 1");
    if (!admins.length) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await pool.query("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)", [adminUsername, passwordHash]);
    }
  }
}

app.post("/api/register", registerLimit, async (req, res, next) => {
  const { username, password, inviteCode } = req.body || {};
  if (!validUsername(username)) return res.status(400).json({ error: "Use 3–32 letters, numbers, underscores, or hyphens for the username." });
  if (!validPassword(password)) return res.status(400).json({ error: "Use a password between 10 and 128 characters." });
  if (typeof inviteCode !== "string" || !/^[A-Fa-f0-9]{8}$/.test(inviteCode.trim())) return res.status(400).json({ error: "Enter a valid invite code." });
  try {
    const [activeCodes] = await pool.query("SELECT code_hash FROM invite_codes WHERE expires_at > NOW()");
    let validHash = null;
    for (const row of activeCodes) {
      if (await bcrypt.compare(inviteCode.trim().toUpperCase(), row.code_hash)) { validHash = row.code_hash; break; }
    }
    if (!validHash) return res.status(400).json({ error: "That invite code is invalid or expired." });
    const passwordHash = await bcrypt.hash(password, 12);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 0)", [username, passwordHash]);
      await connection.query("DELETE FROM invite_codes WHERE code_hash = ?", [validHash]);
      await connection.commit();
    } catch (error) { await connection.rollback(); throw error; }
    finally { connection.release(); }
    res.status(201).json({ success: true });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ error: "That username is unavailable." });
    next(error);
  }
});

app.post("/api/login", loginLimit, async (req, res, next) => {
  const { username, password } = req.body || {};
  if (!validUsername(username) || typeof password !== "string" || password.length > 128) return res.status(401).json({ error: "Invalid username or password." });
  try {
    const [rows] = await pool.query("SELECT id, password_hash FROM users WHERE username = ? LIMIT 1", [username]);
    const valid = rows.length ? await bcrypt.compare(password, rows[0].password_hash) : await bcrypt.compare(password, "$2b$12$7EqJtq98hPqEX7fNZaFWoO5S3QoMtXv1JcYsYFpxzD7p3QeG7Q4mK");
    if (!valid || !rows.length) return res.status(401).json({ error: "Invalid username or password." });
    setSessionCookie(req, res, signSession(Number(rows[0].id)));
    res.json({ success: true });
  } catch (error) { next(error); }
});

app.post("/api/logout", requireAuth, (req, res) => { clearSessionCookie(req, res); res.json({ success: true }); });
app.get("/api/me", (req, res, next) => {
  const auth = verifySession(parseCookies(req.headers.cookie).wortwerk_session);
  if (!auth) return res.status(401).json({ error: "Not signed in." });
  req.auth = auth;
  getUser(auth.userId).then(user => user ? res.json({ user }) : (clearSessionCookie(req, res), res.status(401).json({ error: "Not signed in." }))).catch(next);
});

app.get("/api/vocabulary", requireAuth, async (req, res, next) => {
  try { res.json({ vocabulary: await readVocabulary() }); } catch (error) { next(error); }
});

app.get("/api/progress", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT word, word_type, stage, stability_days, difficulty, due_at, last_reviewed_at, review_count, lapse_count, correct_streak, last_rating FROM vocabulary_review_state WHERE user_id = ?", [req.auth.userId]);
    res.json({ progress: rows });
  } catch (error) { next(error); }
});

function calculateStreak(days) {
  if (!days.length) return 0;
  const normalized = days.map(value => new Date(`${String(value).slice(0, 10)}T00:00:00Z`)).filter(date => !Number.isNaN(date.getTime()));
  if (!normalized.length) return 0;
  const today = new Date();
  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const firstGap = Math.round((cursor - normalized[0]) / 86400000);
  if (firstGap > 1) return 0;
  if (firstGap === 1) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let streak = 0;
  for (const day of normalized) {
    if (day.getTime() === cursor.getTime()) { streak++; cursor.setUTCDate(cursor.getUTCDate() - 1); }
    else if (day < cursor) break;
  }
  return streak;
}

app.get("/api/overview", requireAuth, async (req, res, next) => {
  try {
    const vocabulary = await readVocabulary();
    const vocabularyTotal = ["nouns", "verbs", "adjectives", "prepositions"].reduce((sum, key) => sum + vocabulary[key].length, 0);
    const [user, [stateRows], [todayRows], [dayRows], [skillRows], [savedRows]] = await Promise.all([
      getUser(req.auth.userId),
      pool.query("SELECT COUNT(*) seen, SUM(stage = 'mastered') mastered, SUM(stage <> 'mastered') learning, SUM(due_at IS NULL OR due_at <= NOW()) due FROM vocabulary_review_state WHERE user_id = ?", [req.auth.userId]),
      pool.query("SELECT COUNT(*) count FROM practice_attempts WHERE user_id = ? AND DATE(created_at) = CURDATE()", [req.auth.userId]),
      pool.query("SELECT DISTINCT DATE_FORMAT(created_at, '%Y-%m-%d') day FROM practice_attempts WHERE user_id = ? ORDER BY day DESC LIMIT 366", [req.auth.userId]),
      pool.query(`SELECT
        SUM(skill IN ('recognition','listen')) input_count,
        SUM(skill = 'sentence') output_count,
        SUM(skill IN ('recall','form')) form_count,
        SUM(correct = 1 AND response_ms <= 6000) fluency_count
        FROM practice_attempts WHERE user_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`, [req.auth.userId]),
      pool.query("SELECT saved_session FROM users WHERE id = ? LIMIT 1", [req.auth.userId])
    ]);
    if (!user) return res.status(401).json({ error: "Account not found." });
    const state = stateRows[0] || {};
    const skill = skillRows[0] || {};
    const totalAnswers = user.stats.correct + user.stats.incorrect;
    res.json({
      user,
      totals: {
        vocabulary: vocabularyTotal,
        seen: Number(state.seen || 0),
        mastered: Number(state.mastered || 0),
        learning: Number(state.learning || 0),
        new: Math.max(0, vocabularyTotal - Number(state.seen || 0)),
        due: Number(state.due || 0),
        todayRecalls: Number(todayRows[0]?.count || 0),
        streak: calculateStreak(dayRows.map(row => row.day)),
        accuracy: totalAnswers ? Math.round((user.stats.correct / totalAnswers) * 100) : 0
      },
      skillBalance: { input: Number(skill.input_count || 0), output: Number(skill.output_count || 0), form: Number(skill.form_count || 0), fluency: Number(skill.fluency_count || 0) },
      hasSavedSession: Boolean(savedRows[0]?.saved_session && savedRows[0].saved_session !== "null")
    });
  } catch (error) { next(error); }
});

function validateSessionData(data) {
  if (!data || typeof data !== "object" || data.version !== 2 || !Array.isArray(data.queue) || data.queue.length > 500) return false;
  const encoded = JSON.stringify(data);
  return encoded.length <= 220000;
}

function nextReview(previous, rating) {
  const reviewCount = Number(previous?.review_count || 0) + 1;
  const priorStability = Number(previous?.stability_days || 0);
  const priorDifficulty = Number(previous?.difficulty || 5);
  const difficulty = clampNumber(priorDifficulty + (2 - rating) * 0.45, 1, 10, 5);
  let stability;
  if (!previous) stability = [0.007, 0.75, 2, 4][rating];
  else if (rating === 0) stability = Math.max(0.007, priorStability * 0.32);
  else if (rating === 1) stability = Math.max(0.75, priorStability * 1.25);
  else if (rating === 2) stability = Math.max(1, priorStability * (1.88 - difficulty * 0.025) + 1);
  else stability = Math.max(2, priorStability * (2.35 - difficulty * 0.03) + 2);
  stability = Math.min(365, stability);
  const dueAt = new Date(Date.now() + stability * 86400000);
  const lapseCount = Number(previous?.lapse_count || 0) + (rating === 0 ? 1 : 0);
  const correctStreak = rating === 0 ? 0 : Number(previous?.correct_streak || 0) + 1;
  const stage = rating > 0 && reviewCount >= 4 && stability >= 14 ? "mastered" : rating > 0 && reviewCount >= 2 ? "review" : "learning";
  return { reviewCount, stability, difficulty, dueAt, lapseCount, correctStreak, stage };
}

async function updateReviewState(connection, userId, update) {
  const vocabulary = await readVocabulary();
  const { word, type } = update;
  if (!findVocabularyWord(vocabulary, type, word)) throw Object.assign(new Error("Unknown vocabulary item."), { status: 400 });
  const rating = safeInteger(update.rating, 0, 3, update.correct ? 2 : 0);
  const correct = Boolean(update.correct) && rating > 0;
  const responseMs = safeInteger(update.responseMs, 0, 600000, 0);
  const skill = typeof update.skill === "string" && /^[a-z-]{3,24}$/.test(update.skill) ? update.skill : "recall";
  const [rows] = await connection.query("SELECT * FROM vocabulary_review_state WHERE user_id = ? AND word = ? AND word_type = ? FOR UPDATE", [userId, word, type]);
  const next = nextReview(rows[0], rating);
  await connection.query(`
    INSERT INTO vocabulary_review_state
      (user_id, word, word_type, stage, stability_days, difficulty, due_at, last_reviewed_at, review_count, lapse_count, correct_streak, last_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE stage = VALUES(stage), stability_days = VALUES(stability_days), difficulty = VALUES(difficulty),
      due_at = VALUES(due_at), last_reviewed_at = NOW(), review_count = VALUES(review_count), lapse_count = VALUES(lapse_count),
      correct_streak = VALUES(correct_streak), last_rating = VALUES(last_rating)
  `, [userId, word, type, next.stage, next.stability, next.difficulty, next.dueAt, next.reviewCount, next.lapseCount, next.correctStreak, rating]);
  await connection.query("INSERT INTO practice_attempts (user_id, word, word_type, skill, rating, correct, response_ms) VALUES (?, ?, ?, ?, ?, ?, ?)", [userId, word, type, skill, rating, correct ? 1 : 0, responseMs]);
  try {
    await connection.query(`
      INSERT INTO vocabulary_progress (user_id, word, word_type, state, times_correct, times_wrong)
      VALUES (?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE state = VALUES(state), times_correct = times_correct + VALUES(times_correct), times_wrong = times_wrong + VALUES(times_wrong)
    `, [userId, word, type, next.stage === "mastered" ? "learned" : "learning", correct ? 1 : 0, correct ? 0 : 1]);
  } catch (error) { console.warn("Legacy progress sync failed:", error.code || error.message); }
}

app.post("/api/session/sync", requireAuth, async (req, res, next) => {
  const { sessionData, wordUpdate } = req.body || {};
  if (!validateSessionData(sessionData) || (wordUpdate !== undefined && (!wordUpdate || typeof wordUpdate !== "object"))) return res.status(400).json({ error: "Invalid session update." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE users SET saved_session = ? WHERE id = ?", [JSON.stringify(sessionData), req.auth.userId]);
    if (wordUpdate) await updateReviewState(connection, req.auth.userId, wordUpdate);
    await connection.commit();
    res.json({ success: true });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

app.post("/api/session/pause", requireAuth, async (req, res, next) => {
  const { sessionData } = req.body || {};
  if (!validateSessionData(sessionData)) return res.status(400).json({ error: "Invalid saved session." });
  try { await pool.query("UPDATE users SET saved_session = ? WHERE id = ?", [JSON.stringify(sessionData), req.auth.userId]); res.json({ success: true }); }
  catch (error) { next(error); }
});

app.get("/api/session/resume", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT saved_session FROM users WHERE id = ? LIMIT 1", [req.auth.userId]);
    const raw = rows[0]?.saved_session;
    let savedSession = null;
    if (raw) { try { savedSession = typeof raw === "string" ? JSON.parse(raw) : raw; } catch (_) {} }
    res.json({ savedSession });
  } catch (error) { next(error); }
});

app.post("/api/session/save", requireAuth, async (req, res, next) => {
  const { sessionId } = req.body || {};
  const totalQs = safeInteger(req.body?.totalQs, 0, 1000, -1);
  const correct = safeInteger(req.body?.correct, 0, 1000, -1);
  const incorrect = safeInteger(req.body?.incorrect, 0, 1000, -1);
  const timeSpent = safeInteger(req.body?.timeSpent, 0, 86400, -1);
  if (typeof sessionId !== "string" || !/^[A-Za-z0-9-]{16,64}$/.test(sessionId) || [totalQs, correct, incorrect, timeSpent].includes(-1) || correct + incorrect !== totalQs) return res.status(400).json({ error: "Invalid session summary." });
  const accuracyBonus = totalQs >= 5 && correct / Math.max(1, totalQs) >= 0.9 ? 30 : 0;
  const expGained = Math.min(15000, correct * 12 + incorrect * 2 + accuracyBonus);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query("SELECT exp_gained, old_exp, new_exp FROM completed_session_keys WHERE session_key = ? AND user_id = ?", [sessionId, req.auth.userId]);
    if (existing.length) {
      await connection.rollback();
      return res.json({ success: true, expGained: Number(existing[0].exp_gained), oldExp: Number(existing[0].old_exp), newExp: Number(existing[0].new_exp), duplicate: true });
    }
    const [rows] = await connection.query("SELECT exp, total_practiced, correct_answers, incorrect_answers FROM users WHERE id = ? FOR UPDATE", [req.auth.userId]);
    if (!rows.length) { await connection.rollback(); return res.status(401).json({ error: "Account not found." }); }
    const current = rows[0];
    const oldExp = Number(current.exp || 0);
    const newExp = oldExp + expGained;
    await connection.query("INSERT INTO completed_session_keys (session_key, user_id, exp_gained, old_exp, new_exp) VALUES (?, ?, ?, ?, ?)", [sessionId, req.auth.userId, expGained, oldExp, newExp]);
    await connection.query("UPDATE users SET exp = ?, total_practiced = ?, correct_answers = ?, incorrect_answers = ?, saved_session = NULL WHERE id = ?", [newExp, Number(current.total_practiced || 0) + totalQs, Number(current.correct_answers || 0) + correct, Number(current.incorrect_answers || 0) + incorrect, req.auth.userId]);
    if (totalQs > 0) await connection.query("INSERT INTO session_records (user_id, total_questions, correct, incorrect, time_spent_seconds) VALUES (?, ?, ?, ?, ?)", [req.auth.userId, totalQs, correct, incorrect, timeSpent]);
    await connection.commit();
    res.json({ success: true, expGained, oldExp, newExp });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

app.get("/api/history", requireAuth, async (req, res, next) => {
  try {
    const [rows] = await pool.query("SELECT total_questions, correct, incorrect, time_spent_seconds, created_at FROM session_records WHERE user_id = ? ORDER BY created_at DESC LIMIT 12", [req.auth.userId]);
    res.json({ history: rows });
  } catch (error) { next(error); }
});

app.post("/api/user/reset", requireAuth, async (req, res, next) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query("UPDATE users SET exp = 0, total_practiced = 0, correct_answers = 0, incorrect_answers = 0, saved_session = NULL WHERE id = ?", [req.auth.userId]);
    await connection.query("DELETE FROM session_records WHERE user_id = ?", [req.auth.userId]);
    await connection.query("DELETE FROM vocabulary_progress WHERE user_id = ?", [req.auth.userId]);
    await connection.query("DELETE FROM vocabulary_review_state WHERE user_id = ?", [req.auth.userId]);
    await connection.query("DELETE FROM practice_attempts WHERE user_id = ?", [req.auth.userId]);
    await connection.query("DELETE FROM completed_session_keys WHERE user_id = ?", [req.auth.userId]);
    await connection.commit();
    res.json({ success: true });
  } catch (error) { await connection.rollback(); next(error); }
  finally { connection.release(); }
});

app.get("/api/admin/invite", requireAuth, requireAdmin, (req, res) => res.json({ code: currentRawInviteCode }));

let vocabWriteChain = Promise.resolve();
function cleanWordData(wordType, input) {
  if (!input || typeof input !== "object" || !fieldSets[wordType]) return null;
  const result = {};
  for (const [field, optional] of fieldSets[wordType]) {
    const value = typeof input[field] === "string" ? input[field].normalize("NFC").trim() : "";
    if ((!optional && !value) || value.length > 160 || /[<>\u0000-\u001f]/.test(value)) return null;
    result[field] = value;
  }
  if (wordType === "nouns" && !["der", "die", "das"].includes(result.article.toLowerCase())) return null;
  if (wordType === "prepositions" && !/^(A|D|G|A\/D)$/i.test(result.case)) return null;
  return result;
}

const fieldSets = {
  nouns: [["word", false], ["article", false], ["plural", false], ["meaning", false]],
  verbs: [["word", false], ["present_3sg", false], ["past_3sg", false], ["past_participle", false], ["meaning", false]],
  adjectives: [["word", false], ["comparative", true], ["superlative", true], ["meaning", false]],
  prepositions: [["word", false], ["case", false], ["meaning", false]]
};

async function mutateVocabulary({ action, wordType, wordData, oldWordName }) {
  const clean = cleanWordData(wordType, wordData);
  if (!clean || !["add", "edit"].includes(action)) throw Object.assign(new Error("Check every vocabulary field and try again."), { status: 400 });
  const vocabulary = JSON.parse(await fs.promises.readFile(VOCAB_FILE, "utf8"));
  const list = vocabulary[wordType];
  if (!Array.isArray(list)) throw new Error("Vocabulary database is invalid.");
  const duplicateIndex = list.findIndex(item => item.word.toLocaleLowerCase("de-DE") === clean.word.toLocaleLowerCase("de-DE"));
  if (action === "add") {
    if (duplicateIndex >= 0) throw Object.assign(new Error("That word already exists in this category."), { status: 409 });
    list.push(clean);
  } else {
    if (typeof oldWordName !== "string") throw Object.assign(new Error("Original word is required."), { status: 400 });
    const index = list.findIndex(item => item.word.toLocaleLowerCase("de-DE") === oldWordName.toLocaleLowerCase("de-DE"));
    if (index < 0) throw Object.assign(new Error("Word not found."), { status: 404 });
    if (duplicateIndex >= 0 && duplicateIndex !== index) throw Object.assign(new Error("That word already exists in this category."), { status: 409 });
    list[index] = clean;
  }
  const temporary = path.join(ROOT, `.output-${process.pid}-${crypto.randomBytes(6).toString("hex")}.tmp`);
  await fs.promises.writeFile(temporary, `${JSON.stringify(vocabulary, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  await fs.promises.rename(temporary, VOCAB_FILE);
  vocabCache = vocabulary;
  vocabCacheMtime = (await fs.promises.stat(VOCAB_FILE)).mtimeMs;
}

app.post("/api/admin/words", requireAuth, requireAdmin, async (req, res, next) => {
  const operation = () => mutateVocabulary(req.body || {});
  const pending = vocabWriteChain.then(operation, operation);
  vocabWriteChain = pending.catch(() => {});
  try { await pending; res.json({ success: true }); } catch (error) { next(error); }
});

app.get(["/", "/index.html"], (req, res) => res.sendFile(path.join(ROOT, "index.html")));
app.get("/login.html", (req, res) => res.sendFile(path.join(ROOT, "login.html")));
app.get(["/dashboard", "/dashboard.html"], requirePageAuth, (req, res) => res.sendFile(path.join(ROOT, "dashboard.html")));
app.get(["/practice", "/vocab.html"], requirePageAuth, (req, res) => res.sendFile(path.join(ROOT, "vocab.html")));
app.get(["/summary", "/summary.html"], requirePageAuth, (req, res) => res.sendFile(path.join(ROOT, "summary.html")));
app.get("/style.css", (req, res) => res.sendFile(path.join(ROOT, "style.css")));
app.get("/app.js", (req, res) => res.sendFile(path.join(ROOT, "app.js")));
app.get("/output.json", (req, res) => res.status(404).end());

app.use("/api", (req, res) => res.status(404).json({ error: "API route not found." }));
app.use((req, res) => res.status(404).send("Not found"));
app.use((error, req, res, next) => {
  if (res.headersSent) return next(error);
  const status = Number(error.status) >= 400 && Number(error.status) < 600 ? Number(error.status) : 500;
  if (status >= 500) console.error("Request failed:", error.code || error.message);
  res.status(status).json({ error: status >= 500 ? "The server could not complete that request." : error.message });
});

async function start() {
  await ensureLearningSchema();
  await generateInviteCode();
  setInterval(() => generateInviteCode().catch(error => console.error("Invite rotation failed:", error.code || error.message)), 4 * 60000).unref();
  app.listen(PORT, "127.0.0.1", () => console.log(`WortWerk is listening on http://127.0.0.1:${PORT}`));
}

start().catch(error => { console.error("WortWerk failed to start:", error.message); process.exitCode = 1; });
