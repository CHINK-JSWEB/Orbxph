const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cors = require('cors');


const app = express();
app.set('trust proxy', 1);

process.on('unhandledRejection', (err) => {
  console.error('[UNHANDLED REJECTION]', err);
});
app.use(helmet({
  contentSecurityPolicy: false, // naka-off muna, dahil static HTML/JS/CSS files ang gamit natin
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // para gumana ang images/screenshots
}));

// ── CORS — tanggapin lang requests mula sa sariling domain ─────
const ALLOWED_ORIGINS = [
  'https://orbitxph.asia',
  'https://www.orbitxph.asia',
  'https://orbxph.onrender.com', // panatilihin muna habang nagtatransisyon
  'http://localhost:3000', // para sa local testing
];
app.use(cors({
  origin: function (origin, callback) {
    // Payagan ang mga requests na walang origin (halimbawa curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Hindi pinapayagan ng CORS policy ang origin na ito.'));
  },
  credentials: true,
}));

// ── Rate Limiters ─────────────────────────────────────────────
// Mahigpit na limit para sa login/auth endpoints (laban sa brute-force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // max 10 attempts per window
  message: { error: 'Sobra na ang subok mo. Subukan ulit pagkalipas ng 15 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mas maluwag na limit para sa general API endpoints
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300, // max 300 requests per 15 min per IP
  message: { error: 'Sobra na ang requests mo. Subukan ulit mamaya.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Mahigpit na limit para sa order/withdrawal submissions (laban sa spam)
const submitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // max 20 submissions per hour
  message: { error: 'Sobra na ang mga submission mo. Subukan ulit mamaya.' },
  standardHeaders: true,
  legacyHeaders: false,
});
const PORT = process.env.PORT || 3000;
const USERS_FILE        = path.join(__dirname, 'users.json');
const ORDERS_FILE       = path.join(__dirname, 'orders.json');
const ARCHIVED_FILE     = path.join(__dirname, 'archived_orders.json');
const ADMIN_FILE        = path.join(__dirname, 'admin.json');
const WALLETS_FILE      = path.join(__dirname, 'wallets.json');
const REFERRALS_FILE    = path.join(__dirname, 'referrals.json');
const DAILY_LOGS_FILE   = path.join(__dirname, 'daily_logs.json');
const TASKS_FILE        = path.join(__dirname, 'tasks.json');
const TASK_LOGS_FILE    = path.join(__dirname, 'task_logs.json');
const WITHDRAWALS_FILE  = path.join(__dirname, 'withdrawals.json');
const UPLOADS_DIR       = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

app.use((req, res, next) => {
  // Skip JSON parsing sa webhook route — kailangan natin ang raw body para sa signature verification
  if (req.originalUrl === '/api/webhooks/paymongo') return next();
  express.json()(req, res, next);
});
app.use(express.static(path.join(__dirname, '..', 'public')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/api/', generalLimiter);

// ── Utility ───────────────────────────────────────────────────
async function verifyRecaptcha(token) {
  if (!token) return false;
  try {
    const params = new URLSearchParams();
    params.append('secret', process.env.RECAPTCHA_SECRET_KEY || '');
    params.append('response', token);
    const r = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      body: params,
    });
    const data = await r.json();
    return data.success === true;
  } catch (e) {
    console.error('[RECAPTCHA ERROR]', e);
    return false;
  }
}

function normalizePhone(raw) {
  let d = String(raw || '').replace(/\D/g, '');
  if (d.startsWith('63') && d.length > 10) d = d.slice(2);
  d = d.replace(/^0+/, '');
  return '+63' + d;
}

function readJSON(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch(e) { return fallback; }
}
function writeJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// ── Users (PostgreSQL) ────────────────────────────────────────
const pool = require('./db');

async function findUserByUsername(username) {
  const r = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1)', [username]);
  return r.rows[0] || null;
}
async function findUserByPhone(phone) {
  const r = await pool.query('SELECT * FROM users WHERE phone = $1', [phone]);
  return r.rows[0] || null;
}
async function getAllUsers() {
  const r = await pool.query('SELECT * FROM users ORDER BY created_at');
  return r.rows;
}

// ── Orders (PostgreSQL) ───────────────────────────────────────
function mapOrderRow(o) {
  return {
    id: o.id,
    username: o.username,
    tier: o.tier,
    price: parseFloat(o.price),
    method: o.method,
    screenshot: o.screenshot,
    status: o.status,
    feedback: o.feedback,
    approvedAt: o.approved_at,
    bonusClaimed: o.bonus_claimed,
    createdAt: o.created_at,
    paymongoPaymentIntentId: o.paymongo_payment_intent_id,
    paymongoStatus: o.paymongo_status,
  };
}

async function findOrderById(id) {
  const r = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);
  return r.rows[0] ? mapOrderRow(r.rows[0]) : null;
}
async function getAllOrders() {
  const r = await pool.query('SELECT * FROM orders ORDER BY created_at DESC');
  return r.rows.map(mapOrderRow);
}
async function getOrdersByUsername(username) {
  const r = await pool.query('SELECT * FROM orders WHERE LOWER(username) = LOWER($1) ORDER BY created_at DESC', [username]);
  return r.rows.map(mapOrderRow);
}
async function getArchivedOrdersByUsername(username) {
  const r = await pool.query('SELECT * FROM archived_orders WHERE LOWER(username) = LOWER($1) ORDER BY created_at DESC', [username]);
  return r.rows.map(mapOrderRow).map(o => ({ ...o, _archived: true }));
}

// ── Wallets (PostgreSQL) ──────────────────────────────────────
async function getWallet(username) {
  const key = username.toLowerCase();
  let r = await pool.query('SELECT * FROM wallets WHERE LOWER(username) = LOWER($1)', [key]);
  if (!r.rows[0]) {
    await pool.query(
      'INSERT INTO wallets (username, income, withdrawn, withdraw_cycle_start) VALUES ($1, 0, 0, NULL)',
      [username]
    );
    r = await pool.query('SELECT * FROM wallets WHERE LOWER(username) = LOWER($1)', [key]);
  }
  const row = r.rows[0];
  return {
    income: parseFloat(row.income),
    withdrawn: parseFloat(row.withdrawn),
    withdrawCycleStart: row.withdraw_cycle_start,
  };
}

async function creditWallet(username, amount, note, type) {
  await pool.query(
    `INSERT INTO wallets (username, income, withdrawn)
     VALUES ($1, $2, 0)
     ON CONFLICT (username) DO UPDATE SET income = wallets.income + $2, updated_at = NOW()`,
    [username, amount]
  );
  await pool.query(
    `INSERT INTO wallet_transactions (username, type, amount, description) VALUES ($1, $2, $3, $4)`,
    [username, type || 'credit', amount, note || '']
  );
  console.log(`[WALLET CREDIT] ${username} +₱${amount} (${note})`);
}

async function logWalletTransaction(username, type, amount, description) {
  await pool.query(
    `INSERT INTO wallet_transactions (username, type, amount, description) VALUES ($1, $2, $3, $4)`,
    [username, type, amount, description || '']
  );
}

function mapTransactionRow(t) {
  return {
    id: t.id,
    type: t.type,
    amount: parseFloat(t.amount),
    description: t.description,
    createdAt: t.created_at,
  };
}

app.get('/api/transactions/:username', requireUser, async (req, res) => {
  const limit  = Math.min(parseInt(req.query.limit, 10) || 30, 200);
  const offset = parseInt(req.query.offset, 10) || 0;
  const type   = req.query.type;

  let query = 'SELECT * FROM wallet_transactions WHERE LOWER(username) = LOWER($1)';
  const params = [req.params.username];

  if (type === 'rewards') {
    query += ` AND type IN ('daily_reward','referral_commission','signup_bonus','task_reward','survey_reward','admin_credit')`;
  } else if (type === 'withdrawals') {
    query += ` AND type IN ('withdrawal','withdrawal_refund')`;
  }

  query += ' ORDER BY created_at DESC LIMIT $2 OFFSET $3';
  params.push(limit, offset);

  const r = await pool.query(query, params);
  res.json(r.rows.map(mapTransactionRow));
});

// ── Referrals (PostgreSQL) ────────────────────────────────────
function hashUsername(username) {
  let hash = 5381;
  const str = username.toLowerCase();
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  return Math.abs(hash).toString(36).toUpperCase().padStart(4, '0').slice(-4);
}

function generateReferralCode(username) {
  const tag  = username.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const hash = hashUsername(username);
  return `ORBX-${tag}-${hash}`;
}

async function isCodeUnique(code, excludeUsername) {
  const r = await pool.query(
    'SELECT username FROM referrals WHERE code = $1 AND LOWER(username) != LOWER($2)',
    [code, excludeUsername || '']
  );
  return r.rows.length === 0;
}

