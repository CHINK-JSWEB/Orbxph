const express = require('express');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');

const app = express();
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

app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));
app.use('/uploads', express.static(UPLOADS_DIR));

// ── Utility ───────────────────────────────────────────────────
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

// ── Wallets ───────────────────────────────────────────────────
let walletsData = {};
function loadWallets() { walletsData = readJSON(WALLETS_FILE, {}); }
function saveWallets() { writeJSON(WALLETS_FILE, walletsData); }
loadWallets();

function getWallet(username) {
  const key = username.toLowerCase();
  if (!walletsData[key]) walletsData[key] = { income: 0, withdrawn: 0, withdrawCycleStart: null };
  if (walletsData[key].withdrawCycleStart === undefined) walletsData[key].withdrawCycleStart = null;
  return walletsData[key];
}
function creditWallet(username, amount, note) {
  const w = getWallet(username);
  w.income = parseFloat((w.income + amount).toFixed(2));
  saveWallets();
  console.log(`[WALLET CREDIT] ${username} +₱${amount} (${note})`);
}

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
  return r.rows;
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

// ── Withdrawals ───────────────────────────────────────────────
let withdrawalsArray = [];
function loadWithdrawals() { withdrawalsArray = readJSON(WITHDRAWALS_FILE, []); }
function saveWithdrawals() { writeJSON(WITHDRAWALS_FILE, withdrawalsArray); }
loadWithdrawals();
const REFERRAL_SIGNUP_BONUS = 100;
const MIN_WITHDRAWAL    = 300;
const MIN_REFERRALS     = 2;
const REFERRAL_CYCLE_MS = 7 * 24 * 60 * 60 * 1000;

async function getWithdrawEligibility(username) {
  const wallet  = getWallet(username);
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
  const hasPending = withdrawalsArray.some(
    w => w.username.toLowerCase() === username.toLowerCase() && w.status === 'pending'
  );

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

// ── Tasks ─────────────────────────────────────────────────────
let tasksArray   = [];
let taskLogsData = {};
function loadTasks()    { tasksArray   = readJSON(TASKS_FILE, []); }
function saveTasks()    { writeJSON(TASKS_FILE, tasksArray); }
function loadTaskLogs() { taskLogsData = readJSON(TASK_LOGS_FILE, {}); }
function saveTaskLogs() { writeJSON(TASK_LOGS_FILE, taskLogsData); }
loadTasks();
loadTaskLogs();
// ── Daily Reward Scheduler ────────────────────────────────────
async function processDailyRewards() {
  const now = Date.now();
  const r = await pool.query('SELECT * FROM daily_logs');
  for (const log of r.rows) {
    const lastCredited = new Date(log.last_credited_at).getTime();
    const elapsed = now - lastCredited;
    if (elapsed >= 24 * 60 * 60 * 1000) {
      creditWallet(log.username, parseFloat(log.daily_reward), `Daily reward - ${log.tier}`);
      const newTotal = parseFloat((parseFloat(log.total_credited || 0) + parseFloat(log.daily_reward)).toFixed(2));
      await pool.query(
        'UPDATE daily_logs SET last_credited_at = NOW(), total_credited = $1 WHERE order_id = $2',
        [newTotal, log.order_id]
      );
      console.log(`[DAILY REWARD] ${log.username} +₱${log.daily_reward} (${log.tier})`);
    }
  }
}
setInterval(processDailyRewards, 60 * 1000);


// ── Admin ─────────────────────────────────────────────────────
let adminAccounts = [];
const adminTokens = new Map();

function loadAdmins() {
  if (!fs.existsSync(ADMIN_FILE)) return;
  try {
    const raw = JSON.parse(fs.readFileSync(ADMIN_FILE, 'utf8'));
    adminAccounts = Array.isArray(raw) ? raw : [raw];
  } catch(e) {}
}
function saveAdmins() { writeJSON(ADMIN_FILE, adminAccounts); }
loadAdmins();

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token || !adminTokens.has(token))
    return res.status(401).json({ error: 'Hindi naka-login bilang admin.' });
  req.adminUser = adminTokens.get(token);
  next();
}

// ═══════════════════════════════════════════════════════════════
//  ROUTES
// ═══════════════════════════════════════════════════════════════

