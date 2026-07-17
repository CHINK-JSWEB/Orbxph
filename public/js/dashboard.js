// ── Auth guard ────────────────────────────────────────────────
const currentUser = localStorage.getItem('orbx_user');
const currentUserToken = localStorage.getItem('orbx_user_token');
if (!currentUser || !currentUserToken) window.location.href = 'index.html';

function authHeaders(extra){
  return Object.assign({ Authorization: 'Bearer ' + (currentUserToken || '') }, extra || {});
}

document.getElementById('dashUsername').textContent = currentUser || '';
const greetEl = document.getElementById('greetUser');
if(greetEl) greetEl.textContent = currentUser || '';

function logout(){
  localStorage.removeItem('orbx_user');
  localStorage.removeItem('orbx_user_phone');
  window.location.href = 'index.html';
}
document.getElementById('logoutBtn').addEventListener('click', logout);
document.getElementById('navLogout').addEventListener('click', e => { e.preventDefault(); logout(); });
document.getElementById('footerYear').textContent = new Date().getFullYear();

// ── SVG Icons ─────────────────────────────────────────────────
const ICON_CHECK = `<svg class="si" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_WARN  = `<svg class="si" viewBox="0 0 20 20" fill="none"><path d="M10 3L17.5 16H2.5L10 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14.5" r="0.8" fill="currentColor"/></svg>`;
const ICON_CLOCK = `<svg class="si" viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.5"/><path d="M10 6v4l2.5 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const ICON_GIFT  = `<svg class="si" viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 11h16M10 8v10" stroke="currentColor" stroke-width="1.5"/><path d="M10 8C10 8 7 8 7 5.5a3 3 0 016 0C13 8 10 8 10 8z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`;
const ICON_LOCK  = `<svg class="si" viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="13.5" r="1.5" fill="currentColor"/></svg>`;
const ICON_CLIP  = `<svg class="si" viewBox="0 0 20 20" fill="none"><rect x="5" y="3" width="10" height="14" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 3v-1h4v1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M8 8h4M8 11h4M8 14h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
const ICON_EYE   = `<svg class="si" viewBox="0 0 20 20" fill="none"><path d="M2 10s3-6 8-6 8 6 8 6-3 6-8 6-8-6-8-6z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="10" cy="10" r="2.5" stroke="currentColor" stroke-width="1.5"/></svg>`;

// ── Nav drawer ────────────────────────────────────────────────
const burgerBtn  = document.getElementById('burgerBtn');
const navDrawer  = document.getElementById('navDrawer');
const navOverlay = document.getElementById('navOverlay');
const navClose   = document.getElementById('navClose');
function openDrawer(){ navDrawer.classList.add('open'); navOverlay.classList.add('show'); }
function closeDrawer(){ navDrawer.classList.remove('open'); navOverlay.classList.remove('show'); }
burgerBtn.addEventListener('click', openDrawer);
navClose.addEventListener('click', closeDrawer);
navOverlay.addEventListener('click', closeDrawer);
document.querySelectorAll('.nav-link').forEach(link => {
  link.addEventListener('click', e => {
    if(link.getAttribute('href') === '#') e.preventDefault();
    if(link.id !== 'navProfileLink') closeDrawer();
  });
});

// ── Carousel ──────────────────────────────────────────────────
const track      = document.getElementById('carouselTrack');
const dotsWrap   = document.getElementById('carouselDots');
const slideCount = track.children.length;
let currentSlide = 0, autoTimer;
for(let i = 0; i < slideCount; i++){
  const dot = document.createElement('div');
  dot.className = 'dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => goToSlide(i));
  dotsWrap.appendChild(dot);
}
const dots = dotsWrap.children;
function goToSlide(index){
  currentSlide = (index + slideCount) % slideCount;
  track.style.transform = `translateX(-${currentSlide * 100}%)`;
  Array.from(dots).forEach((d, i) => d.classList.toggle('active', i === currentSlide));
}
function startAuto(){ clearInterval(autoTimer); autoTimer = setInterval(() => goToSlide(currentSlide + 1), 4500); }
function stopAuto(){ clearInterval(autoTimer); }
startAuto();
const carouselEl = document.getElementById('carousel');
carouselEl.addEventListener('mouseenter', stopAuto);
carouselEl.addEventListener('mouseleave', startAuto);
let startX = 0, isDragging = false;
function dragStart(x){ isDragging=true; startX=x; stopAuto(); }
function dragEnd(x){ if(!isDragging)return; isDragging=false; const diff=x-startX; if(Math.abs(diff)>40){ diff<0?goToSlide(currentSlide+1):goToSlide(currentSlide-1); } startAuto(); }
carouselEl.addEventListener('touchstart', e => dragStart(e.touches[0].clientX), {passive:true});
carouselEl.addEventListener('touchend',   e => dragEnd(e.changedTouches[0].clientX));
carouselEl.addEventListener('mousedown',  e => dragStart(e.clientX));
carouselEl.addEventListener('mouseup',    e => dragEnd(e.clientX));

// ── Products ──────────────────────────────────────────────────
const PRODUCTS = [
  { tier: 'Ordinary', price: 200,  image: 'assets/products/product1.png', desc: 'Entry-level package, perfect for getting started.' },
  { tier: 'Regular',  price: 500,  image: 'assets/products/product2.png', desc: 'A step up with more value for everyday needs.' },
  { tier: 'Premium',  price: 700,  image: 'assets/products/product3.png', desc: 'Our most popular option, balanced in price and value.' },
  { tier: 'Deluxe',   price: 1000, image: 'assets/products/product4.png', desc: 'Designed for those who want extra coverage.' },
  { tier: 'Elite',    price: 1500, image: 'assets/products/product5.png', desc: 'The complete package — our top tier offering.' },
];
const DAILY_RATE_PERCENT      = 0.10; // tugma sa DAILY_REWARD_RATE sa server.js
const BASE_L1_COMMISSION_RATE = 0.25; // Member/Regular rank L1 rate sa server.js

const shelf = document.getElementById('productShelf');
PRODUCTS.forEach((p, index) => {
  const dailyRate  = Math.round(p.price * DAILY_RATE_PERCENT);
  const commission = Math.round(p.price * BASE_L1_COMMISSION_RATE);
  const isPopular  = p.tier === 'Premium'; // palitan kung ibang tier ang gusto mong i-highlight
  const card = document.createElement('div');
  card.className = 'product-card';
  card.dataset.index = index;
  card.style.setProperty('--pc-delay', (index * 0.08) + 's');
  card.innerHTML = `
    <div class="pc-image-wrap">
      ${isPopular ? '<span class="pc-badge">⭐ Most Popular</span>' : ''}
      <img class="pc-image" src="${p.image}" alt="${p.tier}">
    </div>
    <div class="pc-body">
      <div class="pc-tier">${p.tier}</div>
      <div class="pc-price">&#8369;${p.price.toLocaleString()}</div>
      <div class="pc-info-row">
        <div class="pc-info-chip">
          <span class="pc-info-label">Daily Rate</span>
          <span class="pc-info-val pc-info-val--daily">&#8369;${dailyRate.toLocaleString()}</span>
        </div>
        <div class="pc-info-chip">
          <span class="pc-info-label">Commission</span>
          <span class="pc-info-val pc-info-val--comm">&#8369;${commission.toLocaleString()}</span>
        </div>
      </div>
      <div class="pc-desc">${p.desc}</div>
      <button class="pc-order-btn" data-index="${index}">Order Now</button>
    </div>
  `;
  shelf.appendChild(card);
});