async function generateUniqueCode(username) {
  const baseCode = generateReferralCode(username);
  if (await isCodeUnique(baseCode, username)) return baseCode;
  for (let i = 2; i <= 99; i++) {
    const fallback = `${baseCode}-${i}`;
    if (await isCodeUnique(fallback, username)) return fallback;
  }
  return `ORBX-${username.toUpperCase().slice(0, 4)}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

async function getReferralByUsername(username) {
  const r = await pool.query('SELECT * FROM referrals WHERE LOWER(username) = LOWER($1)', [username]);
  return r.rows[0] || null;
}

async function getReferralInvites(username) {
  const r = await pool.query(
    `SELECT invited_username AS username, order_id AS "orderId", tier, price, level, reward, credited_at AS "creditedAt"
     FROM referral_invites WHERE LOWER(referrer_username) = LOWER($1) ORDER BY credited_at`,
    [username]
  );
  return r.rows.map(row => ({
    ...row,
    price: parseFloat(row.price),
    reward: parseFloat(row.reward),
  }));
}

async function getOrCreateReferral(username) {
  let entry = await getReferralByUsername(username);
  if (!entry) {
    const code = await generateUniqueCode(username);
    await pool.query('INSERT INTO referrals (username, code) VALUES ($1, $2)', [username, code]);
    console.log(`[REFERRAL] Generated code for ${username}: ${code}`);
    entry = { username, code };
  }
  const invites = await getReferralInvites(username);
  return { code: entry.code, invites };
}

// ── Daily Logs ────────────────────────────────────────────────

const DAILY_REWARD_RATE    = 0.10;
const RANKS = [
  { name: 'SVIP',    minInvites: 300, l1Rate: 0.40 },
  { name: 'VIP',     minInvites: 150, l1Rate: 0.35 },
  { name: 'Premium', minInvites: 50,  l1Rate: 0.30 },
  { name: 'Regular', minInvites: 0,   l1Rate: 0.25 },
];
const L2_RATE = 0.10;
const L3_RATE = 0.05;

async function getUserRank(username) {
  const entry = await getOrCreateReferral(username);
  const directCount = (entry.invites || []).filter(i => (i.level || 1) === 1).length;
  const rank = RANKS.find(r => directCount >= r.minInvites) || RANKS[RANKS.length - 1];
  const nextRank = RANKS.slice().reverse().find(r => r.minInvites > directCount);
  return {
    rank: rank.name,
    l1Rate: rank.l1Rate,
    directCount,
    nextRank: nextRank ? nextRank.name : null,
    nextRankNeeded: nextRank ? nextRank.minInvites - directCount : 0,
    nextRankAt: nextRank ? nextRank.minInvites : null,
  };
}

// ── Withdrawals (PostgreSQL) ──────────────────────────────────
function mapWithdrawalRow(w) {
  return {
    id: w.id,
    username: w.username,
    amount: parseFloat(w.amount),
    accountNumber: w.account_number,
    accountName: w.account_name,
    method: w.method,
    notes: w.notes,
    status: w.status,
    feedback: w.feedback,
    createdAt: w.created_at,
    processedAt: w.processed_at,
  };
}

async function findWithdrawalById(id) {
  const r = await pool.query('SELECT * FROM withdrawals WHERE id = $1', [id]);
  return r.rows[0] ? mapWithdrawalRow(r.rows[0]) : null;
}
async function getWithdrawalsByUsername(username) {
  const r = await pool.query(
    'SELECT * FROM withdrawals WHERE LOWER(username) = LOWER($1) ORDER BY created_at DESC',
    [username]
  );
  return r.rows.map(mapWithdrawalRow);
}
async function getAllWithdrawals() {
  const r = await pool.query('SELECT * FROM withdrawals ORDER BY created_at DESC');
  return r.rows.map(mapWithdrawalRow);
}
async function hasPendingWithdrawal(username) {
  const r = await pool.query(
    "SELECT id FROM withdrawals WHERE LOWER(username) = LOWER($1) AND status = 'pending'",
    [username]
  );
  return r.rows.length > 0;
}
const REFERRAL_SIGNUP_BONUS = 100;
const MIN_WITHDRAWAL    = 300;
const MIN_REFERRALS     = 2;
const REFERRAL_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

async function getWithdrawEligibility(username) {
  const wallet  = await getWallet(username);
  const balance = parseFloat((wallet.income - wallet.withdrawn).toFixed(2));
  const referralEntry = await getOrCreateReferral(username);
  const invites = referralEntry.invites || [];
  const cycleStart = wallet.withdrawCycleStart || null;

  const level1Invites = invites.filter(i => (i.level === 1 || i.level === undefined));
  const countedInvites = cycleStart
    ? level1Invites.filter(i => new Date(i.creditedAt).getTime() >= new Date(cycleStart).getTime())
    : level1Invites;

  const invitesCount = countedInvites.length;
  const referralsMet = invitesCount >= MIN_REFERRALS;
  const balanceMet   = balance >= MIN_WITHDRAWAL;
  const nextUnlockAt = cycleStart
    ? new Date(new Date(cycleStart).getTime() + REFERRAL_CYCLE_MS).toISOString()
    : null;
  const hasPending = await hasPendingWithdrawal(username);

  return {
    eligible: referralsMet && balanceMet && !hasPending,
    balance,
    minWithdrawal: MIN_WITHDRAWAL,
    invitesCount,
    invitesNeeded: MIN_REFERRALS,
    referralsMet,
    balanceMet,
    cycleStart,
    nextUnlockAt,
    hasPendingWithdrawal: hasPending,
  };
}

// ── Tasks (PostgreSQL) ────────────────────────────────────────
function mapTaskRow(t) {
  return {
    id: t.id,
    title: t.title,
    description: t.description,
    reward: parseFloat(t.reward),
    active: t.active,
    createdAt: t.created_at,
  };
}
async function getAllTasks() {
  const r = await pool.query('SELECT * FROM tasks ORDER BY created_at');
  return r.rows.map(mapTaskRow);
}
async function findTaskById(id) {
  const r = await pool.query('SELECT * FROM tasks WHERE id = $1', [id]);
  return r.rows[0] ? mapTaskRow(r.rows[0]) : null;
}
async function getCompletedTaskIds(username) {
  const r = await pool.query('SELECT task_id FROM task_logs WHERE LOWER(username) = LOWER($1)', [username]);
  return r.rows.map(row => row.task_id);
}
async function getTaskLogsByUsername(username) {
  const r = await pool.query(
    `SELECT task_id AS "taskId", completed_at AS "completedAt", reward
     FROM task_logs WHERE LOWER(username) = LOWER($1) ORDER BY completed_at`,
    [username]
  );
  return r.rows.map(row => ({ ...row, reward: parseFloat(row.reward) }));
}
// ── Daily Reward Scheduler ────────────────────────────────────
async function processDailyRewards() {
  const now = Date.now();
  const r = await pool.query('SELECT * FROM daily_logs');
  for (const log of r.rows) {
    try {
      const lastCredited = new Date(log.last_credited_at).getTime();
      const elapsed = now - lastCredited;
      if (elapsed >= 24 * 60 * 60 * 1000) {
        await creditWallet(log.username, parseFloat(log.daily_reward), `Daily reward - ${log.tier}`, 'daily_reward');
        const newTotal = parseFloat((parseFloat(log.total_credited || 0) + parseFloat(log.daily_reward)).toFixed(2));
        await pool.query(
          'UPDATE daily_logs SET last_credited_at = NOW(), total_credited = $1 WHERE order_id = $2',
          [newTotal, log.order_id]
        );

        await createNotification(
          log.username,
          'daily_reward',
          'Daily Reward Credited',
          `You received your daily reward of ₱${Number(log.daily_reward).toLocaleString()} from your ${log.tier} package.`
        );

        console.log(`[DAILY REWARD] ${log.username} +₱${log.daily_reward} (${log.tier})`);
      }
    } catch (err) {
      console.error(`[DAILY REWARD ERROR] username=${log.username} order=${log.order_id}:`, err.message);
    }
  }
}
setInterval(processDailyRewards, 60 * 1000);


// ── Survey/Trivia System (PostgreSQL + Open Trivia DB) ─────────
const SURVEY_REWARD = 0.50;
const SURVEY_QUESTIONS_PER_DAY = 10;

function decodeHtmlEntities(str) {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&eacute;/g, 'é')
    .replace(/&ouml;/g, 'ö')
    .replace(/&uuml;/g, 'ü');
}

function shuffleArray(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchAndCacheTodaysQuestions() {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const existing = await pool.query(
    'SELECT * FROM survey_questions WHERE question_date = $1 ORDER BY id',
    [today]
  );
  if (existing.rows.length >= SURVEY_QUESTIONS_PER_DAY) {
    return existing.rows;
  }

  try {
    const res = await fetch(`https://opentdb.com/api.php?amount=${SURVEY_QUESTIONS_PER_DAY}&type=multiple`);
    const data = await res.json();
    if (data.response_code !== 0 || !data.results) return existing.rows;

    for (const q of data.results) {
      const question = decodeHtmlEntities(q.question);
      const correctAnswer = decodeHtmlEntities(q.correct_answer);
      const options = shuffleArray([
        correctAnswer,
        ...q.incorrect_answers.map(decodeHtmlEntities)
      ]);
      await pool.query(
        'INSERT INTO survey_questions (question_date, question, correct_answer, options) VALUES ($1, $2, $3, $4)',
        [today, question, correctAnswer, JSON.stringify(options)]
      );
    }
    const updated = await pool.query(
      'SELECT * FROM survey_questions WHERE question_date = $1 ORDER BY id',
      [today]
    );
    return updated.rows;
  } catch (err) {
    console.error('[SURVEY FETCH ERROR]', err);
    return existing.rows;
  }
}

// ── Notifications (PostgreSQL) ────────────────────────────────
async function createNotification(username, type, title, message) {
  await pool.query(
    'INSERT INTO notifications (username, type, title, message) VALUES ($1, $2, $3, $4)',
    [username, type, title, message]
  );
}

async function getNotifications(username, limit = 50) {
  const r = await pool.query(
    'SELECT * FROM notifications WHERE LOWER(username) = LOWER($1) ORDER BY created_at DESC LIMIT $2',
    [username, limit]
  );
  return r.rows;
}

async function getUnreadCount(username) {
  const r = await pool.query(
    'SELECT COUNT(*) FROM notifications WHERE LOWER(username) = LOWER($1) AND read = false',
    [username]
  );
  return parseInt(r.rows[0].count, 10);
}