// ── Admin auth ────────────────────────────────────────────────
app.get('/api/admin/exists', (req, res) => res.json({ exists: adminAccounts.length > 0 }));

app.post('/api/admin/setup', async (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password)
    return res.status(400).json({ error: 'Lahat ng fields kailangan punan.' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang password.' });
  if (adminAccounts.find(a => a.username.toLowerCase() === username.toLowerCase()))
    return res.status(409).json({ error: 'Ginagamit na ang username na iyan.' });
  const passwordHash = await bcrypt.hash(password, 10);
  adminAccounts.push({ username, passwordHash, createdAt: new Date().toISOString() });
  saveAdmins();
  res.json({ success: true });
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body || {};
  if (!adminAccounts.length)
    return res.status(404).json({ error: 'Wala pang admin account.' });
  const admin = adminAccounts.find(
    a => a.username.toLowerCase() === (username || '').toLowerCase()
  );
  if (!admin) return res.status(401).json({ error: 'Maling username o password.' });
  const match = await bcrypt.compare(password, admin.passwordHash);
  if (!match) return res.status(401).json({ error: 'Maling username o password.' });
  const token = crypto.randomBytes(24).toString('hex');
  adminTokens.set(token, { username: admin.username });
  res.json({ success: true, token, username: admin.username });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  adminTokens.delete(token);
  res.json({ success: true });
});

app.get('/api/admin/list', requireAdmin, (req, res) => {
  res.json(adminAccounts.map(a => ({ username: a.username, createdAt: a.createdAt })));
});

app.get('/api/admin/users', requireAdmin, async (req, res) => {
  const users = await getAllUsers();
  res.json(users.map(u => ({
    username:  u.username,
    phone:     u.phone,
    createdAt: u.created_at,
    blocked:   !!u.blocked,
  })));
});

app.patch('/api/admin/users/:username/block', requireAdmin, async (req, res) => {
  const user = await findUserByUsername(req.params.username);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  const newBlocked = !user.blocked;
  await pool.query('UPDATE users SET blocked = $1 WHERE username = $2', [newBlocked, user.username]);
  res.json({ success: true, blocked: newBlocked });
});

// ── Customer auth ─────────────────────────────────────────────
app.post('/api/signup', async (req, res) => {
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
    creditWallet(username, REFERRAL_SIGNUP_BONUS, `Signup bonus - referred by ${referredBy}`);
    console.log(`[SIGNUP BONUS] ${username} +₱${REFERRAL_SIGNUP_BONUS} (referred by ${referredBy})`);
  }

  res.json({ success: true, referralBonus: referredBy ? REFERRAL_SIGNUP_BONUS : 0 });
});

app.post('/api/login', async (req, res) => {
  const { phone: rawPhone, password } = req.body || {};
  if (!rawPhone || !password)
    return res.status(400).json({ error: 'Kailangan ng number at password.' });
  const phone = normalizePhone(rawPhone);
  const user  = await findUserByPhone(phone);
  if (!user) return res.status(401).json({ error: 'Walang account na may ganitong number.' });
  if (user.blocked)
    return res.status(403).json({ error: 'Ang account mo ay na-block. Makipag-ugnayan sa Customer Service.' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Maling password.' });
  res.json({ success: true, username: user.username, phone: user.phone });
});

// ── Orders ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `order-${Date.now()}-${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/'))
});

app.post('/api/orders', upload.single('screenshot'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Walang na-attach na screenshot.' });
  const { username, tier, price, method } = req.body || {};
  const id = Date.now().toString(36);
  const screenshot = '/uploads/' + req.file.filename;
  await pool.query(
    `INSERT INTO orders (id, username, tier, price, method, screenshot, status)
     VALUES ($1, $2, $3, $4, $5, $6, 'pending')`,
    [id, username || 'Unknown', tier || '—', Number(price) || 0, method || 'GCash', screenshot]
  );
  console.log(`[NEW ORDER] ${username} -> ${tier} (₱${price}) via ${method}`);
  res.json({ success: true, orderId: id });
});