let shelfDragging = false, shelfStartX = 0, shelfScrollLeft = 0;
shelf.addEventListener('mousedown', e => { shelfDragging=true; shelfStartX=e.pageX-shelf.offsetLeft; shelfScrollLeft=shelf.scrollLeft; });
shelf.addEventListener('mouseleave', () => { shelfDragging=false; });
shelf.addEventListener('mouseup', () => { shelfDragging=false; });
shelf.addEventListener('mousemove', e => { if(!shelfDragging)return; e.preventDefault(); const x=e.pageX-shelf.offsetLeft; shelf.scrollLeft=shelfScrollLeft-(x-shelfStartX); });

// ── Helpers ───────────────────────────────────────────────────
const BONUS_AMOUNT = 20;
const BONUS_MS     = 24 * 60 * 60 * 1000;

function formatCountdown(ms){
  if(ms <= 0) return '00:00:00';
  const s = Math.floor(ms/1000);
  return [Math.floor(s/3600), Math.floor((s%3600)/60), s%60].map(n=>String(n).padStart(2,'0')).join(':');
}
function formatDayCountdown(ms){
  if(ms <= 0) return '0d 00:00:00';
  const s = Math.floor(ms/1000);
  const d = Math.floor(s/86400);
  const h = Math.floor((s%86400)/3600);
  const m = Math.floor((s%3600)/60);
  const sec = s%60;
  return `${d}d ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}
function timeAgoLocal(iso){
  const d = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<60) return 'Just Now';
  if(d<3600) return Math.floor(d/60)+'m ago';
  if(d<86400) return Math.floor(d/3600)+'h ago';
  return Math.floor(d/86400)+'d ago';
}
function peso(n){
  return '&#8369;'+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
}

// ── Notifications ─────────────────────────────────────────────
const NOTIF_ICONS = {
  order_approved: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  order_flagged: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 3L17.5 16H2.5L10 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 9v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  referral_commission: `<svg viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 17c0-3.314 2.686-5 6-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  daily_reward: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  signup_bonus: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="8" width="16" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 11h16M10 8v10" stroke="currentColor" stroke-width="1.5"/></svg>`,
  new_referral: `<svg viewBox="0 0 20 20" fill="none"><circle cx="8" cy="6" r="3" stroke="currentColor" stroke-width="1.5"/><path d="M2 17c0-3.314 2.686-5 6-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  withdrawal_paid: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 10h8M11 8l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  withdrawal_approved: `<svg viewBox="0 0 20 20" fill="none"><rect x="2" y="4" width="16" height="12" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M6 10h8M11 8l2 2-2 2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  withdrawal_rejected: `<svg viewBox="0 0 20 20" fill="none"><path d="M10 3L17.5 16H2.5L10 3Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
  password_changed: `<svg viewBox="0 0 20 20" fill="none"><rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M7 9V6a3 3 0 016 0v3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  account_blocked: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" stroke="currentColor" stroke-width="1.5"/></svg>`,
  account_unblocked: `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="9" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 10.5l2.5 2.5 4.5-5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  announcement: `<svg viewBox="0 0 20 20" fill="none"><path d="M15 17h5l-1.4-1.4c-.4-.4-.6-.9-.6-1.4V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3C7.7 6.2 6 8.4 6 11v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
support_reply: `<svg viewBox="0 0 20 20" fill="none"><path d="M3 9a6 6 0 1112 0c0 3.3-2.7 6-6 6-1 0-1.9-.2-2.7-.6L3 16l1.6-3.3A5.9 5.9 0 013 9z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
};

const notifBellBtn  = document.getElementById('notifBellBtn');
const notifDropdown = document.getElementById('notifDropdown');
const notifBadge    = document.getElementById('notifBadge');
const notifList     = document.getElementById('notifList');

function notifTimeAgo(iso){
  const d = Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<60) return 'just now';
  if(d<3600) return Math.floor(d/60)+'m ago';
  if(d<86400) return Math.floor(d/3600)+'h ago';
  return Math.floor(d/86400)+'d ago';
}

async function loadNotifications(){
  try{
    const res  = await fetch('/api/notifications/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const data = await res.json();
    const { notifications, unreadCount } = data;

    if(unreadCount > 0){
      notifBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
      notifBadge.classList.remove('hidden');
    } else {
      notifBadge.classList.add('hidden');
    }

    if(!notifications.length){
      notifList.innerHTML = '<p class="notif-empty">No notifications yet.</p>';
      return;
    }

    notifList.innerHTML = notifications.map(n => `
      <div class="notif-item ${n.read ? '' : 'unread'}" data-id="${n.id}">
        <div class="notif-item-icon">${NOTIF_ICONS[n.type] || NOTIF_ICONS.announcement}</div>
        <div class="notif-item-body">
          <div class="notif-item-title">${escapeHtml(n.title)}</div>
          <div class="notif-item-msg">${escapeHtml(n.message)}</div>
          <div class="notif-item-time">${notifTimeAgo(n.createdAt)}</div>
        </div>
        ${!n.read ? '<div class="notif-item-dot"></div>' : ''}
      </div>
    `).join('');

  } catch(e){
    notifList.innerHTML = '<p class="notif-empty">Unable to load notifications.</p>';
  }
}

async function markNotificationRead(notificationId){
  try{
    await fetch('/api/notifications/'+encodeURIComponent(currentUser)+'/read', {
      method: 'PATCH',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify(notificationId ? { notificationId } : {})
    });
  } catch(e){}
}

if(notifBellBtn){
  notifBellBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle('show');
    if(notifDropdown.classList.contains('show')) loadNotifications();
  });
}
document.addEventListener('click', (e) => {
  if(notifDropdown && !notifDropdown.contains(e.target) && e.target !== notifBellBtn){
    notifDropdown.classList.remove('show');
  }
});
if(notifList){
  notifList.addEventListener('click', async (e) => {
    const item = e.target.closest('.notif-item');
    if(!item) return;
    if(item.classList.contains('unread')){
      await markNotificationRead(item.dataset.id);
      item.classList.remove('unread');
      const dot = item.querySelector('.notif-item-dot');
      if(dot) dot.remove();
      loadNotifications();
    }
  });
}
const markAllReadBtn = document.getElementById('markAllReadBtn');
if(markAllReadBtn){
  markAllReadBtn.addEventListener('click', async () => {
    await markNotificationRead(null);
    loadNotifications();
  });
}

loadNotifications();
setInterval(loadNotifications, 20000);

// ── Wallet ────────────────────────────────────────────────────
async function loadWallet(){
  try{
    const walletRes  = await fetch('/api/wallet/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const walletData = await walletRes.json();
    const incomeEl    = document.getElementById('walletIncome');
    const withdrawnEl = document.getElementById('walletWithdrawn');
    if(incomeEl)    incomeEl.innerHTML    = peso(walletData.income);
    if(withdrawnEl) withdrawnEl.innerHTML = peso(walletData.withdrawn);
    const dailyRes   = await fetch('/api/daily-rewards/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const dailyLogs  = await dailyRes.json();
    const dailyTotal = dailyLogs.reduce((s,l)=>s+(l.totalCredited||0),0);
    const dailyEl = document.getElementById('walletDailyReward');
    if(dailyEl) dailyEl.innerHTML = peso(dailyTotal);
    const taskLogsRes = await fetch('/api/task-logs/'+encodeURIComponent(currentUser), { headers: authHeaders() });
const taskLogs     = await taskLogsRes.json();
const taskLogsTotal = taskLogs.reduce((s,l)=>s+(l.reward||0),0);

let surveyTotal = 0;
try{
  const surveyRes  = await fetch('/api/survey/'+encodeURIComponent(currentUser), { headers: authHeaders() });
  const surveyData = await surveyRes.json();
  surveyTotal = surveyData.totalEarned || 0;
} catch(e){}
  } catch(e){}
}
loadWallet();
setInterval(loadWallet, 30000);

// ── Withdraw Modal ────────────────────────────────────────────
const withdrawOverlay = document.getElementById('withdrawOverlay');
const withdrawClose   = document.getElementById('withdrawClose');
const MIN_WITHDRAWAL  = 300;
const MIN_REFERRALS   = 2;
let cycleTimerInterval = null;
function clearCycleTimer(){ if(cycleTimerInterval){ clearInterval(cycleTimerInterval); cycleTimerInterval=null; } }

async function openWithdrawModal(){
  withdrawOverlay.classList.add('show');
  await renderWithdrawBody();
}

async function renderWithdrawBody(){
  const body = document.getElementById('withdrawBody');
  body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Naglo-load...</p>`;
  clearCycleTimer();
  let elig;
  try{
    const res = await fetch('/api/withdraw/eligibility/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    elig = await res.json();
  } catch(e){
    body.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Hindi makonekta sa server.</p>`;
    return;
  }

  let html = `
    <div class="withdraw-requirements">
      <div class="wr-title">
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13"><path d="M8 1.5l1.7 3.4 3.8.55-2.75 2.68.65 3.78L8 10.1l-3.4 1.81.65-3.78L2.5 5.45l3.8-.55L8 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/></svg>
        Requirements to Withdraw
      </div>
      <div class="wr-item" style="${elig.balanceMet?'':'opacity:.6'}">
        ${elig.balanceMet?ICON_CHECK:ICON_CLOCK}
        Minimum balance of <strong>&#8369;${MIN_WITHDRAWAL}</strong> &mdash; current: <strong>${peso(elig.balance)}</strong>
      </div>
      <div class="wr-item" style="${elig.referralsMet?'':'opacity:.6'}">
        ${elig.referralsMet?ICON_CHECK:ICON_CLOCK}
        At least <strong>${MIN_REFERRALS} verified referrals</strong> &mdash; current: <strong>${elig.invitesCount}/${elig.invitesNeeded}</strong>${elig.cycleStart?' (this cycle)':''}
      </div>
    </div>`;

  if(elig.hasPendingWithdrawal){
    html += `<div class="withdraw-locked-notice">${ICON_CLOCK}<div><div class="wln-title">May Pending Withdrawal Request</div><div class="wln-msg">Kasalukuyang nire-review ang iyong request. Karaniwang 1–2 hours ang processing.</div></div></div>`;
  } else if(elig.eligible){
    html += `
      <div style="display:flex;align-items:flex-start;gap:8px;font-size:11.5px;color:var(--muted);background:rgba(255,255,255,0.02);border:1px solid var(--border);border-radius:10px;padding:10px 13px;line-height:1.6;margin-bottom:14px;">
        <svg style="width:13px;height:13px;flex-shrink:0;color:var(--blue);margin-top:2px;" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.2"/><path d="M8 5v3.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="8" cy="11" r="0.7" fill="currentColor"/></svg>
        <span>Processing typically takes <strong style="color:var(--text)">1–2 hours</strong>. After a successful withdrawal, a new <strong style="color:var(--text)">7-day</strong> referral cycle begins.</span>
      </div>
      <div class="wd-form-group">
        <label class="wd-label">Amount to Withdraw</label>
        <input type="number" id="wdAmount" class="wd-input" placeholder="Min &#8369;${MIN_WITHDRAWAL}, max &#8369;${elig.balance}" min="${MIN_WITHDRAWAL}" max="${elig.balance}" step="1">
        <div class="wd-hint" id="wdRemainingPreview">Available balance: ${peso(elig.balance)}</div>
      </div>
      <div class="wd-form-group">
        <label class="wd-label">Payment Method</label>
        <select id="wdMethod" class="wd-input">
          <option value="GCash">GCash</option>
          <option value="Maya">Maya</option>
          <option value="Bank Transfer">Bank Transfer</option>
        </select>
      </div>
      <div class="wd-form-group">
        <label class="wd-label">Account Number</label>
        <input type="text" id="wdAccountNumber" class="wd-input" placeholder="09XXXXXXXXX">
      </div>
      <div class="wd-form-group">
        <label class="wd-label">Account Name</label>
        <input type="text" id="wdAccountName" class="wd-input" placeholder="Full name on account">
      </div>
      <div class="wd-form-group">
        <label class="wd-label">Notes <span style="color:var(--muted);font-weight:400;">(optional)</span></label>
        <textarea id="wdNotes" class="wd-input" rows="2" placeholder="Additional details..."></textarea>
      </div>
      <div class="form-error" id="wdFormError"></div>
      <button class="wallet-withdraw-btn" id="wdSubmitBtn" style="margin-top:4px;">Submit Withdrawal Request</button>`;
  } else {
    let countdownBlock = '';
    if(elig.cycleStart && elig.nextUnlockAt){
      countdownBlock = `<div class="aoc-timer" id="wdCycleTimer" style="margin-top:8px;">${formatDayCountdown(new Date(elig.nextUnlockAt).getTime()-Date.now())}</div>`;
    }
    html += `<div class="withdraw-locked-notice" id="withdrawLockedNotice">${ICON_LOCK}<div><div class="wln-title">Withdrawal Locked</div><div class="wln-msg">Complete the requirements above to unlock your withdrawal.</div>${countdownBlock}</div></div>`;
  }

  body.innerHTML = html;

  if(!elig.eligible && !elig.hasPendingWithdrawal && elig.cycleStart && elig.nextUnlockAt){
    const timerEl = document.getElementById('wdCycleTimer');
    if(timerEl){
      cycleTimerInterval = setInterval(()=>{
        const rem = new Date(elig.nextUnlockAt).getTime()-Date.now();
        if(rem<=0){ clearCycleTimer(); renderWithdrawBody(); return; }
        timerEl.textContent = formatDayCountdown(rem);
      },1000);
    }
  }

  if(elig.eligible && !elig.hasPendingWithdrawal){
    const amountInput = document.getElementById('wdAmount');
    amountInput.addEventListener('input', ()=>{
      const val = parseFloat(amountInput.value);
      const previewEl = document.getElementById('wdRemainingPreview');
      if(!previewEl) return;
      if(isNaN(val)||val<=0){ previewEl.textContent=`Available balance: ${peso(elig.balance)}`; previewEl.classList.remove('wd-hint--error'); return; }
      const remaining = parseFloat((elig.balance-val).toFixed(2));
      if(val<MIN_WITHDRAWAL){ previewEl.textContent=`Minimum withdrawal ay ₱${MIN_WITHDRAWAL}.`; previewEl.classList.add('wd-hint--error'); }
      else if(val>elig.balance){ previewEl.textContent=`Hindi sapat ang balance.`; previewEl.classList.add('wd-hint--error'); }
      else if(remaining>0&&remaining<MIN_WITHDRAWAL){ previewEl.textContent=`Matitirang balance (${peso(remaining)}) ay dapat ₱${MIN_WITHDRAWAL} pataas.`; previewEl.classList.add('wd-hint--error'); }
      else { previewEl.textContent=`Matitirang balance pagkatapos: ${peso(remaining)}`; previewEl.classList.remove('wd-hint--error'); }
    });

    document.getElementById('wdSubmitBtn').addEventListener('click', async ()=>{
      const errEl     = document.getElementById('wdFormError');
      const submitBtn = document.getElementById('wdSubmitBtn');
      errEl.style.display = 'none';
      const amount        = parseFloat(document.getElementById('wdAmount').value);
      const method        = document.getElementById('wdMethod').value;
      const accountNumber = document.getElementById('wdAccountNumber').value.trim();
      const accountName   = document.getElementById('wdAccountName').value.trim();
      const notes         = document.getElementById('wdNotes').value.trim();
      if(!amount||isNaN(amount)||amount<=0){ errEl.textContent='Maglagay ng valid na amount.'; errEl.style.display='block'; return; }
      if(!accountNumber||!accountName){ errEl.textContent='Punan ang account number at account name.'; errEl.style.display='block'; return; }
      submitBtn.disabled=true; submitBtn.textContent='Submitting...';
      try{
        const res  = await fetch('/api/withdraw',{method:'POST',headers:authHeaders({'Content-Type':'application/json'}),body:JSON.stringify({username:currentUser,amount,accountNumber,accountName,method,notes})});
        const data = await res.json();
        if(!res.ok){ errEl.textContent=data.error||'There was a problem submitting your request.'; errEl.style.display='block'; submitBtn.disabled=false; submitBtn.textContent='Submit Withdrawal Request'; return; }
        document.getElementById('withdrawBody').innerHTML=`<div class="order-success"><div class="order-success-badge">Submitted</div><h3>Withdrawal Requested</h3><p>Your request is now pending verification. Processing typically takes 1–2 hours. Thank you, ${currentUser}.</p></div>`;
        loadWallet();
      } catch(err){ errEl.textContent='Hindi makonekta sa server.'; errEl.style.display='block'; submitBtn.disabled=false; submitBtn.textContent='Submit Withdrawal Request'; }
    });
  }
}

document.getElementById('walletWithdrawBtn').addEventListener('click', openWithdrawModal);
withdrawClose.addEventListener('click', ()=>{ withdrawOverlay.classList.remove('show'); clearCycleTimer(); });
withdrawOverlay.addEventListener('click', e=>{ if(e.target===withdrawOverlay){ withdrawOverlay.classList.remove('show'); clearCycleTimer(); } });

// ── Orders Summary Bar ────────────────────────────────────────
let allOrdersTimers = [];
function clearAllTimers(){ allOrdersTimers.forEach(t=>clearInterval(t)); allOrdersTimers=[]; }

async function loadOrdersSummary(){
  const bar     = document.getElementById('swOrdersStrip');
  const osbLeft = document.getElementById('osbLeft');
  try{
    const res    = await fetch('/api/orders/mine/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const orders = await res.json();
    if(!orders.length){ if(bar) bar.style.display='none'; return; }
    const approved = orders.filter(o=>o.status==='approved');
    const flagged  = orders.filter(o=>o.status==='flagged');
    const pending  = orders.filter(o=>o.status!=='approved'&&o.status!=='flagged');
    let pills = '';
    if(approved.length) pills+=`<span class="osb-pill osb-pill--approved">${ICON_CHECK} ${approved.length} Approved</span>`;
    if(flagged.length)  pills+=`<span class="osb-pill osb-pill--flagged">${ICON_WARN} ${flagged.length} Not Approved</span>`;
    if(pending.length)  pills+=`<span class="osb-pill osb-pill--pending">${ICON_CLOCK} ${pending.length} Pending</span>`;
    if(osbLeft) osbLeft.innerHTML = pills;
    if(bar) bar.style.display = 'flex';
  } catch(e){ if(bar) bar.style.display='none'; }
}
loadOrdersSummary();
setInterval(loadOrdersSummary, 30000);

// ── All Orders Modal ──────────────────────────────────────────
const allOrdersOverlay = document.getElementById('allOrdersOverlay');
const allOrdersBody    = document.getElementById('allOrdersBody');
const allOrdersClose   = document.getElementById('allOrdersClose');

document.getElementById('viewAllOrdersBtn').addEventListener('click', ()=>{ allOrdersOverlay.classList.add('show'); renderAllOrders(); });
allOrdersClose.addEventListener('click', ()=>{ allOrdersOverlay.classList.remove('show'); clearAllTimers(); });
allOrdersOverlay.addEventListener('click', e=>{ if(e.target===allOrdersOverlay){ allOrdersOverlay.classList.remove('show'); clearAllTimers(); } });

async function renderAllOrders(){
  clearAllTimers();
  allOrdersBody.innerHTML='<p style="color:var(--muted);text-align:center;padding:24px 0;">Naglo-load...</p>';
  try{
    const [ordersRes, dailyRes] = await Promise.all([
      fetch('/api/orders/mine/'+encodeURIComponent(currentUser), { headers: authHeaders() }),
      fetch('/api/daily-rewards/'+encodeURIComponent(currentUser), { headers: authHeaders() })
    ]);
    const orders    = await ordersRes.json();
    const dailyLogs = await dailyRes.json();
    const dailyLogMap = {};
    dailyLogs.forEach(l => { dailyLogMap[l.orderId] = l; });

    if(!orders.length){ allOrdersBody.innerHTML='<p class="ao-empty">Wala ka pang order.</p>'; return; }

    const approved = orders.filter(o=>o.status==='approved');
    const flagged  = orders.filter(o=>o.status==='flagged');
    const pending  = orders.filter(o=>o.status!=='approved'&&o.status!=='flagged');
    let html = '';

    if(approved.length){
      html+=`<div class="ao-section"><div class="ao-section-title ao-section-title--approved">${ICON_CHECK} Approved Orders</div>`;
      approved.forEach(o=>{
        const log = dailyLogMap[o.id];
        let timerBlock = '';
        if(log){
          const nextCreditAt = new Date(log.lastCreditedAt).getTime() + BONUS_MS;
          const remaining    = nextCreditAt - Date.now();
          const crediting    = remaining <= 0;
          timerBlock = `
            <div class="aoc-timer-wrap">
              <div class="aoc-timer-label">${crediting?`<span class="bonus-ready-label">${ICON_GIFT} Kinre-credit na...</span>`:'<span>Next Daily Reward In</span>'}</div>
              <div class="aoc-timer ${crediting?'done':''}" id="aotimer-${o.id}">${crediting?'Please wait...':formatCountdown(remaining)}</div>
              <div class="aoc-timer-sub">Araw-araw kang makakatanggap ng +&#8369;${Number(log.dailyReward).toLocaleString()} (10% ng package) habang approved ang order na ito.</div>
              <div class="aoc-timer-sub" style="margin-top:4px;">Kabuuang natanggap: &#8369;${Number(log.totalCredited||0).toLocaleString()}</div>
            </div>`;
        }
        html+=`<div class="active-order-card" data-id="${o.id}">
          <div class="aoc-header"><div class="aoc-badge">${ICON_CHECK} APPROVED</div><div class="aoc-tier">${o.tier}</div></div>
          <div class="aoc-price">&#8369;${Number(o.price).toLocaleString()}</div>
          <div class="aoc-meta">${o.method} &middot; Approved ${timeAgoLocal(o.approvedAt||o.createdAt)}</div>
          ${timerBlock}
        </div>`;
      });
      html+=`</div>`;
    }

    if(flagged.length){
      html+=`<div class="ao-section"><div class="ao-section-title ao-section-title--flagged">${ICON_WARN} Not Approved</div>`;
      flagged.forEach(o=>{
        html+=`<div class="flagged-order-card">
          <div class="flagged-order-header"><span class="flagged-badge">${ICON_WARN} NOT APPROVED</span><span class="flagged-tier">${o.tier}</span></div>
          <div class="flagged-price">&#8369;${Number(o.price).toLocaleString()}</div>
          <div class="flagged-reason"><div class="flagged-reason-label">${ICON_CLIP} Dahilan:</div><div class="flagged-reason-msg">${escapeHtml(o.feedback||'Ang iyong order ay hindi na-approve.')}</div></div>
          <div class="flagged-notice">${ICON_LOCK} Hindi na maaprubahan ang order na ito. Makipag-ugnayan sa Customer Service para sa tulong.</div>
        </div>`;
      });
      html+=`</div>`;
    }

    if(pending.length){
      html+=`<div class="ao-section"><div class="ao-section-title ao-section-title--pending">${ICON_CLOCK} Pending Orders</div>`;
      pending.forEach(o=>{
        const isReviewed = o.status==='reviewed';
        html+=`<div class="pending-order-card">
          <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;"><span class="pending-badge">${isReviewed?ICON_EYE:ICON_CLOCK} ${isReviewed?'Reviewed':'Pending'}</span><span class="pending-tier">${o.tier}</span></div>
          <div class="pending-price">&#8369;${Number(o.price).toLocaleString()}</div>
          <div class="pending-meta">${o.method} &middot; ${timeAgoLocal(o.createdAt)}</div>
        </div>`;
      });
      html+=`</div>`;
    }

    allOrdersBody.innerHTML = html;

    approved.forEach(o=>{
      const log = dailyLogMap[o.id];
      if(!log) return;
      const nextCreditAt = new Date(log.lastCreditedAt).getTime() + BONUS_MS;
      const el = document.getElementById('aotimer-'+o.id);
      if(!el) return;
      if(Date.now() >= nextCreditAt){
        const t = setTimeout(() => renderAllOrders(), 15000);
        allOrdersTimers.push(t);
        return;
      }
      const interval = setInterval(()=>{
        const rem = nextCreditAt - Date.now();
        if(rem<=0){ clearInterval(interval); renderAllOrders(); return; }
        el.textContent = formatCountdown(rem);
      },1000);
      allOrdersTimers.push(interval);
    });
  } catch(e){ allOrdersBody.innerHTML='<p class="ao-empty">Hindi makonekta sa server.</p>'; }
}

// ── Order Modal ───────────────────────────────────────────────
const orderOverlay = document.getElementById('orderOverlay');
const orderBody    = document.getElementById('orderBody');

function renderPaymentMethods(product){
  orderBody.innerHTML = `
    <div class="order-summary-row"><span>Package</span><span>${product.tier}</span></div>
    <div class="order-summary-row"><span>Amount</span><span>&#8369;${product.price.toLocaleString()}</span></div>
    <div class="pm-label">Choose Payment Method</div>
    <div class="pm-grid">
      <button class="pm-card" id="pmGcash">
        <div class="pm-logo-slot"><img src="assets/payment/gcash.png" alt="GCash" onerror="this.style.display='none';this.parentElement.classList.add('empty')"></div>
        <span class="pm-name">GCash</span>
      </button>
      <div class="pm-card disabled">
        <span class="pm-soon">SOON</span>
        <div class="pm-logo-slot"><img src="assets/payment/maya.jpg" alt="Maya" onerror="this.style.display='none';this.parentElement.classList.add('empty')"></div>
        <span class="pm-name">Maya</span>
      </div>
      <div class="pm-card disabled">
        <span class="pm-soon">SOON</span>
        <div class="pm-logo-slot"><img src="assets/payment/bank.jpg" alt="Bank Transfer" onerror="this.style.display='none';this.parentElement.classList.add('empty')"></div>
        <span class="pm-name">Bank Transfer</span>
      </div>
    </div>`;
  document.getElementById('pmGcash').addEventListener('click', ()=>renderGcashDetails(product));
}

let qrPollInterval = null;

function clearQrPoll(){
  if(qrPollInterval){ clearInterval(qrPollInterval); qrPollInterval = null; }
}

function renderGcashDetails(product){
  orderBody.innerHTML = `
    <button class="pm-back" id="pmBack">&larr; Back to payment methods</button>
    <div class="gcash-panel">
      <div class="pm-logo-slot lg"><img src="assets/payment/gcash.png" alt="GCash" onerror="this.style.display='none';this.parentElement.classList.add('empty')"></div>
      <div class="gcash-label">Generating QR Code...</div>
      <div class="gcash-amount">&#8369;${product.price.toLocaleString()}</div>
      <div style="text-align:center;padding:30px 0;color:var(--muted);font-size:13px;">Please wait...</div>
    </div>`;

  document.getElementById('pmBack').addEventListener('click', ()=>{
    clearQrPoll();
    renderPaymentMethods(product);
  });

  createQrPhOrder(product);
}

async function createQrPhOrder(product){
  try{
    const res = await fetch('/api/orders/paymongo/create', {
      method: 'POST',
      headers: authHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ username: currentUser, tier: product.tier })
    });
    const data = await res.json();

    if(!res.ok){
      orderBody.innerHTML = `
        <button class="pm-back" id="pmBack">&larr; Back to payment methods</button>
        <div class="order-confirm-note" style="color:#ff8080;border-color:rgba(255,90,90,0.3);background:rgba(255,90,90,0.06);">
          ${data.error || 'Hindi nagawa ang QR code. Subukan ulit.'}
        </div>`;
      document.getElementById('pmBack').addEventListener('click', ()=>renderPaymentMethods(product));
      return;
    }

    renderQrDisplay(product, data.orderId, data.qrImageUrl);
    startPollingPaymentStatus(product, data.orderId);

  } catch(err){
    orderBody.innerHTML = `
      <button class="pm-back" id="pmBack">&larr; Back to payment methods</button>
      <div class="order-confirm-note" style="color:#ff8080;border-color:rgba(255,90,90,0.3);background:rgba(255,90,90,0.06);">
        Hindi makonekta sa server. Subukan ulit.
      </div>`;
    document.getElementById('pmBack').addEventListener('click', ()=>renderPaymentMethods(product));
  }
}

function renderQrDisplay(product, orderId, qrImageUrl){
  orderBody.innerHTML = `
    <button class="pm-back" id="pmBack">&larr; Back to payment methods</button>
    <div class="gcash-panel">
      <div class="gcash-label">Scan to Pay via GCash / QR Ph</div>
      <div class="gcash-amount">&#8369;${product.price.toLocaleString()}</div>
      <div style="display:flex;justify-content:center;padding:16px 0;">
        ${qrImageUrl
          ? `<img src="${qrImageUrl}" alt="QR Ph Code" style="width:220px;height:220px;border-radius:14px;background:#fff;padding:10px;">`
          : `<div style="color:var(--muted);font-size:13px;">Walang available na QR code.</div>`}
      </div>
      <div class="order-confirm-note" id="qrStatusNote">
        <span id="qrStatusText">⏳ Hinihintay ang pagbabayad...</span>
      </div>
    </div>
    <div style="text-align:center;font-size:12px;color:var(--muted);margin-top:14px;">
      I-scan ang QR gamit ang GCash app mo. Awtomatikong ma-cconfirm ang order mo pagkatapos magbayad — hindi mo na kailangan mag-upload ng screenshot.
    </div>`;

  document.getElementById('pmBack').addEventListener('click', ()=>{
    clearQrPoll();
    renderPaymentMethods(product);
  });
}

function startPollingPaymentStatus(product, orderId){
  clearQrPoll();
  qrPollInterval = setInterval(async () => {
    try{
      const res  = await fetch('/api/orders/paymongo/status/'+encodeURIComponent(orderId), { headers: authHeaders() });
      const data = await res.json();

      if(data.status === 'approved'){
        clearQrPoll();
        orderBody.innerHTML = `<div class="order-success"><div class="order-success-badge">Paid</div><h3>Payment Confirmed!</h3><p>Na-approve na ang order mo para sa ${product.tier}. Salamat, ${currentUser}!</p></div>`;
        loadOrdersSummary();
        loadWallet();
      }
    } catch(err){
      // Tahimik na mag-continue ang polling kahit magka-error minsan
    }
  }, 5000); // check every 5 seconds

  // Auto-stop polling after 10 minutes (QR codes usually expire)
  setTimeout(() => {
    if(qrPollInterval){
      clearQrPoll();
      const statusText = document.getElementById('qrStatusText');
      if(statusText) statusText.textContent = '⚠️ Nag-expire na ang QR code. Bumalik sa payment methods para bumuo ng bago.';
    }
  }, 10 * 60 * 1000);
}
const productDetailsOverlay = document.getElementById('productDetailsOverlay');
const productDetailsBody    = document.getElementById('productDetailsBody');
const productDetailsClose   = document.getElementById('productDetailsClose');

function openProductDetails(product){
  const dailyRate = Math.round(product.price * DAILY_RATE_PERCENT);
  document.getElementById('pdTierLabel').textContent = product.tier + ' Package';
  productDetailsBody.innerHTML = `
    <div class="pd-image-wrap"><img src="${product.image}" alt="${product.tier}"></div>
    <div class="pd-tier">${product.tier}</div>
    <div class="pd-price">&#8369;${product.price.toLocaleString()}</div>
    <div class="pd-rate-box">
      <div class="pd-rate-icon">
        <svg viewBox="0 0 20 20" fill="none" width="16" height="16"><circle cx="10" cy="10" r="3.5" stroke="currentColor" stroke-width="1.5"/><path d="M10 2v2M10 16v2M2 10h2M16 10h2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      </div>
      <div>
        <div class="pd-rate-label">Daily Rate</div>
        <div class="pd-rate-val">&#8369;${dailyRate.toLocaleString()} / day</div>
      </div>
    </div>
    <div class="pd-desc">${product.desc}</div>
    <button class="pd-order-btn" id="pdOrderBtn">Order Now</button>
  `;
  document.getElementById('pdOrderBtn').addEventListener('click', () => {
    productDetailsOverlay.classList.remove('show');
    renderPaymentMethods(product);
    orderOverlay.classList.add('show');
  });
  productDetailsOverlay.classList.add('show');
}
productDetailsClose.addEventListener('click', () => productDetailsOverlay.classList.remove('show'));
productDetailsOverlay.addEventListener('click', e => { if(e.target === productDetailsOverlay) productDetailsOverlay.classList.remove('show'); });

shelf.addEventListener('click', e => {
  if(Math.abs(shelf.scrollLeft - shelfScrollLeft) > 5) return;
  const orderBtn = e.target.closest('.pc-order-btn');
  if(orderBtn){
    const product = PRODUCTS[orderBtn.dataset.index];
    renderPaymentMethods(product);
    orderOverlay.classList.add('show');
    return;
  }
  const card = e.target.closest('.product-card');
  if(card){
    const product = PRODUCTS[card.dataset.index];
    openProductDetails(product);
  }
});

document.getElementById('orderClose').addEventListener('click', ()=>orderOverlay.classList.remove('show'));
orderOverlay.addEventListener('click', e=>{ if(e.target===orderOverlay) orderOverlay.classList.remove('show'); });
const SURVEY_REWARD_PHP = 0.50;

const taskHubOverlay = document.getElementById('taskHubOverlay');
const taskHubClose    = document.getElementById('taskHubClose');
const taskRewardStat  = document.getElementById('taskRewardStat');
const surveyTaskItem  = document.getElementById('surveyTaskItem');
const surveyTaskDesc  = document.getElementById('surveyTaskDesc');

const surveyOverlay = document.getElementById('surveyOverlay');
const surveyClose   = document.getElementById('surveyClose');
const surveyBack    = document.getElementById('surveyBack');
const surveyBody    = document.getElementById('surveyBody');

let surveyRunningState = { answeredCount: 0, totalQuestions: 0, correctCount: 0, totalEarned: 0 };

function escapeHtml(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

async function openTaskHub(){
  if(!taskHubOverlay) return;
  taskHubOverlay.classList.add('show');
  await refreshSurveyTaskPreview();
}
function closeTaskHub(){
  if(taskHubOverlay) taskHubOverlay.classList.remove('show');
}

if(taskRewardStat) taskRewardStat.addEventListener('click', openTaskHub);
if(taskHubClose)   taskHubClose.addEventListener('click', closeTaskHub);
if(taskHubOverlay) taskHubOverlay.addEventListener('click', e => {
  if(e.target === taskHubOverlay) closeTaskHub();
});

async function refreshSurveyTaskPreview(){
  if(!surveyTaskDesc) return;
  try{
    const res  = await fetch('/api/survey/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const data = await res.json();
    const remaining = data.totalQuestions - data.answeredCount;
    if(remaining <= 0){
      surveyTaskDesc.textContent = `You've answered all questions for today. Come back tomorrow for a new set.`;
    } else {
      surveyTaskDesc.textContent = `${remaining} question${remaining === 1 ? '' : 's'} remaining. Earn ₱${SURVEY_REWARD_PHP.toFixed(2)} per correct answer.`;
    }
  } catch(e){
    surveyTaskDesc.textContent = `10 new questions daily. Earn ₱${SURVEY_REWARD_PHP.toFixed(2)} per correct answer.`;
  }
}