// ── Admin (PostgreSQL) ────────────────────────────────────────
const adminTokens = new Map();
const userTokens = new Map(); // dito nakatago ang mga valid na "pass" ng users
const gateTokens = new Map();
const gateAttempts = new Map(); // IP-based lockout tracking
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours
const GATE_TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes
const GATE_HASH = '$2a$10$1nb6wynORZ38m.qoN52StONr8yEYwB/vCfxiEYohUXDJV91X1yIAu';
const GATE_MAX_TRIES = 5;
const GATE_LOCKOUT_MS = 15 * 60 * 1000;

function requireGateToken(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !gateTokens.has(token))
    return res.status(401).json({ error: 'Kailangan munang mag-verify ng access code.' });
  const created = gateTokens.get(token);
  if (Date.now() - created > GATE_TOKEN_TTL_MS) {
    gateTokens.delete(token);
    return res.status(401).json({ error: 'Nag-expire na ang gate session. Mag-verify ulit.' });
  }
  next();
}

function requireUser(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !userTokens.has(token))
    return res.status(401).json({ error: 'Hindi naka-login. Mag-login muli.' });

  const session = userTokens.get(token);
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    userTokens.delete(token);
    return res.status(401).json({ error: 'Nag-expire na ang session. Mag-login muli.' });
  }

  const paramUsername = req.params.username || (req.body && req.body.username);

  if (paramUsername && paramUsername.toLowerCase() !== session.username.toLowerCase())
    return res.status(403).json({ error: 'Bawal i-access ang account ng iba.' });

  req.authUser = session.username;
  next();
}

async function getAdminCount() {
  const r = await pool.query('SELECT COUNT(*) FROM admins');
  return parseInt(r.rows[0].count, 10);
}
async function findAdminByUsername(username) {
  const r = await pool.query('SELECT * FROM admins WHERE LOWER(username) = LOWER($1)', [username]);
  return r.rows[0] || null;
}
async function getAllAdmins() {
  const r = await pool.query('SELECT username, created_at FROM admins ORDER BY created_at');
  return r.rows;
}


function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !adminTokens.has(token))
    return res.status(401).json({ error: 'Hindi naka-login bilang admin.' });
  const session = adminTokens.get(token);
  if (Date.now() - session.createdAt > TOKEN_TTL_MS) {
    adminTokens.delete(token);
    return res.status(401).json({ error: 'Nag-expire na ang admin session. Mag-login muli.' });
  }
  req.adminUser = session;
  next();
}
// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// ── Gate verification (bago pa ang admin login) ────────────────
app.post('/api/admin/gate', authLimiter, async (req, res) => {
  const ip = req.ip || 'unknown';
  const record = gateAttempts.get(ip) || { tries: 0, lockedUntil: null };

  if (record.lockedUntil && record.lockedUntil > Date.now()) {
    const minutesLeft = Math.ceil((record.lockedUntil - Date.now()) / 60000);
    return res.status(403).json({ error: `Naka-lock muna dahil sa sobrang maling attempts. Subukan ulit pagkalipas ng ${minutesLeft} minuto.` });
  }

  const { code, captchaToken } = req.body || {};
  if (!code) return res.status(400).json({ error: 'Kailangan ng access code.' });
  if (!(await verifyRecaptcha(captchaToken)))
    return res.status(400).json({ error: 'Hindi ma-verify ang CAPTCHA. Subukan ulit.' });

  const match = await bcrypt.compare(code, GATE_HASH);
  if (!match) {
    record.tries += 1;
    if (record.tries >= GATE_MAX_TRIES) {
      record.lockedUntil = Date.now() + GATE_LOCKOUT_MS;
      gateAttempts.set(ip, record);
      return res.status(403).json({ error: 'Naka-lock na ang access dahil sa sobrang maling attempts. Subukan ulit pagkalipas ng 15 minuto.' });
    }
    gateAttempts.set(ip, record);
    return res.status(401).json({ error: `Maling access code. ${GATE_MAX_TRIES - record.tries} attempt(s) na lang.` });
  }

  gateAttempts.delete(ip);
  const token = crypto.randomBytes(24).toString('hex');
  gateTokens.set(token, Date.now());
  res.json({ success: true, gateToken: token });
});

// ── Public config (site keys lang, hindi secrets) ──────────────
app.get('/api/config', (req, res) => {
  res.json({ recaptchaSiteKey: process.env.RECAPTCHA_SITE_KEY || '' });
});

// ── Admin auth ────────────────────────────────────────────────
app.get('/api/admin/exists', requireGateToken, async (req, res) => {
  const count = await getAdminCount();
  res.json({ exists: count > 0 });
});

app.post('/api/admin/setup', authLimiter, requireGateToken, async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Lahat ng fields kailangan punan.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang password.' });
  const existing = await findAdminByUsername(username);
  if (existing)
    return res.status(409).json({ error: 'Ginagamit na ang username na iyan.' });
  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query('INSERT INTO admins (username, password_hash) VALUES ($1, $2)', [username, passwordHash]);
  res.json({ success: true });
});

const ADMIN_MAX_LOGIN_ATTEMPTS = 5;
const ADMIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

app.post('/api/admin/login', authLimiter, requireGateToken, async (req, res) => {
  const { username, password, captchaToken } = req.body || {};
  if (!(await verifyRecaptcha(captchaToken)))
    return res.status(400).json({ error: 'Hindi ma-verify ang CAPTCHA. Subukan ulit.' });
  const count = await getAdminCount();
  if (!count)
    return res.status(404).json({ error: 'Wala pang admin account.' });
  const admin = await findAdminByUsername(username || '');
  if (!admin) return res.status(401).json({ error: 'Maling username o password.' });

  if (admin.locked_until && new Date(admin.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(admin.locked_until) - new Date()) / 60000);
    return res.status(403).json({
      error: `Naka-lock muna ang admin account dahil sa sobrang failed attempts. Subukan ulit pagkalipas ng ${minutesLeft} minuto.`
    });
  }

  const match = await bcrypt.compare(password, admin.password_hash);
  if (!match) {
    const newAttempts = (admin.failed_login_attempts || 0) + 1;
    if (newAttempts >= ADMIN_MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + ADMIN_LOCKOUT_DURATION_MS);
      await pool.query(
        'UPDATE admins SET failed_login_attempts = $1, locked_until = $2 WHERE username = $3',
        [newAttempts, lockUntil, admin.username]
      );
      return res.status(403).json({
        error: `Naka-lock ang admin account dahil sa sobrang maling password. Subukan ulit pagkalipas ng 15 minuto.`
      });
    } else {
      await pool.query('UPDATE admins SET failed_login_attempts = $1 WHERE username = $2', [newAttempts, admin.username]);
      const attemptsLeft = ADMIN_MAX_LOGIN_ATTEMPTS - newAttempts;
      return res.status(401).json({ error: `Maling username o password. ${attemptsLeft} attempt(s) na lang bago ma-lock ang account.` });
    }
  }

  if (admin.failed_login_attempts > 0 || admin.locked_until) {
    await pool.query('UPDATE admins SET failed_login_attempts = 0, locked_until = NULL WHERE username = $1', [admin.username]);
  }

  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, { username: admin.username, createdAt: Date.now() });
  res.json({ success: true, token, username: admin.username });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  adminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/list', requireAdmin, async (req, res) => {
  const admins = await getAllAdmins();
  res.json(admins.map(a => ({ username: a.username, createdAt: a.created_at })));
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  const withBalance = await Promise.all(users.map(async (u) => {
    const wallet  = await getWallet(u.username);
    const balance = parseFloat((wallet.income - wallet.withdrawn).toFixed(2));
    return {
      username:  u.username,
      phone:     u.phone,
      createdAt: u.created_at,
      blocked:   !!u.blocked,
      income:    wallet.income,
      withdrawn: wallet.withdrawn,
      balance:   balance,
    };
  }));
  res.json(withBalance);
});

app.patch('/api/admin/users/:username/block', requireAdmin, async (req, res) => {
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const newBlocked = !user.blocked;
  await pool.query('UPDATE users SET blocked = $1 WHERE username = $2', [newBlocked, user.username]);

  if (newBlocked) {
    await createNotification(
      user.username,
      'account_blocked',
      'Account Blocked',
      `Your account has been blocked. Please contact Customer Service for assistance.`
    );
  } else {
    await createNotification(
      user.username,
      'account_unblocked',
      'Account Unblocked',
      `Your account has been unblocked. You may now log in and use your account normally.`
    );
  }

  res.json({ success: true, blocked: newBlocked });
});

// ADMIN: Reset a user's password
app.patch('/api/admin/users/:username/reset-password', requireAdmin, async (req, res) => {
  const { newPassword } = req.body || {};
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang bagong password.' });
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, user.username]);
  console.log(`[ADMIN RESET PASSWORD] ${user.username} password reset by admin.`);
  res.json({ success: true });
});