// CLIENT: My Orders — kasama ang archived
app.get('/api/orders/mine/:username', async (req, res) => {
  const active = await getOrdersByUsername(req.params.username);
  const archived = await getArchivedOrdersByUsername(req.params.username);
  const combined = [...active, ...archived]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(combined);
});


// ADMIN: All orders
app.get('/api/orders', requireAdmin, async (req, res) => {
  const orders = await getAllOrders();
  res.json(orders);
});

// ADMIN: Update order status
app.patch('/api/orders/:id', requireAdmin, async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  const { status, feedback } = req.body || {};

  if (status) {
    if (status === 'approved' && order.status === 'flagged')
      return res.status(403).json({
        error: 'Hindi pwedeng i-approve ang isang flagged na order. Permanente ang flag.'
      });

    const wasApproved = order.status === 'approved';
    let newApprovedAt = order.approvedAt;
    let newBonusClaimed = order.bonusClaimed;

    if (status === 'approved' && !wasApproved) {
      newApprovedAt = new Date().toISOString();

      // Daily Reward tracking
      const dailyReward = parseFloat((order.price * DAILY_REWARD_RATE).toFixed(2));
      await pool.query(
        `INSERT INTO daily_logs (order_id, username, tier, price, daily_reward, started_at, last_credited_at, total_credited)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 0)
         ON CONFLICT (order_id) DO NOTHING`,
        [order.id, order.username, order.tier, order.price, dailyReward, newApprovedAt, newApprovedAt]
      );
      console.log(`[DAILY LOG] Started for ${order.username} - ₱${dailyReward}/day (${order.tier})`);

      // Multi-Level Referral Reward (Level 1: 25%, Level 2: 10%, Level 3: 5%)
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
              creditWallet(
                inviterUser.username, reward,
                `Referral reward L${level} - ${order.username} (${order.tier})`
              );
            }
          }
        }
        chainUsername = chainUser.referred_by;
      }
    }

    if (status !== 'approved') {
      await pool.query('DELETE FROM daily_logs WHERE order_id = $1', [order.id]);
      newApprovedAt = null;
      newBonusClaimed = false;
    }

    await pool.query(
      'UPDATE orders SET status = $1, approved_at = $2, bonus_claimed = $3 WHERE id = $4',
      [status, newApprovedAt, newBonusClaimed, order.id]
    );
  }

  if (feedback !== undefined) {
    await pool.query('UPDATE orders SET feedback = $1 WHERE id = $2', [feedback, order.id]);
  }

  const updatedOrder = await findOrderById(order.id);
  res.json({ success: true, order: updatedOrder });
});
// ADMIN: Delete single order → archive
app.delete('/api/orders/:id', requireAdmin, async (req, res) => {
  const order = await findOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });

  if (order.screenshot) {
    fs.unlink(path.join(UPLOADS_DIR, path.basename(order.screenshot)), () => {});
  }
  await pool.query('DELETE FROM daily_logs WHERE order_id = $1', [order.id]);

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

// ADMIN: Bulk delete approved orders → archive
app.delete('/api/orders/bulk/:status', requireAdmin, async (req, res) => {
  const status = req.params.status;
  const r = await pool.query('SELECT * FROM orders WHERE status = $1', [status]);
  const toDelete = r.rows.map(mapOrderRow);

  for (const o of toDelete) {
    if (o.screenshot) fs.unlink(path.join(UPLOADS_DIR, path.basename(o.screenshot)), () => {});
    await pool.query('DELETE FROM daily_logs WHERE order_id = $1', [o.id]);
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
    fs.unlink(path.join(UPLOADS_DIR, path.basename(order.screenshot)), () => {});
    await pool.query('UPDATE orders SET screenshot = NULL WHERE id = $1', [order.id]);
  }
  const updatedOrder = await findOrderById(order.id);
  res.json({ success: true, order: updatedOrder });
});

// ── Wallet API ────────────────────────────────────────────────
app.get('/api/wallet/:username', (req, res) => {
  const w = getWallet(req.params.username);
  res.json(w);
});

app.post('/api/wallet/:username/credit', requireAdmin, (req, res) => {
  const { amount, note } = req.body || {};
  if (!amount || isNaN(amount)) return res.status(400).json({ error: 'Invalid amount.' });
  creditWallet(req.params.username, parseFloat(amount), note || 'Admin credit');
  res.json({ success: true, wallet: getWallet(req.params.username) });
});