if(surveyTaskItem) surveyTaskItem.addEventListener('click', () => {
  closeTaskHub();
  surveyOverlay.classList.add('show');
  loadSurvey();
});
if(surveyClose) surveyClose.addEventListener('click', () => surveyOverlay.classList.remove('show'));
if(surveyBack)  surveyBack.addEventListener('click', () => {
  surveyOverlay.classList.remove('show');
  openTaskHub();
});
if(surveyOverlay) surveyOverlay.addEventListener('click', e => {
  if(e.target === surveyOverlay) surveyOverlay.classList.remove('show');
});

async function loadSurvey(){
  if(!surveyBody) return;
  surveyBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Loading...</p>`;
  try{
    const res  = await fetch('/api/survey/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const data = await res.json();
    surveyRunningState = {
      answeredCount:   data.answeredCount,
      totalQuestions:  data.totalQuestions,
      correctCount:    data.correctCount,
      totalEarned:     data.totalEarned,
    };
    renderSurvey(data.questions);
  } catch(e){
    surveyBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Unable to connect to the server.</p>`;
  }
}

function renderProgressAndBanner(){
  const { answeredCount, totalQuestions, correctCount, totalEarned } = surveyRunningState;
  const pct = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const progLabel = document.querySelector('#surveyProgressCount');
  const progFill  = document.querySelector('#surveyProgressFill');
  const earnedVal = document.querySelector('#surveyEarnedVal');
  const earnedLbl = document.querySelector('#surveyEarnedLabel');
  if(progLabel) progLabel.textContent = `${answeredCount} / ${totalQuestions}`;
  if(progFill)  progFill.style.width = pct + '%';
  if(earnedVal) earnedVal.innerHTML = `&#8369;${Number(totalEarned).toFixed(2)}`;
  if(earnedLbl) earnedLbl.textContent = `Earned today (${correctCount} correct)`;
}