// ── Customer auth ─────────────────────────────────────────────
app.post('/api/signup', authLimiter, async (req, res) => {
  const { username, phone: rawPhone, password, referralCode } = req.body || {};
  if (!username || !rawPhone || !password)
    return res.status(400).json({ error: 'Lahat ng fields kailangan punan.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Dapat hindi bababa sa 6 characters ang password.' });
  const phone = normalizePhone(rawPhone);

  const existingUsername = await findUserByUsername(username);
  if (existingUsername)
    return res.status(409).json({ error: 'Ginagamit na ang username na iyan.' });

  const existingPhone = await findUserByPhone(phone);
  if (existingPhone)
    return res.status(409).json({ error: 'May account na rehistrado sa number na iyan.' });

  let referredBy = null;
  if (referralCode) {
    const codeUpper = referralCode.trim().toUpperCase();
    const inviterRow = await pool.query('SELECT username FROM referrals WHERE code = $1', [codeUpper]);
    if (inviterRow.rows[0]) referredBy = inviterRow.rows[0].username;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await pool.query(
    `INSERT INTO users (username, phone, password_hash, referred_by, blocked)
     VALUES ($1, $2, $3, $4, false)`,
    [username, phone, passwordHash, referredBy]
  );
  await getOrCreateReferral(username);

  if (referredBy) {
  await creditWallet(username, REFERRAL_SIGNUP_BONUS, `Signup bonus - referred by ${referredBy}`, 'signup_bonus');
  console.log(`[SIGNUP BONUS] ${username} +₱${REFERRAL_SIGNUP_BONUS} (referred by ${referredBy})`);

  await createNotification(
    username,
    'signup_bonus',
    'Welcome Bonus Received',
    `You received a ₱${REFERRAL_SIGNUP_BONUS} welcome bonus for signing up with a referral code!`
  );

  await createNotification(
    referredBy,
    'new_referral',
    'New Referral Joined',
    `${username} just joined using your referral code!`
  );
}

  res.json({ success: true, referralBonus: referredBy ? REFERRAL_SIGNUP_BONUS : 0 });
});

const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

app.post('/api/login', authLimiter, async (req, res) => {
  const { phone: rawPhone, password, captchaToken } = req.body || {};
  if (!rawPhone || !password)
    return res.status(400).json({ error: 'Kailangan ng number at password.' });
  if (!(await verifyRecaptcha(captchaToken)))
    return res.status(400).json({ error: 'Hindi ma-verify ang CAPTCHA. Subukan ulit.' });
  const phone = normalizePhone(rawPhone);
  const user  = await findUserByPhone(phone);
  if (!user) return res.status(401).json({ error: 'Walang account na may ganitong number.' });
  if (user.blocked)
    return res.status(403).json({ error: 'Ang account mo ay na-block. Makipag-ugnayan sa Customer Service.' });

  // Check kung naka-lock ang account dahil sa sobrang failed attempts
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
    return res.status(403).json({
      error: `Naka-lock muna ang account mo dahil sa sobrang failed attempts. Subukan ulit pagkalipas ng ${minutesLeft} minuto.`
    });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    const newAttempts = (user.failed_login_attempts || 0) + 1;
    if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
      await pool.query(
        'UPDATE users SET failed_login_attempts = $1, locked_until = $2 WHERE username = $3',
        [newAttempts, lockUntil, user.username]
      );
      return res.status(403).json({
        error: `Naka-lock ang account mo dahil sa sobrang maling password. Subukan ulit pagkalipas ng 15 minuto.`
      });
    } else {
      await pool.query('UPDATE users SET failed_login_attempts = $1 WHERE username = $2', [newAttempts, user.username]);
      const attemptsLeft = MAX_LOGIN_ATTEMPTS - newAttempts;
      return res.status(401).json({ error: `Maling password. ${attemptsLeft} attempt(s) na lang bago ma-lock ang account.` });
    }
  }

  // Successful login — i-reset ang failed attempts
  if (user.failed_login_attempts > 0 || user.locked_until) {
    await pool.query('UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE username = $1', [user.username]);
  }

  const token = crypto.randomBytes(24).toString('hex');
  userTokens.set(token, { username: user.username, createdAt: Date.now() });

  res.json({ success: true, username: user.username, phone: user.phone, token });
});

// ── Orders ────────────────────────────────────────────────────
const supabase = require('./supabaseClient');
// ── PayMongo Integration ────────────────────────────────────────
const PAYMONGO_SECRET_KEY = process.env.PAYMONGO_SECRET_KEY;
const PAYMONGO_API = 'https://api.paymongo.com/v1';

function paymongoAuthHeader() {
  return 'Basic ' + Buffer.from(PAYMONGO_SECRET_KEY + ':').toString('base64');
}

async function paymongoRequest(endpoint, method, body) {
  const res = await fetch(`${PAYMONGO_API}${endpoint}`, {
    method,
    headers: {
      'Authorization': paymongoAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    console.error('[PAYMONGO ERROR]', JSON.stringify(data));
    throw new Error(data.errors?.[0]?.detail || 'PayMongo request failed.');
  }
  return data;
}

// Gumawa ng Payment Intent + QRPh Payment Method, i-attach, ibalik ang QR data
async function createQrPhPayment(amountPesos, description) {
  const amountCentavos = Math.round(amountPesos * 100);

  const intent = await paymongoRequest('/payment_intents', 'POST', {
    data: {
      attributes: {
        amount: amountCentavos,
        payment_method_allowed: ['qrph'],
        payment_method_options: { qrph: {} },
        currency: 'PHP',
        description: description || 'ORB-X PH Order',
        capture_type: 'automatic',
      },
    },
  });

  const paymentIntentId = intent.data.id;
  const clientKey = intent.data.attributes.client_key;

  const method = await paymongoRequest('/payment_methods', 'POST', {
    data: { attributes: { type: 'qrph' } },
  });

  const attached = await paymongoRequest(`/payment_intents/${paymentIntentId}/attach`, 'POST', {
    data: {
      attributes: {
        payment_method: method.data.id,
        client_key: clientKey,
      },
    },
  });

  const nextAction = attached.data.attributes.next_action;
  const qrImageUrl = nextAction?.code?.image_url || nextAction?.redirect?.url || null;

  return {
    paymentIntentId,
    status: attached.data.attributes.status,
    qrImageUrl,
  };
}

async function retrievePaymentIntent(paymentIntentId) {
  const r = await paymongoRequest(`/payment_intents/${paymentIntentId}`, 'GET');
  return r.data;
}

function verifyPaymongoSignature(rawBody, signatureHeader, webhookSecret) {
  if (!signatureHeader) return false;
  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => p.split('='))
  );
  const timestamp = parts.t;
  const signature = parts.te || parts.li; // 'te' = test mode, 'li' = live mode
  const payload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
  return expected === signature;
}
const SCREENSHOTS_BUCKET = 'order-screenshots';

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('ONLY_IMAGES'));
    }
    cb(null, true);
  }
});

function handleUploadErrors(err, req, res, next) {
  if (err) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Masyadong malaki ang file. Max 8MB lang.' });
    }
    if (err.message === 'ONLY_IMAGES') {
      return res.status(400).json({ error: 'Larawan lang (JPG/PNG) ang pwedeng i-attach. Bawal ang video o ibang file type.' });
    }
    return res.status(400).json({ error: 'Hindi na-upload ang file. Subukan ulit.' });
  }
  next();
}

function uploadSingle(fieldName) {
  return (req, res, next) => {
    upload.single(fieldName)(req, res, (err) => handleUploadErrors(err, req, res, next));
  };
}

async function isRealImage(buffer) {
  if (!buffer || buffer.length < 12) return false;

  // JPEG: starts with FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return true;

  // PNG: starts with 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47 &&
      buffer[4] === 0x0D && buffer[5] === 0x0A && buffer[6] === 0x1A && buffer[7] === 0x0A) return true;

  // GIF: starts with GIF87a or GIF89a
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 &&
      buffer[3] === 0x38 && (buffer[4] === 0x37 || buffer[4] === 0x39) && buffer[5] === 0x61) return true;

  // WEBP: starts with RIFF....WEBP
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return true;

  return false;
}

async function uploadScreenshotToSupabase(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `order-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const { error } = await supabase.storage
    .from(SCREENSHOTS_BUCKET)
    .upload(filename, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  const { data } = supabase.storage.from(SCREENSHOTS_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

async function deleteScreenshotFromSupabase(screenshotUrl) {
  if (!screenshotUrl) return;
  try {
    const filename = screenshotUrl.split('/').pop();
    await supabase.storage.from(SCREENSHOTS_BUCKET).remove([filename]);
  } catch (err) {
    console.error('[SCREENSHOT DELETE ERROR]', err);
  }
}

const VALID_PACKAGES = {
  'Ordinary':  200,
  'Regular':   500,
  'Premium':   700,
  'Deluxe':    1000,
  'Elite':     1500,
  'Supreme':   5000,
  'Legendary': 10000,
};

app.post('/api/orders', submitLimiter, uploadSingle('screenshot'), requireUser, async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Walang na-attach na screenshot.' });
  if (!(await isRealImage(req.file.buffer)))
    return res.status(400).json({ error: 'Invalid na file. Larawan lang (JPG/PNG) ang tinatanggap.' });
  const { username, tier, method } = req.body || {};

  if (!VALID_PACKAGES.hasOwnProperty(tier))
    return res.status(400).json({ error: 'Invalid na package/tier.' });
  const price = VALID_PACKAGES[tier];

  const id = Date.now().toString(36);
  let screenshot;
  try {
    screenshot = await uploadScreenshotToSupabase(req.file);
  } catch (err) {
    console.error('[SCREENSHOT UPLOAD ERROR]', err);
    return res.status(500).json({ error: 'Hindi na-upload ang screenshot. Subukan ulit.' });
  }
  await pool.query(
    `INSERT INTO orders (id, username, tier, price, method, screenshot, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [id, username || 'Unknown', tier || '—', Number(price) || 0, method || 'GCash', screenshot]
  );
  console.log(`[NEW ORDER] ${username} -> ${tier} (₱${price}) via ${method}`);
  res.json({ success: true, orderId: id });
});

// CLIENT: My Orders — kasama ang archived
app.get('/api/orders/mine/:username', requireUser, async (req, res) => {
  const active = await getOrdersByUsername(req.params.username);
  const archived = await getArchivedOrdersByUsername(req.params.username);
  const combined = [...active, ...archived]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(combined);
});