// ── Referral API ──────────────────────────────────────────────
app.get('/api/referral/:username', async (req, res) => {
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
app.get('/api/referral/:username/team', async (req, res) => {
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
app.get('/api/daily-rewards/:username', async (req, res) => {
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
app.get('/api/task-rewards/:username', (req, res) => {
  const username    = req.params.username.toLowerCase();
  const myCompleted = (taskLogsData[username] || []).map(l => l.taskId);
  const available   = tasksArray.filter(t => t.active && !myCompleted.includes(t.id));
  res.json(available);
});

app.get('/api/task-logs/:username', (req, res) => {
  const key  = req.params.username.toLowerCase();
  const logs = taskLogsData[key] || [];
  res.json(logs);
});

app.post('/api/task-rewards/:username/claim/:taskId', (req, res) => {
  const username = req.params.username;
  const key      = username.toLowerCase();
  const task     = tasksArray.find(t => t.id === req.params.taskId);
  if (!task || !task.active)
    return res.status(404).json({ error: 'Task not found o hindi na active.' });
  if (!taskLogsData[key]) taskLogsData[key] = [];
  const already = taskLogsData[key].some(l => l.taskId === task.id);
  if (already) return res.status(409).json({ error: 'Na-claim mo na ang task na ito.' });
  taskLogsData[key].push({
    taskId:      task.id,
    completedAt: new Date().toISOString(),
    reward:      task.reward,
  });
  saveTaskLogs();
  creditWallet(username, task.reward, `Task reward - ${task.title}`);
  res.json({ success: true });
});

app.get('/api/admin/tasks', requireAdmin, (req, res) => {
  res.json(tasksArray);
});

app.post('/api/admin/tasks', requireAdmin, (req, res) => {
  const { title, description, reward } = req.body || {};
  if (!title || !reward) return res.status(400).json({ error: 'Title at reward kailangan.' });
  const task = {
    id:          Date.now().toString(36),
    title,
    description: description || '',
    reward:      Number(reward) || 0,
    active:      true,
    createdAt:   new Date().toISOString(),
  };
  tasksArray.push(task);
  saveTasks();
  res.json({ success: true, task });
});

app.patch('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const task = tasksArray.find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: 'Task not found.' });
  const { title, description, reward, active } = req.body || {};
  if (title !== undefined)       task.title       = title;
  if (description !== undefined) task.description = description;
  if (reward !== undefined)      task.reward      = Number(reward) || 0;
  if (active !== undefined)      task.active      = !!active;
  saveTasks();
  res.json({ success: true, task });
});

app.delete('/api/admin/tasks/:id', requireAdmin, (req, res) => {
  const idx = tasksArray.findIndex(t => t.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Task not found.' });
  tasksArray.splice(idx, 1);
  saveTasks();
  res.json({ success: true });
});

// ── Withdrawal API ────────────────────────────────────────────

// CLIENT: eligibility check
app.get('/api/withdraw/eligibility/:username', async (req, res) => {
  res.json(await getWithdrawEligibility(req.params.username));
});

// CLIENT: submit withdrawal request
app.post('/api/withdraw', async (req, res) => {
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

  const withdrawal = {
    id:            Date.now().toString(36),
    username,
    amount:        amt,
    accountNumber,
    accountName,
    method:        method || 'GCash',
    notes:         notes || '',
    status:        'pending',
    feedback:      null,
    createdAt:     new Date().toISOString(),
    processedAt:   null,
  };
  withdrawalsArray.push(withdrawal);
  saveWithdrawals();
  console.log(`[WITHDRAW REQUEST] ${username} requested ₱${amt} via ${withdrawal.method}`);
  res.json({ success: true, withdrawalId: withdrawal.id, withdrawal });
});

// CLIENT: own withdrawal history
app.get('/api/withdraw/mine/:username', (req, res) => {
  const uname = req.params.username.toLowerCase();
  const mine  = withdrawalsArray
    .filter(w => w.username.toLowerCase() === uname)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(mine);
});

// ADMIN: all withdrawal requests
app.get('/api/admin/withdrawals', requireAdmin, (req, res) => {
  res.json(withdrawalsArray.slice().reverse());
});

// ADMIN: update withdrawal status
app.patch('/api/admin/withdrawals/:id', requireAdmin, (req, res) => {
  const w = withdrawalsArray.find(x => x.id === req.params.id);
  if (!w) return res.status(404).json({ error: 'Withdrawal not found.' });

  const { status, feedback } = req.body || {};

  if (status && status !== w.status) {

    // ── Mark as PAID (must already be approved) ───────────────
    if (status === 'paid') {
      if (w.status !== 'approved') {
        return res.status(400).json({
          error: 'I-approve muna ang withdrawal bago i-mark as Paid.'
        });
      }
      w.status      = 'paid';
      w.processedAt = new Date().toISOString();
      if (feedback !== undefined) w.feedback = feedback;
      saveWithdrawals();
      console.log(`[WITHDRAW PAID] ${w.username} -> ₱${w.amount} marked as paid.`);
      return res.json({ success: true, withdrawal: w });
    }

    // ── APPROVE: deduct balance + start new referral cycle ────
    if (status === 'approved' && w.status !== 'approved') {
      const wallet  = getWallet(w.username);
      const balance = parseFloat((wallet.income - wallet.withdrawn).toFixed(2));
      if (w.amount > balance) {
        return res.status(400).json({
          error: 'Hindi sapat ang balance ng user para sa withdrawal na ito.'
        });
      }
      wallet.withdrawn          = parseFloat((wallet.withdrawn + w.amount).toFixed(2));
      wallet.withdrawCycleStart = new Date().toISOString();
      saveWallets();
      w.processedAt = new Date().toISOString();
      console.log(`[WITHDRAW APPROVED] ${w.username} -> ₱${w.amount}. Bagong 7-day referral cycle nagsimula.`);
    }

    // ── REJECT / FLAG: ibalik ang pera kung dati nang approved ─
    if ((status === 'rejected' || status === 'flagged') && w.status === 'approved') {
      const wallet = getWallet(w.username);
      wallet.withdrawn = parseFloat((wallet.withdrawn - w.amount).toFixed(2));
      saveWallets();
      console.log(`[WITHDRAW REVERTED] ${w.username} +₱${w.amount} ibinalik sa balance.`);
    }

    w.status = status;
  }

  if (feedback !== undefined) w.feedback = feedback;
  saveWithdrawals();
  res.json({ success: true, withdrawal: w });
});

// ── Customer: change password ─────────────────────────────────
app.post('/api/change-password', async (req, res) => {
  const { phone: rawPhone, currentPassword, newPassword } = req.body || {};
  if(!rawPhone || !currentPassword || !newPassword)
    return res.status(400).json({ error: 'Lahat ng fields kailangan punan.' });
  const phone = normalizePhone(rawPhone);
  const user  = await findUserByPhone(phone);
  if(!user) return res.status(404).json({ error: 'User not found.' });
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if(!match) return res.status(401).json({ error: 'Mali ang current password.' });
  if(newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang new password.' });
  const newHash = await bcrypt.hash(newPassword, 10);
  await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [newHash, user.username]);
  res.json({ success: true });
});

// ── Admin: change password ────────────────────────────────────
app.post('/api/admin/change-password', requireAdmin, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  const adminUsername = req.adminUser.username;
  const admin = adminAccounts.find(
    a => a.username.toLowerCase() === adminUsername.toLowerCase()
  );
  if (!admin) return res.status(404).json({ error: 'Admin not found.' });
  const match = await bcrypt.compare(currentPassword, admin.passwordHash);
  if (!match) return res.status(401).json({ error: 'Mali ang current password.' });
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: 'Minimum 6 characters ang bagong password.' });
  admin.passwordHash = await bcrypt.hash(newPassword, 10);
  saveAdmins();
  res.json({ success: true });
});

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`ORB-X PH server running sa http://localhost:${PORT}`);
  const allUsers = await getAllUsers();
  const allOrders = await getAllOrders();
  console.log(`Users: ${allUsers.length} | Orders: ${allOrders.length} | Admins: ${adminAccounts.length}`);
});