function renderSurvey(questions){
  const { answeredCount, totalQuestions } = surveyRunningState;

  let html = `
    <div class="survey-progress-bar-wrap">
      <div class="survey-progress-label">
        <span>Progress</span>
        <span id="surveyProgressCount">0 / 0</span>
      </div>
      <div class="survey-progress-track">
        <div class="survey-progress-fill" id="surveyProgressFill" style="width:0%"></div>
      </div>
    </div>
    <div class="survey-earned-banner">
      <span class="survey-earned-label" id="surveyEarnedLabel">Earned today</span>
      <span class="survey-earned-val" id="surveyEarnedVal">&#8369;0.00</span>
    </div>`;

  if(!questions.length){
    html += `<div class="survey-complete-msg"><strong>No questions available right now.</strong>Please check back later.</div>`;
  } else if(answeredCount >= totalQuestions){
    html += `<div class="survey-complete-msg"><strong>You're done for today! 🎉</strong>Come back tomorrow for a new set of questions.</div>`;
    questions.forEach((q, idx) => { html += renderQuestionCard(q, idx); });
  } else {
    questions.forEach((q, idx) => { html += renderQuestionCard(q, idx); });
  }

  surveyBody.innerHTML = html;
  renderProgressAndBanner();

  questions.forEach(q => {
    if(q.answered) return;
    bindQuestionCard(q);
  });
}