// CLIENT: Create QR Ph payment (bago pa mag-order — walang screenshot na kailangan)
app.post('/api/orders/paymongo/create', submitLimiter, requireUser, async (req, res) => {
  const { username, tier } = req.body || {};

  if (!VALID_PACKAGES.hasOwnProperty(tier))
    return res.status(400).json({ error: 'Invalid na package/tier.' });
  const price = VALID_PACKAGES[tier];

  try {
    const payment = await createQrPhPayment(price, `${tier} package - ${username}`);

    const id = Date.now().toString(36);
    await pool.query(
      `INSERT INTO orders (id, username, tier, price, method, status, paymongo_payment_intent_id, paymongo_status)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
      [id, username, tier, price, 'GCash (QR Ph)', payment.paymentIntentId, payment.status]
    );

    console.log(`[QR PH CREATED] ${username} -> ${tier} (₱${price}) intent=${payment.paymentIntentId}`);
    res.json({ success: true, orderId: id, qrImageUrl: payment.qrImageUrl, paymentIntentId: payment.paymentIntentId });
  } catch (err) {
    console.error('[QR PH CREATE ERROR]', err);
    res.status(500).json({ error: 'Hindi nagawa ang QR code. Subukan ulit.' });
  }
});

// CLIENT: Poll payment status (habang naghihintay ng scan)
app.get('/api/orders/paymongo/status/:orderId', requireUser, async (req, res) => {
  const order = await findOrderById(req.params.orderId);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  res.json({ status: order.status, paymongoStatus: order.paymongoStatus });
});


// ADMIN: All orders
app.get('/api/orders', requireAdmin, async (req, res) => {
  const orders = await getAllOrders();
  res.json(orders);
});

// ADMIN: Manually create + approve an order (para sa direct GCash payments na hindi dumaan sa QR Ph)
app.post('/api/admin/orders/manual', requireAdmin, async (req, res) => {
  const { username, tier, method, notes } = req.body || {};

  if (!username || !tier)
    return res.status(400).json({ error: 'Username at tier/package kailangan.' });

  if (!VALID_PACKAGES.hasOwnProperty(tier))
    return res.status(400).json({ error: 'Invalid na package/tier.' });

  const user = await findUserByUsername(username);
  if (!user) return res.status(404).json({ error: 'Walang user na may ganitong username.' });

  const price = VALID_PACKAGES[tier];
  const id = Date.now().toString(36);
  const paymentMethod = method || 'Manual GCash';

  await pool.query(
    `INSERT INTO orders (id, username, tier, price, method, status, feedback)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6)`,
    [id, user.username, tier, price, paymentMethod, notes || null]
  );

  try {
    const approvedOrder = await approveOrderInternal(id);
    console.log(`[MANUAL ORDER] Admin created + approved: ${user.username} -> ${tier} (₱${price}) via ${paymentMethod}`);
    res.json({ success: true, order: approvedOrder });
  } catch (err) {
    console.error('[MANUAL ORDER ERROR]', err);
    res.status(500).json({ error: 'Nagawa ang order pero may error sa pag-approve. I-check ang order sa listahan.' });
  }
});

// ADMIN: All orders including archived (para sa income totals)
app.get('/api/orders/all-including-archived', requireAdmin, async (req, res) => {
  const live = await getAllOrders();
  const archivedR = await pool.query('SELECT * FROM archived_orders ORDER BY created_at DESC');
  const archived = archivedR.rows.map(mapOrderRow).map(o => ({ ...o, _archived: true }));
  res.json([...live, ...archived]);
});

// ADMIN: Update order status
app.patch('/api/orders/:id', requireAdmin, async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const { status, feedback } = req.body || {};

  if (status) {
    if (status === 'approved' && order.status === 'flagged')
      return res.status(403).json({
        error: 'Cannot approve a flagged order. The flag is permanent.'
      });

    if (status === 'approved' && order.status !== 'approved') {
      await approveOrderInternal(order.id);
    }

    if (status !== 'approved') {
      await pool.query('DELETE FROM daily_logs WHERE order_id = $1', [order.id]);
      await pool.query(
        'UPDATE orders SET status = $1, approved_at = NULL, bonus_claimed = false WHERE id = $2',
        [status, order.id]
      );
    }
  }

  if (feedback !== undefined) {
    await pool.query('UPDATE orders SET feedback = $1 WHERE id = $2', [feedback, order.id]);
    if (status === 'flagged') {
      await createNotification(
        order.username,
        'order_flagged',
        'Order Needs Attention',
        `Your order for ${order.tier} was flagged: ${feedback}`
      );
    }
  }

  const updatedOrder = await findOrderById(order.id);
  res.json({ success: true, order: updatedOrder });
});

    // ADMIN: Delete single order → archive
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.screenshot) {
    await deleteScreenshotFromSupabase(order.screenshot);
  }

  await pool.query(
    `INSERT INTO archived_orders
     (id, username, tier, price, method, screenshot, status, feedback, approved_at, bonus_claimed, created_at, deleted_by_admin_at)
     VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, NOW())`,
    [order.id, order.username, order.tier, order.price, order.method, order.status, order.feedback, order.approvedAt, order.bonusClaimed, order.createdAt]
  );
  await pool.query('DELETE FROM orders WHERE id = $1', [order.id]);

  console.log(`[DELETE ORDER] Archived: ${order.username} - ${order.tier} (${order.status})`);
  res.json({ success: true });
});

// ── Reusable order approval logic (ginagamit ng admin PATCH at ng PayMongo webhook) ──
async function approveOrderInternal(orderId) {
  const order = await findOrderById(orderId);
  if (!order) throw new Error('Order not found.');
  if (order.status === 'approved') return order; // idempotent — huwag ulitin kung approved na

  const newApprovedAt = new Date().toISOString();

  await createNotification(
    order.username,
    'order_approved',
    'Order Approved',
    `Your order for ${order.tier} (₱${order.price.toLocaleString()}) has been approved!`
  );

  // Daily Reward tracking
  const dailyReward = parseFloat((order.price * DAILY_REWARD_RATE).toFixed(2));
  await pool.query(
    `INSERT INTO daily_logs (order_id, username, tier, price, daily_reward, started_at, last_credited_at, total_credited)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
     ON CONFLICT (order_id) DO NOTHING`,
    [order.id, order.username, order.tier, order.price, dailyReward, newApprovedAt, newApprovedAt]
  );
  console.log(`[DAILY LOG] Started for ${order.username} - ₱${dailyReward}/day (${order.tier})`);

  // Multi-Level Referral Reward (Level 1: 25%+, Level 2: 10%, Level 3: 5%)
  let chainUsername = order.username;
  for (let level = 1; level <= 3; level++) {
    const chainUser = await findUserByUsername(chainUsername);
    if (!chainUser || !chainUser.referred_by) break;

    const inviterKey    = chainUser.referred_by;
    const referralEntry = await getReferralByUsername(inviterKey);

    if (referralEntry) {
      const alreadyCreditedRow = await pool.query(
        'SELECT id FROM referral_invites WHERE referrer_username = $1 AND order_id = $2 AND level = $3',
        [referralEntry.username, order.id, level]
      );
      const alreadyCredited = alreadyCreditedRow.rows.length > 0;

      if (!alreadyCredited) {
        let rate;
        if (level === 1) {
          rate = (await getUserRank(inviterKey)).l1Rate;
        } else if (level === 2) {
          rate = L2_RATE;
        } else {
          rate = L3_RATE;
        }
        const reward = parseFloat((order.price * rate).toFixed(2));
        await pool.query(
          `INSERT INTO referral_invites
           (referrer_username, invited_username, order_id, tier, price, level, reward, credited_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [referralEntry.username, order.username, order.id, order.tier, order.price, level, reward, newApprovedAt]
        );
        const inviterUser = await findUserByUsername(inviterKey);
        if (inviterUser) {
          await creditWallet(
            inviterUser.username, reward,
            `Referral reward L${level} - ${order.username} (${order.tier})`,
            'referral_commission'
          );
          await createNotification(
            inviterUser.username,
            'referral_commission',
            'Referral Commission Received',
            `You earned ₱${reward.toLocaleString()} from ${order.username}'s ${order.tier} order (Level ${level}).`
          );
        }
      }
    }
    chainUsername = chainUser.referred_by;
  }

  await pool.query(
    'UPDATE orders SET status = $1, approved_at = $2 WHERE id = $3',
    ['approved', newApprovedAt, order.id]
  );

  return await findOrderById(order.id);
}

// ADMIN: Bulk delete approved orders → archive
app.delete('/api/orders/bulk/:status', requireAdmin, async (req, res) => {
  const status = req.params.status;
  const r = await pool.query('SELECT * FROM orders WHERE status = $1', [status]);
  const toDelete = r.rows.map(mapOrderRow);

  for (const o of toDelete) {
    if (o.screenshot) await deleteScreenshotFromSupabase(o.screenshot);
    await pool.query(
      `INSERT INTO archived_orders
       (id, username, tier, price, method, screenshot, status, feedback, approved_at, bonus_claimed, created_at, deleted_by_admin_at)
       VALUES ($1, $2, $3, $4, $5, NULL, $6, $7, $8, $9, $10, NOW())`,
      [o.id, o.username, o.tier, o.price, o.method, o.status, o.feedback, o.approvedAt, o.bonusClaimed, o.createdAt]
    );
  }
  await pool.query('DELETE FROM orders WHERE status = $1', [status]);

  console.log(`[BULK DELETE] Archived ${toDelete.length} orders with status: ${status}`);
  res.json({ success: true, deleted: toDelete.length });
});

// ADMIN: Delete screenshot only
app.delete('/api/orders/:id/screenshot', requireAdmin, async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.screenshot) {
    await deleteScreenshotFromSupabase(order.screenshot);
    await pool.query('UPDATE orders SET screenshot = NULL WHERE id = $1', [order.id]);
  }
  const updatedOrder = await findOrderById(order.id);
  res.json({ success: true, order: updatedOrder });
});