function renderQuestionCard(q, idx){
  const optionsHtml = q.options.map(opt => {
    let cls = 'survey-option';
    if(q.answered){
      cls += ' survey-option--locked';
      if(opt === q.selectedAnswer && q.isCorrect)      cls += ' survey-option--correct';
      else if(opt === q.selectedAnswer && !q.isCorrect) cls += ' survey-option--wrong';
    }
    return `
      <div class="${cls}" data-value="${escapeHtml(opt)}">
        <span class="survey-option-radio"></span>
        <span>${escapeHtml(opt)}</span>
      </div>`;
  }).join('');

  let resultTag = '';
  if(q.answered){
    resultTag = q.isCorrect
      ? `<div class="survey-result-tag survey-result-tag--correct">✓ Correct! +₱${SURVEY_REWARD_PHP.toFixed(2)}</div>`
      : `<div class="survey-result-tag survey-result-tag--wrong">✗ Incorrect</div>`;
  }

  return `
    <div class="survey-question-card" id="sq-${q.id}">
      <div class="survey-question-num">Question ${idx + 1}</div>
      <div class="survey-question-text">${escapeHtml(q.question)}</div>
      <div class="survey-options">${optionsHtml}</div>
      ${q.answered ? resultTag : `<button class="survey-submit-btn" disabled>Submit Answer</button>`}
    </div>`;
}

function bindQuestionCard(q){
  const card = document.getElementById('sq-' + q.id);
  if(!card) return;
  const options   = card.querySelectorAll('.survey-option');
  const submitBtn = card.querySelector('.survey-submit-btn');
  let selected = null;

  options.forEach(opt => {
    opt.addEventListener('click', () => {
      options.forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selected = opt.dataset.value;
      if(submitBtn) submitBtn.disabled = false;
    });
  });

  if(!submitBtn) return;
  submitBtn.addEventListener('click', async () => {
    if(!selected || submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    try{
      const res = await fetch(`/api/survey/${encodeURIComponent(currentUser)}/answer`, {
        method: 'POST',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ questionId: q.id, selectedAnswer: selected })
      });
      const result = await res.json();

      if(!res.ok){
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Answer';
        alert(result.error || 'Something went wrong while submitting your answer.');
        return;
      }

      options.forEach(opt => {
        opt.classList.add('survey-option--locked');
        if(opt.dataset.value === selected){
          opt.classList.add(result.isCorrect ? 'survey-option--correct' : 'survey-option--wrong');
        }
      });
      const resultTag = document.createElement('div');
      resultTag.className = 'survey-result-tag ' + (result.isCorrect ? 'survey-result-tag--correct' : 'survey-result-tag--wrong');
      resultTag.textContent = result.isCorrect
        ? `✓ Correct! +₱${SURVEY_REWARD_PHP.toFixed(2)}`
        : `✗ Incorrect`;
      submitBtn.replaceWith(resultTag);

      surveyRunningState.answeredCount += 1;
      if(result.isCorrect){
        surveyRunningState.correctCount += 1;
        surveyRunningState.totalEarned = parseFloat((surveyRunningState.totalEarned + (result.reward || 0)).toFixed(2));
      }
      renderProgressAndBanner();
      refreshSurveyTaskPreview();
      if(typeof loadWallet === 'function') loadWallet();

      if(surveyRunningState.answeredCount >= surveyRunningState.totalQuestions){
        const doneMsg = document.createElement('div');
        doneMsg.className = 'survey-complete-msg';
        doneMsg.innerHTML = `<strong>You're done for today! 🎉</strong>Come back tomorrow for a new set of questions.`;
        surveyBody.insertBefore(doneMsg, document.getElementById('sq-' + q.id));
      }
    } catch(err){
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Answer';
      alert('Unable to connect to the server.');
    }
  });
}
const dailyRewardStat    = document.getElementById('dailyRewardStat');
const dailyRewardOverlay = document.getElementById('dailyRewardOverlay');
const dailyRewardClose   = document.getElementById('dailyRewardClose');
const dailyRewardBody    = document.getElementById('dailyRewardBody');