// ── Wallet API ────────────────────────────────────────────────
app.get('/api/wallet/:username', requireUser, async (req, res) => {
  const w = await getWallet(req.params.username);
  res.json(w);
});

app.post('/api/wallet/:username/credit', requireAdmin, async (req, res) => {
  const { amount, note } = req.body || {};
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount.' });
  await creditWallet(req.params.username, parseFloat(amount), note || 'Admin credit', 'admin_credit');
  const w = await getWallet(req.params.username);
  res.json({ success: true, wallet: w });
});
// ── Referral API ──────────────────────────────────────────────
app.get('/api/leaderboard', async (req, res) => {
  const r = await pool.query(`
    SELECT referrer_username AS username,
           COUNT(*) FILTER (WHERE level = 1) AS l1_count,
           COALESCE(SUM(reward), 0) AS total_earned
    FROM referral_invites
    GROUP BY referrer_username
    ORDER BY l1_count DESC, total_earned DESC
  `);

  const ranked = r.rows.map((row, idx) => {
    const l1Count = parseInt(row.l1_count, 10);
    const rankInfo = RANKS.find(rk => l1Count >= rk.minInvites) || RANKS[RANKS.length - 1];
    return {
      position: idx + 1,
      username: row.username,
      l1Count,
      totalEarned: parseFloat(row.total_earned),
      rankName: rankInfo.name,
    };
  });

  const username = req.query.username;
  const myEntry = username
    ? ranked.find(e => e.username.toLowerCase() === String(username).toLowerCase()) || null
    : null;

  res.json({
    top: ranked.slice(0, 20),
    myEntry,
  });
});

app.get('/api/referral/:username', requireUser, async (req, res) => {
  const entry = await getOrCreateReferral(req.params.username);
  res.json(entry);
});

app.get('/api/admin/referrals', requireAdmin, async (req, res) => {
  const referralsRows = await pool.query('SELECT username, code FROM referrals');
  const result = {};
  for (const row of referralsRows.rows) {
    result[row.username.toLowerCase()] = await getOrCreateReferral(row.username);
  }
  res.json(result);
});

app.post('/api/admin/referrals/:username/regenerate', requireAdmin, async (req, res) => {
  const entry = await getReferralByUsername(req.params.username);
  if (!entry) return res.status(404).json({ error: 'User referral not found.' });
  const newCode = await generateUniqueCode(req.params.username);
  await pool.query('UPDATE referrals SET code = $1 WHERE LOWER(username) = LOWER($2)', [newCode, req.params.username]);
  console.log(`[REFERRAL] Admin regenerated code for ${req.params.username}: ${newCode}`);
  res.json({ success: true, code: newCode });
});

// CLIENT: My Team (3-level downline)
app.get('/api/referral/:username/team', requireUser, async (req, res) => {
  const username = req.params.username;

  async function getDirectInvitees(uname) {
    const r = await pool.query(
      'SELECT username, phone, created_at FROM users WHERE LOWER(referred_by) = LOWER($1)',
      [uname]
    );
    return r.rows;
  }

  const level1 = await getDirectInvitees(username);
  let level2 = [];
  for (const u of level1) {
    const invitees = await getDirectInvitees(u.username);
    level2 = level2.concat(invitees);
  }
  let level3 = [];
  for (const u of level2) {
    const invitees = await getDirectInvitees(u.username);
    level3 = level3.concat(invitees);
  }

  function localPhone(p){
    return '0' + String(p || '').replace('+63', '');
  }
  const mapUser = u => ({ username: u.username, phone: localPhone(u.phone), joinedAt: u.created_at });

  res.json({
    level1: level1.map(mapUser),
    level2: level2.map(mapUser),
    level3: level3.map(mapUser),
  });
});
// ── Daily Rewards API ─────────────────────────────────────────
app.get('/api/daily-rewards/:username', requireUser, async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM daily_logs WHERE LOWER(username) = LOWER($1)',
    [req.params.username]
  );
  const myLogs = r.rows.map(log => ({
    orderId: log.order_id,
    username: log.username,
    tier: log.tier,
    price: parseFloat(log.price),
    dailyReward: parseFloat(log.daily_reward),
    startedAt: log.started_at,
    lastCreditedAt: log.last_credited_at,
    totalCredited: parseFloat(log.total_credited),
  }));
  res.json(myLogs);
});

app.get('/api/admin/daily-rewards', requireAdmin, async (req, res) => {
  const r = await pool.query('SELECT * FROM daily_logs');
  const result = {};
  for (const log of r.rows) {
    result[log.order_id] = {
      username: log.username,
      tier: log.tier,
      price: parseFloat(log.price),
      dailyReward: parseFloat(log.daily_reward),
      startedAt: log.started_at,
      lastCreditedAt: log.last_credited_at,
      totalCredited: parseFloat(log.total_credited),
    };
  }
  res.json(result);
});

// ── Task Rewards API ──────────────────────────────────────────
app.get('/api/task-rewards/:username', requireUser, async (req, res) => {
  const myCompleted = await getCompletedTaskIds(req.params.username);
  const allTasks = await getAllTasks();
  const available = allTasks.filter(t => t.active && !myCompleted.includes(t.id));
  res.json(available);
});

app.get('/api/task-logs/:username', requireUser, async (req, res) => {
  const logs = await getTaskLogsByUsername(req.params.username);
  res.json(logs);
});

app.post('/api/task-rewards/:username/claim/:taskId', requireUser, async (req, res) => {
  const username = req.params.username;
  const task = await findTaskById(req.params.taskId);
  if (!task || !task.active)
    return res.status(404).json({ error: 'Task not found or no longer active.' });

  const already = await pool.query(
    'SELECT id FROM task_logs WHERE LOWER(username) = LOWER($1) AND task_id = $2',
    [username, task.id]
  );
  if (already.rows.length > 0) return res.status(409).json({ error: 'You already claimed this task.' });

  await pool.query(
    'INSERT INTO task_logs (username, task_id, reward) VALUES ($1, $2, $3)',
    [username, task.id, task.reward]
  );
  await creditWallet(username, task.reward, `Task reward - ${task.title}`, 'task_reward');

  await createNotification(
    username,
    'task_reward',
    'Task Reward Claimed',
    `You claimed ₱${Number(task.reward).toLocaleString()} for completing "${task.title}".`
  );

  res.json({ success: true });
});

app.get('/api/admin/tasks', requireAdmin, async (req, res) => {
  const tasks = await getAllTasks();
  res.json(tasks);
});

app.post('/api/admin/tasks', requireAdmin, async (req, res) => {
  const { title, description, reward } = req.body || {};
  if (!title || !reward) return res.status(400).json({ error: 'Title at reward kailangan.' });
  const id = Date.now().toString(36);
  await pool.query(
    'INSERT INTO tasks (id, title, description, reward, active) VALUES ($1, $2, $3, $4, true)',
    [id, title, description || '', Number(reward) || 0]
  );
  const task = await findTaskById(id);
  res.json({ success: true, task });
});

app.patch('/api/admin/tasks/:id', requireAdmin, async (req, res) => {
  const task = await findTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  const { title, description, reward, active } = req.body || {};
  const newTitle = title !== undefined ? title : task.title;
  const newDesc = description !== undefined ? description : task.description;
  const newReward = reward !== undefined ? (Number(reward) || 0) : task.reward;
  const newActive = active !== undefined ? !!active : task.active;
  await pool.query(
    'UPDATE tasks SET title = $1, description = $2, reward = $3, active = $4 WHERE id = $5',
    [newTitle, newDesc, newReward, newActive, task.id]
  );
  const updatedTask = await findTaskById(task.id);
  res.json({ success: true, task: updatedTask });
});