if(dailyRewardStat)    dailyRewardStat.addEventListener('click', openDailyRewardModal);
if(dailyRewardClose)   dailyRewardClose.addEventListener('click', () => dailyRewardOverlay.classList.remove('show'));
if(dailyRewardOverlay) dailyRewardOverlay.addEventListener('click', e => {
  if(e.target === dailyRewardOverlay) dailyRewardOverlay.classList.remove('show');
});

async function openDailyRewardModal(){
  dailyRewardOverlay.classList.add('show');
  dailyRewardBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Loading...</p>`;
  try{
    const res  = await fetch('/api/daily-rewards/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const logs = await res.json();
    renderDailyRewardBody(logs);
  } catch(e){
    dailyRewardBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Unable to connect to the server.</p>`;
  }
}

function renderDailyRewardBody(logs){
  if(!logs.length){
    dailyRewardBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">You don't have any active packages earning daily rewards yet.</p>`;
    return;
  }

  const totalDaily     = logs.reduce((s,l)=>s+(l.dailyReward||0),0);
  const totalCredited  = logs.reduce((s,l)=>s+(l.totalCredited||0),0);

  let html = `
    <div class="survey-earned-banner" style="margin-bottom:16px;">
      <span class="survey-earned-label">Total credited so far</span>
      <span class="survey-earned-val">${peso(totalCredited)}</span>
    </div>
    <div class="wd-hint" style="margin-bottom:14px;">Combined daily rate from all active packages: <strong style="color:var(--text)">${peso(totalDaily)}/day</strong></div>
  `;

  logs
    .slice()
    .sort((a,b) => new Date(b.startedAt) - new Date(a.startedAt))
    .forEach(log => {
      const startedDate = new Date(log.startedAt).toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
      html += `
        <div class="dr-item">
          <div class="dr-item-left">
            <div class="dr-item-tier">${escapeHtml(log.tier)}</div>
            <div class="dr-item-date">Started ${startedDate}</div>
          </div>
          <div class="dr-item-right">
            <div class="dr-item-amount">+${peso(log.dailyReward)}/day</div>
            <div class="dr-item-rate">Total earned: ${peso(log.totalCredited)}</div>
          </div>
        </div>`;
    });

  dailyRewardBody.innerHTML = html;
}
const navLeaderboardLink = document.getElementById('navLeaderboardLink');
const leaderboardOverlay = document.getElementById('leaderboardOverlay');
const leaderboardClose   = document.getElementById('leaderboardClose');
const leaderboardBody    = document.getElementById('leaderboardBody');

if(navLeaderboardLink) navLeaderboardLink.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('show');
  setTimeout(openLeaderboard, 150);
});
if(leaderboardClose)   leaderboardClose.addEventListener('click', () => leaderboardOverlay.classList.remove('show'));
if(leaderboardOverlay) leaderboardOverlay.addEventListener('click', e => {
  if(e.target === leaderboardOverlay) leaderboardOverlay.classList.remove('show');
});

async function openLeaderboard(){
  leaderboardOverlay.classList.add('show');
  leaderboardBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Loading...</p>`;
  try{
    const res  = await fetch('/api/leaderboard?username='+encodeURIComponent(currentUser));
    const data = await res.json();
    renderLeaderboard(data);
  } catch(e){
    leaderboardBody.innerHTML = `<p style="color:var(--muted);text-align:center;padding:24px 0;">Unable to connect to the server.</p>`;
  }
}

function rankBadgeClass(rankName){
  return 'rank-badge rank-badge--' + rankName.toLowerCase();
}

function renderLeaderboard(data){
  const { top, myEntry } = data;
  let html = '';

  if(myEntry){
    const inTop = top.some(e => e.username.toLowerCase() === currentUser.toLowerCase());
    html += `
      <div class="lb-my-card">
        <div class="lb-my-card-left">
          <span class="lb-my-card-label">Your Position</span>
          <span class="lb-my-card-pos">#${myEntry.position}${inTop ? '' : ' (outside top 20)'}</span>
        </div>
        <div class="lb-my-card-right">
          <span class="${rankBadgeClass(myEntry.rankName)}" style="margin-left:0;">${myEntry.rankName}</span>
          <div class="lb-my-card-earned">${peso(myEntry.totalEarned)}</div>
        </div>
      </div>`;
  }

  if(!top.length){
    html += `<div class="lb-empty">No referral activity yet. Be the first to invite and top the leaderboard!</div>`;
    leaderboardBody.innerHTML = html;
    return;
  }

  html += `<div class="lb-list">`;
  top.forEach(entry => {
    const isYou = entry.username.toLowerCase() === currentUser.toLowerCase();
    let posClass = 'lb-position';
    let posLabel = '#' + entry.position;
    if(entry.position === 1){ posClass += ' lb-position--top1'; posLabel = '🥇'; }
    else if(entry.position === 2){ posClass += ' lb-position--top2'; posLabel = '🥈'; }
    else if(entry.position === 3){ posClass += ' lb-position--top3'; posLabel = '🥉'; }

    html += `
      <div class="lb-item ${isYou ? 'lb-item--you' : ''}">
        <div class="${posClass}">${posLabel}</div>
        <div class="lb-user">
          <div class="lb-username${isYou ? ' lb-username--you' : ''}">${escapeHtml(entry.username)}</div>
          <div class="lb-meta"><span class="${rankBadgeClass(entry.rankName)}" style="margin-left:0;">${entry.rankName}</span></div>
        </div>
        <div class="lb-stats">
          <div class="lb-earned">${peso(entry.totalEarned)}</div>
          <div class="lb-invites">${entry.l1Count} invite${entry.l1Count === 1 ? '' : 's'}</div>
        </div>
      </div>`;
  });
  html += `</div>`;

  leaderboardBody.innerHTML = html;
}
// ══════════════════════════════════════════════════════════════
//  LIVE CHAT
// ══════════════════════════════════════════════════════════════
let supportPollInterval = null;
let supportLastCount = 0;
let supportSelectedFile = null;

function escapeHtmlChat(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}
function supportTimeFmt(iso){
  return new Date(iso).toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
}

async function loadSupportChat(scrollDown){
  try{
    const res  = await fetch('/api/support/'+encodeURIComponent(currentUser), { headers: authHeaders() });
    const data = await res.json();
    const list = document.getElementById('supportMsgList');
    if(!data.messages.length){
      list.innerHTML = '<p class="support-empty">Wala pang mensahe. Simulan ang usapan sa ibaba.</p>';
    } else {
      list.innerHTML = data.messages.map(m => `
        <div class="support-bubble support-bubble--${m.senderType}">
          ${m.attachmentUrl ? `<img class="support-bubble-img" src="${m.attachmentUrl}" data-full="${m.attachmentUrl}" alt="attachment">` : ''}
          ${m.message ? `<div>${escapeHtmlChat(m.message)}</div>` : ''}
          <div class="support-bubble-time">${m.senderType === 'admin' ? 'Admin · ' : ''}${supportTimeFmt(m.createdAt)}</div>
        </div>`).join('');
    }
    if(scrollDown || data.messages.length !== supportLastCount){
      list.scrollTop = list.scrollHeight;
    }
    supportLastCount = data.messages.length;
    fetch('/api/support/'+encodeURIComponent(currentUser)+'/read', { method:'PATCH', headers: authHeaders() });
    list.querySelectorAll('.support-bubble-img').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('chatImgFull').src = img.dataset.full;
        document.getElementById('chatImgOverlay').classList.add('show');
      });
    });
  } catch(e){}
}

function openSupportChat(){
  document.getElementById('supportChatOverlay').classList.add('show');
  loadSupportChat(true);
  clearInterval(supportPollInterval);
  supportPollInterval = setInterval(() => loadSupportChat(false), 5000);
}
function closeSupportChat(){
  document.getElementById('supportChatOverlay').classList.remove('show');
  clearInterval(supportPollInterval);
}

const navSupportChatLink = document.getElementById('navSupportChatLink');
if(navSupportChatLink) navSupportChatLink.addEventListener('click', e => {
  e.preventDefault();
  document.getElementById('navDrawer').classList.remove('open');
  document.getElementById('navOverlay').classList.remove('show');
  setTimeout(openSupportChat, 150);
});
document.getElementById('supportChatClose').addEventListener('click', closeSupportChat);
document.getElementById('supportChatOverlay').addEventListener('click', e => {
  if(e.target.id === 'supportChatOverlay') closeSupportChat();
});

// ── Attach photo ──────────────────────────────────────────────
const supportAttachBtn     = document.getElementById('supportAttachBtn');
const supportAttachInput   = document.getElementById('supportAttachInput');
const supportAttachPreview = document.getElementById('supportAttachPreview');

if(supportAttachBtn) supportAttachBtn.addEventListener('click', () => supportAttachInput.click());
if(supportAttachInput) supportAttachInput.addEventListener('change', () => {
  const file = supportAttachInput.files[0];
  if(!file) return;
  supportSelectedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    supportAttachPreview.innerHTML = `
      <img src="${ev.target.result}" alt="preview">
      <button type="button" id="supportAttachRemove">&times;</button>`;
    supportAttachPreview.style.display = 'flex';
    document.getElementById('supportAttachRemove').addEventListener('click', () => {
      supportSelectedFile = null;
      supportAttachInput.value = '';
      supportAttachPreview.style.display = 'none';
      supportAttachPreview.innerHTML = '';
    });
  };
  reader.readAsDataURL(file);
});

const supportInput   = document.getElementById('supportInput');
const supportSendBtn = document.getElementById('supportSendBtn');
async function sendSupportMessage(){
  const text = supportInput.value.trim();
  if(!text && !supportSelectedFile) return;
  supportSendBtn.disabled = true;
  supportInput.value = '';
  const fileToSend = supportSelectedFile;
  supportSelectedFile = null;
  supportAttachPreview.style.display = 'none';
  supportAttachPreview.innerHTML = '';
  supportAttachInput.value = '';
try{
    const fd = new FormData();
    fd.append('message', text);
    if(fileToSend) fd.append('attachment', fileToSend);
    const res = await fetch('/api/support/'+encodeURIComponent(currentUser)+'/message', { method:'POST', headers: authHeaders(), body: fd });
    if(!res.ok){
      const data = await res.json().catch(()=>({}));
      alert(data.error || 'Hindi na-send ang mensahe. Subukan ulit.');
    }
    await loadSupportChat(true);
  } catch(e){ alert('Hindi makonekta sa server.'); }
  supportSendBtn.disabled = false;
}
supportSendBtn.addEventListener('click', sendSupportMessage);
supportInput.addEventListener('keydown', e => {
  if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendSupportMessage(); }
});
document.getElementById('chatImgClose').addEventListener('click', () => document.getElementById('chatImgOverlay').classList.remove('show'));
document.getElementById('chatImgOverlay').addEventListener('click', e => { if(e.target.id === 'chatImgOverlay') e.currentTarget.classList.remove('show'); });