app.delete('/api/admin/tasks/:id', requireAdmin, async (req, res) => {
  const task = await findTaskById(req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  await pool.query('DELETE FROM tasks WHERE id = $1', [task.id]);
  res.json({ success: true });
});

// ── Notifications API ──────────────────────────────────────────
app.get('/api/notifications/:username', requireUser, async (req, res) => {
  const notifications = await getNotifications(req.params.username);
  const unreadCount = await getUnreadCount(req.params.username);
  res.json({
    notifications: notifications.map(n => ({
      id: n.id,
      type: n.type,
      title: n.title,
      message: n.message,
      read: n.read,
      createdAt: n.created_at,
    })),
    unreadCount,
  });
});

app.patch('/api/notifications/:username/read', requireUser, async (req, res) => {
  const { notificationId } = req.body || {};
  if (notificationId) {
    await pool.query(
      'UPDATE notifications SET read = true WHERE id = $1 AND LOWER(username) = LOWER($2)',
      [notificationId, req.params.username]
    );
  } else {
    await pool.query(
      'UPDATE notifications SET read = true WHERE LOWER(username) = LOWER($1)',
      [req.params.username]
    );
  }
  res.json({ success: true });
});
// ── Survey API ──────────────────────────────────────────────────
app.get('/api/survey/:username', requireUser, async (req, res) => {
  const username = req.params.username;
  const questions = await fetchAndCacheTodaysQuestions();

  const answeredRows = await pool.query(
    'SELECT question_id, selected_answer, is_correct FROM survey_responses WHERE LOWER(username) = LOWER($1) AND question_id = ANY($2)',
    [username, questions.map(q => q.id)]
  );
  const answeredMap = {};
  answeredRows.rows.forEach(r => { answeredMap[r.question_id] = r; });

  const result = questions.map(q => ({
    id: q.id,
    question: q.question,
    options: q.options,
    answered: !!answeredMap[q.id],
    selectedAnswer: answeredMap[q.id]?.selected_answer || null,
    isCorrect: answeredMap[q.id]?.is_correct ?? null,
  }));

  const correctCount = answeredRows.rows.filter(r => r.is_correct).length;
  const totalEarned = parseFloat((correctCount * SURVEY_REWARD).toFixed(2));

  res.json({
    questions: result,
    answeredCount: answeredRows.rows.length,
    totalQuestions: questions.length,
    correctCount,
    totalEarned,
  });
});

app.post('/api/survey/:username/answer', requireUser, async (req, res) => {
  const username = req.params.username;
  const { questionId, selectedAnswer } = req.body || {};
  if (!questionId || !selectedAnswer)
    return res.status(400).json({ error: 'Question ID and answer are required.' });

  const already = await pool.query(
    'SELECT id FROM survey_responses WHERE LOWER(username) = LOWER($1) AND question_id = $2',
    [username, questionId]
  );
  if (already.rows.length > 0)
    return res.status(409).json({ error: 'You already answered this question.' });

  const qRow = await pool.query('SELECT * FROM survey_questions WHERE id = $1', [questionId]);
  if (!qRow.rows[0]) return res.status(404).json({ error: 'Question not found.' });

  const isCorrect = qRow.rows[0].correct_answer === selectedAnswer;

  await pool.query(
    'INSERT INTO survey_responses (username, question_id, selected_answer, is_correct) VALUES ($1, $2, $3, $4)',
    [username, questionId, selectedAnswer, isCorrect]
  );

  if (isCorrect) {
await creditWallet(username, SURVEY_REWARD, 'Survey question - correct answer', 'survey_reward');
  }

  res.json({
    success: true,
    isCorrect,
    correctAnswer: qRow.rows[0].correct_answer,
    reward: isCorrect ? SURVEY_REWARD : 0,
  });
});

// ── Admin Broadcast ────────────────────────────────────────────
app.post('/api/admin/broadcast', requireAdmin, async (req, res) => {
  const { title, message, usernames } = req.body || {};
  if (!title || !message)
    return res.status(400).json({ error: 'Title and message are required.' });

  let targets = usernames;
  if (!targets || !targets.length) {
    const allUsers = await getAllUsers();
    targets = allUsers.map(u => u.username);
  }

  for (const uname of targets) {
    await createNotification(uname, 'announcement', title, message);
  }

  console.log(`[BROADCAST] Sent to ${targets.length} user(s): "${title}"`);
  res.json({ success: true, sentTo: targets.length });
});

// ── Withdrawal API ────────────────────────────────────────────

// CLIENT: eligibility check
app.get('/api/withdraw/eligibility/:username', requireUser, async (req, res) => {
  res.json(await getWithdrawEligibility(req.params.username));
});

// CLIENT: submit withdrawal request
app.post('/api/withdraw', submitLimiter, requireUser, async (req, res) => {
  const { username, amount, accountNumber, accountName, method, notes } = req.body || {};

  if (!username || !accountNumber || !accountName)
    return res.status(400).json({ error: 'Lahat ng fields kailangan punan.' });

  const amt = parseFloat(amount);
  if (!amt || isNaN(amt) || amt <= 0)
    return res.status(400).json({ error: 'Invalid na amount.' });

  const elig = await getWithdrawEligibility(username);

  if (elig.hasPendingWithdrawal)
    return res.status(409).json({
      error: 'May pending ka pang withdrawal request. Hintayin muna ang proseso nito.'
    });

  if (!elig.referralsMet)
    return res.status(403).json({
      error: `Kailangan mo muna ng ${elig.invitesNeeded} verified referrals sa kasalukuyang cycle (${elig.invitesCount}/${elig.invitesNeeded}).`
    });

  if (!elig.balanceMet)
    return res.status(403).json({ error: `Minimum balance ay ₱${MIN_WITHDRAWAL}.` });

  if (amt < MIN_WITHDRAWAL)
    return res.status(400).json({ error: `Minimum withdrawal ay ₱${MIN_WITHDRAWAL}.` });

  if (amt > elig.balance)
    return res.status(400).json({ error: 'Hindi sapat ang iyong balance para sa amount na ito.' });

  const remaining = parseFloat((elig.balance - amt).toFixed(2));
  if (remaining > 0 && remaining < MIN_WITHDRAWAL)
    return res.status(400).json({
      error: `Ang matitirang balance ay dapat ₱${MIN_WITHDRAWAL} pataas, o i-withdraw na lahat ng ₱${elig.balance}.`
    });

  const id = Date.now().toString(36);
  const withdrawMethod = method || 'GCash';
  await pool.query(
    `INSERT INTO withdrawals (id, username, amount, account_number, account_name, method, notes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')`,
    [id, username, amt, accountNumber, accountName, withdrawMethod, notes || '']
  );
  const withdrawal = await findWithdrawalById(id);
  console.log(`[WITHDRAW REQUEST] ${username} requested ₱${amt} via ${withdrawMethod}`);
  res.json({ success: true, withdrawalId: id, withdrawal });
});

// CLIENT: own withdrawal history
app.get('/api/withdraw/mine/:username', requireUser, async (req, res) => {
  const mine = await getWithdrawalsByUsername(req.params.username);
  res.json(mine);
});

// ADMIN: all withdrawal requests
app.get('/api/admin/withdrawals', requireAdmin, async (req, res) => {
  const all = await getAllWithdrawals();
  res.json(all);
});

// ADMIN: update withdrawal status

app.patch('/api/admin/withdrawals/:id', requireAdmin, async (req, res) => {
  const w = await findWithdrawalById(req.params.id);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found.' });

  const { status, feedback } = req.body || {};

  if (status && status !== w.status) {

    // ── Mark as PAID (must already be approved) ───────────────
    if (status === 'paid') {
  if (w.status !== 'approved') {
    return res.status(400).json({
      error: 'Please approve the withdrawal first before marking it as Paid.'
    });
  }
  await pool.query(
    'UPDATE withdrawals SET status = $1, processed_at = NOW(), feedback = $2 WHERE id = $3',
    ['paid', feedback !== undefined ? feedback : w.feedback, w.id]
  );

  await createNotification(
    w.username,
    'withdrawal_paid',
    'Withdrawal Paid',
    `Your withdrawal of ₱${Number(w.amount).toLocaleString()} has been sent to your ${w.method} account.`
  );

  const updated = await findWithdrawalById(w.id);
  console.log(`[WITHDRAW PAID] ${w.username} -> ₱${w.amount} marked as paid.`);
  return res.json({ success: true, withdrawal: updated });
}
// ── APPROVE: deduct balance + start new referral cycle ────
    if (status === 'approved' && w.status !== 'approved') {
  const wallet  = await getWallet(w.username);
  const balance = parseFloat((wallet.income - wallet.withdrawn).toFixed(2));
  if (w.amount > balance) {
    return res.status(400).json({
      error: 'The user does not have sufficient balance for this withdrawal.'
    });
  }
  const newWithdrawn = parseFloat((wallet.withdrawn + w.amount).toFixed(2));
  await pool.query(
    'UPDATE wallets SET withdrawn = $1, withdraw_cycle_start = NOW() WHERE LOWER(username) = LOWER($2)',
    [newWithdrawn, w.username]
  );
await pool.query('UPDATE withdrawals SET processed_at = NOW() WHERE id = $1', [w.id]);
  await logWalletTransaction(w.username, 'withdrawal', -w.amount, `Withdrawal to ${w.method} (${w.accountNumber})`);

  await createNotification(
    w.username,
    'withdrawal_approved',
    'Withdrawal Approved',
    `Your withdrawal request of ₱${Number(w.amount).toLocaleString()} has been approved and is now being processed.`
  );

  console.log(`[WITHDRAW APPROVED] ${w.username} -> ₱${w.amount}. New 7-day referral cycle started.`);
}

    // ── REJECT / FLAG: ibalik ang pera kung dati nang approved ─
    if (status === 'rejected' || status === 'flagged') {
  if (w.status === 'approved') {
    const wallet = await getWallet(w.username);
    const newWithdrawn = parseFloat((wallet.withdrawn - w.amount).toFixed(2));
    await pool.query(
      'UPDATE wallets SET withdrawn = $1 WHERE LOWER(username) = LOWER($2)',
      [newWithdrawn, w.username]
    );
console.log(`[WITHDRAW REVERTED] ${w.username} +₱${w.amount} refunded to balance.`);
    await logWalletTransaction(w.username, 'withdrawal_refund', w.amount, `Withdrawal ${status} - refunded to balance`);
  }

  await createNotification(
    w.username,
    'withdrawal_rejected',
    status === 'flagged' ? 'Withdrawal Flagged' : 'Withdrawal Rejected',
    feedback
      ? `Your withdrawal of ₱${Number(w.amount).toLocaleString()} was ${status}: ${feedback}`
      : `Your withdrawal of ₱${Number(w.amount).toLocaleString()} was ${status}. Please contact support for details.`
  );
}

  }

  const updates = [];
  const values = [];
  let idx = 1;
  if (status) { updates.push(`status = $${idx++}`); values.push(status); }
  if (feedback !== undefined) { updates.push(`feedback = $${idx++}`); values.push(feedback); }

  if (updates.length > 0) {
    values.push(w.id);
    await pool.query(`UPDATE withdrawals SET ${updates.join(', ')} WHERE id = $${idx}`, values);
  }

  const updatedWithdrawal = await findWithdrawalById(w.id);
  res.json({ success: true, withdrawal: updatedWithdrawal });
});

// ── Customer: change password ─────────────────────────────────
app.post('/api/change-password', authLimiter, async (req, res) => {
  const { phone: rawPhone, currentPassword, newPassword } = req.body || {};
  if(!rawPhone || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'All fields are required.' });
  const phone = normalizePhone(rawPhone);
  const user  = await findUserByPhone(phone);
  if(!user) return res.status(404).json({ error: 'User not found.' });
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if(!match) return res.status(401).json({ error: 'Current password is incorrect.' });
  if(newPassword.length < 6)
    return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, user.username]);

  await createNotification(
    user.username,
    'password_changed',
    'Password Changed',
    `Your password was successfully changed. If this wasn't you, please contact Customer Service immediately.`
  );

  res.json({ success: true });
});

app.get('/api/profile/:username', requireUser, async (req, res) => {
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ phone: user.phone, birthday: user.birthday, hobby: user.hobby || '' });
});

app.patch('/api/profile/:username', requireUser, async (req, res) => {
  const { birthday, hobby } = req.body || {};
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  await pool.query('UPDATE users SET birthday = $1, hobby = $2 WHERE username = $3', [birthday || null, hobby || null, user.username]);
  res.json({ success: true });
});

// ── Admin: change password ────────────────────────────────────
app.post('/api/admin/change-password', authLimiter, requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminUsername = req.adminUser.username;
  const admin = await findAdminByUsername(adminUsername);
  if (!admin) return res.status(404).json({ error: 'Admin not found.' });
  const match = await bcrypt.compare(currentPassword, admin.password_hash);
  if (!match) return res.status(401).json({ error: 'Mali ang current password.' });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang bagong password.' });
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE admins SET password_hash = $1 WHERE LOWER(username) = LOWER($2)', [newHash, adminUsername]);
  res.json({ success: true });
});

// ── Support Chat ──────────────────────────────────────────────
async function getOrCreateSupportConversation(username) {
  let r = await pool.query('SELECT * FROM support_conversations WHERE LOWER(username) = LOWER($1)', [username]);
  if (!r.rows[0]) {
    await pool.query('INSERT INTO support_conversations (username) VALUES ($1)', [username]);
    r = await pool.query('SELECT * FROM support_conversations WHERE LOWER(username) = LOWER($1)', [username]);
  }
  return r.rows[0];
}
function mapSupportMsg(m) {
  return { id: m.id, senderType: m.sender_type, senderName: m.sender_name, message: m.message, attachmentUrl: m.attachment_url, createdAt: m.created_at };
}

async function uploadSupportAttachment(file) {
  const ext = path.extname(file.originalname) || '.jpg';
  const filename = `support-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`;
  const { error } = await supabase.storage
    .from(SCREENSHOTS_BUCKET)
    .upload(filename, file.buffer, { contentType: file.mimetype });
  if (error) throw error;
  const { data } = supabase.storage.from(SCREENSHOTS_BUCKET).getPublicUrl(filename);
  return data.publicUrl;
}

// CLIENT: get/create conversation + messages
app.get('/api/support/:username', requireUser, async (req, res) => {
  const convo = await getOrCreateSupportConversation(req.params.username);
  const msgs = await pool.query('SELECT * FROM support_messages WHERE conversation_id = $1 ORDER BY created_at ASC', [convo.id]);
  res.json({ conversationId: convo.id, status: convo.status, messages: msgs.rows.map(mapSupportMsg) });
});

// CLIENT: send message (may kasamang optional attachment)
app.post('/api/support/:username/message', submitLimiter, uploadSingle('attachment'), requireUser, async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message && !req.file) return res.status(400).json({ error: 'Walang laman ang mensahe.' });

  if (req.file && !(await isRealImage(req.file.buffer)))
    return res.status(400).json({ error: 'Invalid na file. Larawan lang (JPG/PNG) ang tinatanggap.' });

  let attachmentUrl = null;
  if (req.file) {
    try { attachmentUrl = await uploadSupportAttachment(req.file); }
    catch (err) {
      console.error('[SUPPORT ATTACHMENT UPLOAD ERROR]', err);
      return res.status(500).json({ error: 'Hindi na-upload ang attachment. Subukan ulit.' });
    }
  }

  const convo = await getOrCreateSupportConversation(req.params.username);
  await pool.query(
    `INSERT INTO support_messages (conversation_id, sender_type, sender_name, message, attachment_url, read_by_user, read_by_admin)
     VALUES ($1, 'user', $2, $3, $4, true, false)`,
    [convo.id, req.params.username, message, attachmentUrl]
  );
  await pool.query(`UPDATE support_conversations SET status = 'open', updated_at = NOW() WHERE id = $1`, [convo.id]);
  res.json({ success: true });
});

// CLIENT: mark admin replies as read
app.patch('/api/support/:username/read', requireUser, async (req, res) => {
  const convo = await getOrCreateSupportConversation(req.params.username);
  await pool.query(`UPDATE support_messages SET read_by_user = true WHERE conversation_id = $1 AND sender_type = 'admin'`, [convo.id]);
  res.json({ success: true });
});

// ADMIN: list all conversations w/ preview + unread count
app.get('/api/admin/support/conversations', requireAdmin, async (req, res) => {
  const r = await pool.query(`
    SELECT c.*,
      (SELECT message FROM support_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
      (SELECT created_at FROM support_messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message_at,
      (SELECT COUNT(*) FROM support_messages WHERE conversation_id = c.id AND sender_type = 'user' AND read_by_admin = false) AS unread_count
    FROM support_conversations c
    ORDER BY last_message_at DESC NULLS LAST
  `);
  res.json(r.rows.map(row => ({
    id: row.id, username: row.username, status: row.status,
    lastMessage: row.last_message, lastMessageAt: row.last_message_at,
    unreadCount: parseInt(row.unread_count, 10), updatedAt: row.updated_at,
  })));
});

// ADMIN: get messages of one conversation
app.get('/api/admin/support/:id/messages', requireAdmin, async (req, res) => {
  const msgs = await pool.query('SELECT * FROM support_messages WHERE conversation_id = $1 ORDER BY created_at ASC', [req.params.id]);
  res.json(msgs.rows.map(mapSupportMsg));
});

// ADMIN: reply (may kasamang optional attachment)
app.post('/api/admin/support/:id/message', requireAdmin, uploadSingle('attachment'), async (req, res) => {
  const message = (req.body.message || '').trim();
  if (!message && !req.file) return res.status(400).json({ error: 'Message required.' });

  if (req.file && !(await isRealImage(req.file.buffer)))
    return res.status(400).json({ error: 'Invalid na file. Larawan lang (JPG/PNG) ang tinatanggap.' });

  let attachmentUrl = null;
  if (req.file) {
    try { attachmentUrl = await uploadSupportAttachment(req.file); }
    catch (err) {
      console.error('[SUPPORT ATTACHMENT UPLOAD ERROR]', err);
      return res.status(500).json({ error: 'Hindi na-upload ang attachment. Subukan ulit.' });
    }
  }

  const convoR = await pool.query('SELECT * FROM support_conversations WHERE id = $1', [req.params.id]);
  const convo = convoR.rows[0];
  if (!convo) return res.status(404).json({ error: 'Conversation not found.' });
  await pool.query(
    `INSERT INTO support_messages (conversation_id, sender_type, sender_name, message, attachment_url, read_by_user, read_by_admin)
     VALUES ($1, 'admin', $2, $3, $4, false, true)`,
    [convo.id, req.adminUser.username, message, attachmentUrl]
  );
  await pool.query(`UPDATE support_conversations SET status = 'open', updated_at = NOW() WHERE id = $1`, [convo.id]);
  await createNotification(convo.username, 'support_reply', 'New Support Message',
    message ? `Sumagot ang admin: "${message.slice(0, 80)}"` : 'May bagong attachment mula sa admin.');
  res.json({ success: true });
});

// ADMIN: mark user messages read
app.patch('/api/admin/support/:id/read', requireAdmin, async (req, res) => {
  await pool.query(`UPDATE support_messages SET read_by_admin = true WHERE conversation_id = $1 AND sender_type = 'user'`, [req.params.id]);
  res.json({ success: true });
});

// ADMIN: close/reopen
app.patch('/api/admin/support/:id/status', requireAdmin, async (req, res) => {
  const { status } = req.body || {};
  if (!['open', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  await pool.query('UPDATE support_conversations SET status = $1, updated_at = NOW() WHERE id = $2', [status, req.params.id]);
  res.json({ success: true });
});

// ── PayMongo Webhook ──────────────────────────────────────────
app.post('/api/webhooks/paymongo', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['paymongo-signature'];
  const rawBody = req.body.toString('utf8');

  if (!verifyPaymongoSignature(rawBody, signature, process.env.PAYMONGO_WEBHOOK_SECRET)) {
    console.error('[WEBHOOK] Invalid signature');
    return res.status(400).json({ error: 'Invalid signature.' });
  }

  const event = JSON.parse(rawBody);
  const eventType = event.data?.attributes?.type;
  const paymentIntentId = event.data?.attributes?.data?.attributes?.payment_intent_id
    || event.data?.attributes?.data?.id;

  console.log(`[WEBHOOK] Received: ${eventType}`);

  if (eventType === 'payment.paid') {
    const orderRow = await pool.query(
      'SELECT * FROM orders WHERE paymongo_payment_intent_id = $1',
      [paymentIntentId]
    );
    const order = orderRow.rows[0] ? mapOrderRow(orderRow.rows[0]) : null;

if (order && order.status !== 'approved') {
      await approveOrderInternal(order.id);
      console.log(`[AUTO-APPROVED] ${order.username} -> ${order.tier} via QR Ph`);
    }
  }

  res.status(200).json({ received: true });
});
// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`ORB-X PH server running sa http://localhost:${PORT}`);
  const allUsers = await getAllUsers();
  const allOrders = await getAllOrders();
  const adminCount = await getAdminCount();
  console.log(`Users: ${allUsers.length} | Orders: ${allOrders.length} | Admins: ${adminCount}`);
});