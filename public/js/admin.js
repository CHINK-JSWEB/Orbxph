// ── Gate — server-side verification (totoong secure) ────────────
const gateWrap       = document.getElementById('gateWrap');
const gateForm       = document.getElementById('gateForm');
const gateError      = document.getElementById('gateError');
const gateAttemptsEl = document.getElementById('gateAttempts');
const gateBlockedMsg = document.getElementById('gateBlockedMsg');

function getGateToken(){ return sessionStorage.getItem('orbx_gate_token'); }
function setGateToken(t){ sessionStorage.setItem('orbx_gate_token', t); }

function showGate(){
  gateWrap.classList.remove('hidden');
  gateForm.classList.remove('hidden');
  gateBlockedMsg.classList.add('hidden');
}

gateForm.addEventListener('submit', async e => {
  e.preventDefault();
  gateError.style.display = 'none';
  const code = document.getElementById('gateCode').value;
  const captchaWidgets = document.querySelectorAll('.g-recaptcha');
  const gateCaptchaToken = captchaWidgets.length ? grecaptcha.getResponse(0) : '';
  if(!gateCaptchaToken){
    gateError.textContent = 'Please complete the CAPTCHA verification.';
    gateError.style.display = 'block';
    return;
  }
  const submitBtn = gateForm.querySelector('button[type="submit"]');
  if(submitBtn){ submitBtn.disabled = true; }
  try{
    const r = await fetch('/api/admin/gate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, captchaToken: gateCaptchaToken })
    });
    const d = await r.json();
    if(!r.ok){
      if(r.status === 403){
        gateForm.classList.add('hidden');
        gateBlockedMsg.classList.remove('hidden');
      } else {
        gateError.textContent = d.error || 'Maling access code.';
        gateError.style.display = 'block';
        if(gateAttemptsEl){ gateAttemptsEl.textContent = d.error || ''; gateAttemptsEl.style.display = 'block'; }
      }
      if(submitBtn){ submitBtn.disabled = false; }
      document.getElementById('gateCode').value = '';
      return;
    }
    setGateToken(d.gateToken);
    gateWrap.classList.add('hidden');
    boot();
  } catch(err){
    gateError.textContent = 'Hindi makonekta sa server.';
    gateError.style.display = 'block';
    if(submitBtn){ submitBtn.disabled = false; }
  }
});

if(getGateToken()){
  gateWrap.classList.add('hidden');
  boot();
} else {
  showGate();
}

// ── SVG Icons ─────────────────────────────────────────────────
const ICONS = {
  overview:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>`,
  orders:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2z"/><path d="M16 3H8l-2 4h12l-2-4z"/></svg>`,
  users:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 014-4h4a4 4 0 014 4v2"/><path d="M16 3.13a4 4 0 010 7.75"/><path d="M21 21v-2a4 4 0 00-3-3.85"/></svg>`,
  featured:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>`,
  admins:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6.5L22 9.3l-5 4.9 1.2 6.8L12 17.5l-6.2 3.5L7 14.2 2 9.3l7-.8L12 2z"/></svg>`,
  profile:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  refresh:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 4v6h-6"/><path d="M1 20v-6h6"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/></svg>`,
  moon:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>`,
  sun:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`,
  approve:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  review:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  flag:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>`,
  trash:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/></svg>`,
  image:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  block:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`,
  locked:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>`,
  income:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>`,
  clock:     `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  totalord:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>`,
  usericon:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
  warning:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  logout:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  pending:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  bulkdel:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v4"/><path d="M14 11v4"/></svg>`,
  edit:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
  chevLeft:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`,
  chevRight: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`,
  withdraw:  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="4" width="20" height="14" rx="2"/><path d="M6 10h8M11 8l2 2-2 2"/></svg>`,
  paid:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M9 12l2 2 4-4"/></svg>`,
};

function icon(name, cls=''){
  return `<span class="svg-icon ${cls}">${ICONS[name]||''}</span>`;
}

function escapeHtmlAdmin(str){
  const div = document.createElement('div');
  div.textContent = str == null ? '' : String(str);
  return div.innerHTML;
}

// ── Token helpers ─────────────────────────────────────────────
function getToken(){ return localStorage.getItem('orbx_admin_token'); }
function setToken(t){ localStorage.setItem('orbx_admin_token', t); }
function clearToken(){ localStorage.removeItem('orbx_admin_token'); localStorage.removeItem('orbx_admin_username'); }
function setStoredUsername(u){ localStorage.setItem('orbx_admin_username', u); }
function getStoredUsername(){ return localStorage.getItem('orbx_admin_username') || ''; }

// ── Auth elements ─────────────────────────────────────────────
const authWrap    = document.getElementById('adminAuthWrap');
const setupForm   = document.getElementById('adminSetupForm');
const loginForm   = document.getElementById('adminLoginForm');
const dashboardEl = document.getElementById('adminDashboard');

function showAuth(){ authWrap.classList.remove('hidden'); dashboardEl.classList.add('hidden'); }
function showDashboard(){ authWrap.classList.add('hidden'); dashboardEl.classList.remove('hidden'); initDashboard(); }

async function boot(){
  const token = getToken();
  if(token){
    const res = await fetch('/api/orders',{headers:{Authorization:'Bearer '+token}});
    if(res.ok){
      currentAdminUser = getStoredUsername();
      showDashboard();
      return;
    }
    clearToken();
  }
  try{
    const r = await fetch('/api/admin/exists', { headers: { Authorization: 'Bearer ' + (getGateToken()||'') } });
    const d = await r.json();
    setupForm.classList.toggle('hidden', d.exists);
    loginForm.classList.toggle('hidden', !d.exists);
  } catch(e){ loginForm.classList.remove('hidden'); }
  showAuth();
}

// ── Setup ─────────────────────────────────────────────────────
setupForm.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl=document.getElementById('setupError');
  const u=document.getElementById('setupUser').value.trim();
  const p=document.getElementById('setupPass').value;
  const p2=document.getElementById('setupPass2').value;
  errEl.style.display='none';
  if(!u||!p){ errEl.textContent='Punan lahat ng fields.'; errEl.style.display='block'; return; }
  if(p.length<6){ errEl.textContent='Minimum 6 characters ang password.'; errEl.style.display='block'; return; }
  if(p!==p2){ errEl.textContent='Hindi magkatugma ang password.'; errEl.style.display='block'; return; }
  try{
    const r=await fetch('/api/admin/setup',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(getGateToken()||'')},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(!r.ok){ errEl.textContent=d.error||'May problema.'; errEl.style.display='block'; return; }
    const lr=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:u,password:p})});
    const ld=await lr.json();
    if(lr.ok){ setToken(ld.token); setStoredUsername(ld.username); currentAdminUser=ld.username; showDashboard(); }
  } catch(e){ errEl.textContent='Hindi makonekta sa server.'; errEl.style.display='block'; }
});

// ── Login ─────────────────────────────────────────────────────
loginForm.addEventListener('submit', async e => {
  e.preventDefault();
  const errEl=document.getElementById('loginError');
  errEl.style.display='none';
  const u=document.getElementById('loginUser').value.trim();
  const p=document.getElementById('loginPass').value;
  const captchaWidgets = document.querySelectorAll('.g-recaptcha');
  const loginCaptchaToken = captchaWidgets.length ? grecaptcha.getResponse(captchaWidgets.length - 1) : '';
  if(!loginCaptchaToken){
    errEl.textContent = 'Please complete the CAPTCHA verification.';
    errEl.style.display = 'block';
    return;
  }
  try{
    const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+(getGateToken()||'')},body:JSON.stringify({username:u,password:p,captchaToken:loginCaptchaToken})});
    const d=await r.json();
    if(!r.ok){ errEl.textContent=d.error||'Hindi ma-login.'; errEl.style.display='block'; return; }
    setToken(d.token); setStoredUsername(d.username); currentAdminUser=d.username; showDashboard();
  } catch(e){ errEl.textContent='Hindi makonekta sa server.'; errEl.style.display='block'; }
});

// ── Dashboard state ────────────────────────────────────────────
let currentAdminUser   = '';
let allOrdersCache     = [];
let allWithdrawalsCache= [];
let incomeFilter       = 'all';
let orderFilter        = 'all';
let wdAdminFilter      = 'all';

let currentOrderPage   = 1;
const ORDERS_PER_PAGE  = 3;
let currentOverviewPage  = 1;
const OVERVIEW_PER_PAGE  = 5;

// ── Profile helpers ───────────────────────────────────────────
function profileKey(field){ return `orbx_profile_${currentAdminUser}_${field}`; }
function getProfileData(){
  return {
    gmail:  localStorage.getItem(profileKey('gmail')) || '',
    phone:  localStorage.getItem(profileKey('phone')) || '',
    photo:  localStorage.getItem(profileKey('photo')) || '',
  };
}
function saveProfileData(data){
  if(data.gmail !== undefined) localStorage.setItem(profileKey('gmail'), data.gmail);
  if(data.phone !== undefined) localStorage.setItem(profileKey('phone'), data.phone);
  if(data.photo !== undefined) localStorage.setItem(profileKey('photo'), data.photo);
}

function updateSidebarAvatar(){
  const p = getProfileData();
  const imgEl   = document.getElementById('sidebarAvatarImg');
  const letterEl= document.getElementById('sidebarAvatarLetter');
  if(p.photo){
    imgEl.src = p.photo; imgEl.style.display='block'; letterEl.style.display='none';
  } else {
    imgEl.style.display='none'; letterEl.style.display='';
    letterEl.textContent = currentAdminUser ? currentAdminUser.charAt(0).toUpperCase() : 'A';
  }
}

function initDashboard(){
  const greet      = document.getElementById('adminGreet');
  const welcomeMsg = document.getElementById('adminWelcomeMsg');
  if(currentAdminUser){
    greet.textContent      = currentAdminUser.toUpperCase();
    welcomeMsg.innerHTML   = `Welcome back, <span class="welcome-name-highlight">${currentAdminUser}</span>!`;
  }
  updateSidebarAvatar();

const navIcons = { overview:'overview', orders:'orders', users:'users', featured:'featured', admins:'admins', profile:'profile', support:'featured' };
  document.querySelectorAll('.sidebar-nav-item').forEach(btn=>{
    const tab = btn.dataset.tab;
    const iconEl = btn.querySelector('.nav-icon');
    if(iconEl && navIcons[tab]) iconEl.innerHTML = ICONS[navIcons[tab]]||'';
  });

  updateThemeIcon(localStorage.getItem('orbx_theme')||'dark');
  const refreshEl = document.getElementById('refreshBtn');
  if(refreshEl) refreshEl.innerHTML = `<span class="svg-icon">${ICONS.refresh}</span>`;
  applyTheme(localStorage.getItem('orbx_theme')||'dark');
  startLiveClock();
  loadAllData();
  setActiveTab('overview');
  // Wire up withdrawal filters
  document.querySelectorAll('[data-wf]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-wf]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      wdAdminFilter = btn.dataset.wf;
      renderWithdrawals();
    });
  });
}

// ── Live clock ────────────────────────────────────────────────
function startLiveClock(){
  const el = document.getElementById('liveTime');
  function tick(){
    if(!el) return;
    const now = new Date();
    const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    let h = now.getHours(), m = now.getMinutes(), s = now.getSeconds();
    const ampm = h >= 12 ? 'PM' : 'AM';
    h = h % 12 || 12;
    const pad = n => String(n).padStart(2,'0');
    el.innerHTML = `
      <div class="clock-date">${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}</div>
      <div class="clock-time"><span class="clock-digits">${pad(h)}:${pad(m)}:${pad(s)}</span><span class="clock-ampm">${ampm}</span></div>
    `;
  }
  tick(); setInterval(tick,1000);
}

// ── Theme ─────────────────────────────────────────────────────
function updateThemeIcon(t){
  const icon1 = document.getElementById('themeIcon');
  const icon2 = document.getElementById('themeIconMobile');
  const svg   = t==='light' ? ICONS.sun : ICONS.moon;
  if(icon1) icon1.innerHTML = svg;
  if(icon2) icon2.innerHTML = svg;
}
function applyTheme(t){
  if(t==='light') document.body.setAttribute('data-theme','light');
  else document.body.removeAttribute('data-theme');
  updateThemeIcon(t);
  localStorage.setItem('orbx_theme',t);
}
document.getElementById('themeToggle').addEventListener('click',()=>{
  applyTheme(document.body.getAttribute('data-theme')==='light'?'dark':'light');
});
const themeToggleMobile = document.getElementById('themeToggleMobile');
if(themeToggleMobile) themeToggleMobile.addEventListener('click',()=>{
  applyTheme(document.body.getAttribute('data-theme')==='light'?'dark':'light');
});

// ── Logout ────────────────────────────────────────────────────
document.getElementById('adminLogoutBtn').addEventListener('click', async ()=>{
  try{ await fetch('/api/admin/logout',{method:'POST',headers:{Authorization:'Bearer '+getToken()}}); } catch(e){}
  clearToken(); showAuth(); boot();
});

// ── Sidebar nav ───────────────────────────────────────────────
function setActiveTab(tabName){
  document.querySelectorAll('.sidebar-nav-item').forEach(btn=>{
    btn.classList.toggle('active', btn.dataset.tab===tabName);
  });
  document.querySelectorAll('.admin-tab-panel').forEach(p=>p.classList.add('hidden'));
  const panel=document.getElementById('tab-'+tabName);
  if(panel) panel.classList.remove('hidden');
  if(tabName==='users')    loadUsers();
  if(tabName==='admins')   loadAdmins();
  if(tabName==='orders')   loadOrders();
  if(tabName==='featured') loadFeatured();
  if(tabName==='profile')  loadProfile();
  if(tabName==='support')  { loadSupportConversations().then(renderSupportList); }
}
document.querySelectorAll('.sidebar-nav-item').forEach(btn=>{
  btn.addEventListener('click',()=>{ setActiveTab(btn.dataset.tab); closeSidebar(); });
});
document.querySelectorAll('.see-all-btn').forEach(btn=>{
  btn.addEventListener('click',()=>setActiveTab(btn.dataset.tab||'orders'));
});

// ── Mobile sidebar ────────────────────────────────────────────
const adminSidebar        = document.getElementById('adminSidebar');
const sidebarOverlay      = document.getElementById('sidebarOverlay');
const mobileSidebarToggle = document.getElementById('mobileSidebarToggle');
function openSidebar(){ adminSidebar.classList.add('open'); sidebarOverlay.classList.add('show'); }
function closeSidebar(){ adminSidebar.classList.remove('open'); sidebarOverlay.classList.remove('show'); }
if(mobileSidebarToggle) mobileSidebarToggle.addEventListener('click', openSidebar);
if(sidebarOverlay)      sidebarOverlay.addEventListener('click', closeSidebar);

// ── Load all data ─────────────────────────────────────────────
let allOrdersIncludingArchivedCache = [];

async function loadAllData(){
  await loadOrdersData();
  await loadOrdersIncludingArchivedData();
  await loadWithdrawalsData();
  await loadSupportConversations();
  renderStats();
  renderIncome();
  renderWithdrawals();
  renderRecentOrders();
}

async function loadOrdersData(){
  try{
    const r=await fetch('/api/orders',{headers:{Authorization:'Bearer '+getToken()}});
    if(r.status===401){ clearToken(); showAuth(); boot(); return; }
    allOrdersCache=await r.json();
  } catch(e){ allOrdersCache=[]; }
}

async function loadOrdersIncludingArchivedData(){
  try{
    const r=await fetch('/api/orders/all-including-archived',{headers:{Authorization:'Bearer '+getToken()}});
    allOrdersIncludingArchivedCache=await r.json();
  } catch(e){ allOrdersIncludingArchivedCache=[]; }
}

async function loadWithdrawalsData(){
  try{
    const r=await fetch('/api/admin/withdrawals',{headers:{Authorization:'Bearer '+getToken()}});
    if(r.ok) allWithdrawalsCache=await r.json();
  } catch(e){ allWithdrawalsCache=[]; }
}

// ── Stats ─────────────────────────────────────────────────────
async function renderStats(){
  let users=[];
  try{ const r=await fetch('/api/admin/users',{headers:{Authorization:'Bearer '+getToken()}}); users=await r.json(); } catch(e){}
  const orders      = allOrdersIncludingArchivedCache;
  const pending     = orders.filter(o=>o.status==='pending').length;
  const flagged     = orders.filter(o=>o.status==='flagged').length;
  const reviewed    = orders.filter(o=>o.status==='reviewed').length;
  const approved    = orders.filter(o=>o.status==='approved').length;
  const totalIncome = orders.filter(o=>o.status==='approved').reduce((s,o)=>s+Number(o.price||0),0);
  const wdPending   = allWithdrawalsCache.filter(w=>w.status==='pending').length;
  const badge=document.getElementById('pendingBadge');
  if(badge){ badge.textContent=pending; badge.classList.toggle('show',pending>0); }
  document.getElementById('adminStats').innerHTML=`
    <div class="stat-card">
      <div class="stat-icon-wrap">${ICONS.totalord}</div>
      <div class="stat-num">${orders.length}</div>
      <div class="stat-label">Total Orders</div>
    </div>
    <div class="stat-card pending">
      <div class="stat-icon-wrap">${ICONS.pending}</div>
      <div class="stat-num">${pending}</div>
      <div class="stat-label">Pending</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap">${ICONS.review}</div>
      <div class="stat-num">${reviewed}</div>
      <div class="stat-label">Reviewed</div>
    </div>
    <div class="stat-card approved">
      <div class="stat-icon-wrap">${ICONS.approve}</div>
      <div class="stat-num">${approved}</div>
      <div class="stat-label">Approved</div>
    </div>
    <div class="stat-card flagged">
      <div class="stat-icon-wrap">${ICONS.flag}</div>
      <div class="stat-num">${flagged}</div>
      <div class="stat-label">Flagged</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon-wrap">${ICONS.usericon}</div>
      <div class="stat-num">${users.length}</div>
      <div class="stat-label">Users</div>
    </div>
    <div class="stat-card income">
      <div class="stat-icon-wrap">${ICONS.income}</div>
      <div class="stat-num">₱${totalIncome.toLocaleString()}</div>
      <div class="stat-label">Total Revenue</div>
    </div>
    <div class="stat-card pending">
      <div class="stat-icon-wrap">${ICONS.withdraw}</div>
      <div class="stat-num">${wdPending}</div>
      <div class="stat-label">Pending Cashouts</div>
    </div>
  `;
}

// ── Income Monitor ────────────────────────────────────────────
function filterOrdersByDate(orders,filter){
  const now=new Date();
  return orders.filter(o=>{
    const d=new Date(o.createdAt);
    if(filter==='today') return d.toDateString()===now.toDateString();
    if(filter==='week'){ const w=new Date(now); w.setDate(now.getDate()-7); return d>=w; }
    if(filter==='month') return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  });
}
function renderIncome(){
  const orders   = filterOrdersByDate(allOrdersIncludingArchivedCache,incomeFilter);
  const approved = orders.filter(o=>o.status==='approved');
  const total    = approved.reduce((s,o)=>s+Number(o.price||0),0);
  const gcash    = approved.filter(o=>o.method&&o.method.toLowerCase().includes('gcash')).reduce((s,o)=>s+Number(o.price||0),0);
  const maya     = approved.filter(o=>o.method&&(o.method.toLowerCase().includes('maya')||o.method.toLowerCase().includes('paymaya'))).reduce((s,o)=>s+Number(o.price||0),0);
  const other    = total-gcash-maya;
  const labelMap = {all:'all time',today:'today',week:'this week',month:'this month'};
  document.getElementById('incomeTotal').textContent='₱'+total.toLocaleString();
  document.getElementById('incomeSubLabel').textContent=`from ${approved.length} approved order${approved.length!==1?'s':''} — ${labelMap[incomeFilter]}`;
  document.getElementById('incomeBreakdown').innerHTML=`
    <div class="income-break-item gcash">
      <div class="income-break-amount">₱${gcash.toLocaleString()}</div>
      <div class="income-break-label">GCash</div>
    </div>
    <div class="income-break-item maya">
      <div class="income-break-amount">₱${maya.toLocaleString()}</div>
      <div class="income-break-label">Maya / PayMaya</div>
    </div>
    <div class="income-break-item">
      <div class="income-break-amount">₱${other.toLocaleString()}</div>
      <div class="income-break-label">Other</div>
    </div>
    <div class="income-break-item count">
      <div class="income-break-amount">${approved.length}</div>
      <div class="income-break-label">Orders</div>
    </div>
  `;
}
document.querySelectorAll('.income-filter').forEach(btn=>{
  btn.addEventListener('click',()=>{
    document.querySelectorAll('.income-filter').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); incomeFilter=btn.dataset.filter; renderIncome();
  });
});

// ══════════════════════════════════════════════════════════════
//  WITHDRAWAL REQUESTS (Admin Overview)
// ══════════════════════════════════════════════════════════════
function renderWithdrawals(){
  const container = document.getElementById('withdrawalAdminList');
  if(!container) return;

  const filtered = wdAdminFilter === 'all'
    ? allWithdrawalsCache
    : allWithdrawalsCache.filter(w => w.status === wdAdminFilter);

  const pending      = allWithdrawalsCache.filter(w => w.status === 'pending').length;
  const paid         = allWithdrawalsCache.filter(w => w.status === 'paid').length;
  const totalPaidAmt = allWithdrawalsCache.filter(w => w.status === 'paid').reduce((s,w) => s + w.amount, 0);

  const statsHtml = `
    <div class="wd-stats-strip">
      <div class="wd-stat-pill pending-pill">
        <div class="wd-stat-pill-num">${pending}</div>
        <div class="wd-stat-pill-label">Pending</div>
      </div>
      <div class="wd-stat-pill paid-pill">
        <div class="wd-stat-pill-num">${paid}</div>
        <div class="wd-stat-pill-label">Paid</div>
      </div>
      <div class="wd-stat-pill">
        <div class="wd-stat-pill-num">₱${totalPaidAmt.toLocaleString()}</div>
        <div class="wd-stat-pill-label">Total Paid Out</div>
      </div>
    </div>`;

  if(!filtered.length){
    container.innerHTML = statsHtml + '<p class="wd-empty">Walang withdrawal requests dito.</p>';
    return;
  }

  const cardsHtml = filtered.map(w => buildWithdrawalCard(w)).join('');
  container.innerHTML = statsHtml + '<div class="wd-list-wrap">' + cardsHtml + '</div>';
  attachWithdrawalEvents(container);
}

function buildWithdrawalCard(w){
  const isPaid     = w.status === 'paid';
  const isRejected = w.status === 'rejected';
  const isFlagged  = w.status === 'flagged';
  const isApproved = w.status === 'approved';
  const isPending  = w.status === 'pending';

  return `
    <div class="wd-request-card wd-request-card--${w.status}">
      <div class="wd-request-info">
        <div class="wd-request-user">${w.username}</div>
        <div class="wd-request-amount">₱${Number(w.amount).toLocaleString()}</div>
        <span class="wd-request-status ${w.status}">${w.status}</span>
        <div class="wd-request-meta">
          <strong>${w.method}</strong> · ${w.accountName} · <strong>${w.accountNumber}</strong><br>
          Requested: ${timeAgo(w.createdAt)}
          ${w.processedAt ? `<br>Processed: ${timeAgo(w.processedAt)}` : ''}
          ${w.notes ? `<br>Notes: ${w.notes}` : ''}
        </div>
        ${w.feedback ? `<div class="wd-request-feedback">${icon('warning','icon-xs')} ${escapeHtmlAdmin(w.feedback)}</div>` : ''}
      </div>
      <div class="wd-request-actions">
        <button class="wd-pay-btn" data-wid="${w.id}" ${isPaid ? 'disabled' : ''}>
          ${icon('paid','icon-xs')} ${isPaid ? 'Paid' : 'Mark Paid'}
        </button>
        <button class="wd-approve-btn" data-wid="${w.id}" ${isApproved||isPaid ? 'disabled' : ''}>
          ${icon('approve','icon-xs')} ${isApproved ? 'Approved' : 'Approve'}
        </button>
        <button class="wd-reject-btn" data-wid="${w.id}" ${isRejected||isPaid ? 'disabled' : ''}>
          ${icon('trash','icon-xs')} ${isRejected ? 'Rejected' : 'Reject'}
        </button>
        <button class="wd-flag-btn" data-wid="${w.id}" ${isFlagged||isPaid ? 'disabled' : ''}>
          ${icon('flag','icon-xs')} ${isFlagged ? 'Flagged' : 'Flag'}
        </button>
      </div>
    </div>`;
}

function attachWithdrawalEvents(container){
  container.querySelectorAll('.wd-pay-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm(`I-mark as PAID ang withdrawal na ito? Ibig sabihin ay na-send na ang pera sa user.`)) return;
      await updateWithdrawal(btn.dataset.wid, 'paid');
    });
  });
  container.querySelectorAll('.wd-approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if(!confirm(`I-approve ang withdrawal request na ito? Mababawasan ang balance ng user.`)) return;
      await updateWithdrawal(btn.dataset.wid, 'approved');
    });
  });
  container.querySelectorAll('.wd-reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reason = prompt('Reason for rejection (optional):');
      if(reason === null) return;
      await updateWithdrawal(btn.dataset.wid, 'rejected', reason);
    });
  });
  container.querySelectorAll('.wd-flag-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const reason = prompt('Flag reason (required):');
      if(!reason) return;
      await updateWithdrawal(btn.dataset.wid, 'flagged', reason);
    });
  });
}

async function updateWithdrawal(id, status, feedback){
  try{
    const body = { status };
    if(feedback !== undefined) body.feedback = feedback;
    const r = await fetch('/api/admin/withdrawals/' + id, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getToken() },
      body: JSON.stringify(body)
    });
    const d = await r.json();
    if(!r.ok){ alert(d.error || 'May error sa pag-update.'); return; }
  } catch(e){ alert('Hindi makonekta sa server.'); return; }
  await loadWithdrawalsData();
  renderWithdrawals();
  renderStats();
}

// ══════════════════════════════════════════════════════════════
//  OVERVIEW TAB — Recent Orders WITH PAGINATION
// ══════════════════════════════════════════════════════════════
function renderRecentOrders(){
  const list  = document.getElementById('recentOrderList');
  const total = allOrdersCache.length;

  if(!total){
    list.innerHTML = '<p class="admin-empty">Wala pang order.</p>';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(total / OVERVIEW_PER_PAGE));
  if(currentOverviewPage < 1) currentOverviewPage = 1;
  if(currentOverviewPage > totalPages) currentOverviewPage = totalPages;

  const start      = (currentOverviewPage - 1) * OVERVIEW_PER_PAGE;
  const pageOrders = allOrdersCache.slice(start, start + OVERVIEW_PER_PAGE);

  const cardsHtml      = pageOrders.map(o => buildOrderCard(o)).join('');
  const paginationHtml = buildOverviewPagination(currentOverviewPage, totalPages, total);

  list.innerHTML = cardsHtml + paginationHtml;
  attachOrderCardEvents(list);

  list.querySelectorAll('.ov-page-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = parseInt(btn.dataset.page);
      if(!isNaN(p)){ currentOverviewPage = p; renderRecentOrders(); }
    });
  });
  const prevBtn = list.querySelector('.ov-prev');
  const nextBtn = list.querySelector('.ov-next');
  if(prevBtn) prevBtn.addEventListener('click', () => {
    if(currentOverviewPage > 1){ currentOverviewPage--; renderRecentOrders(); }
  });
  if(nextBtn) nextBtn.addEventListener('click', () => {
    if(currentOverviewPage < totalPages){ currentOverviewPage++; renderRecentOrders(); }
  });
}

function buildOverviewPagination(current, total, itemCount){
  if(total <= 1) return '';
  const start = (current - 1) * OVERVIEW_PER_PAGE + 1;
  const end   = Math.min(current * OVERVIEW_PER_PAGE, itemCount);
  let startPage = Math.max(1, current - 2);
  let endPage   = Math.min(total, startPage + 4);
  if(endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  const pageButtons = [];
  for(let i = startPage; i <= endPage; i++){
    pageButtons.push(
      `<button class="page-btn ov-page-btn ${i===current?'active':''}" data-page="${i}">${i}</button>`
    );
  }
  return `
    <div class="pagination-wrap">
      <div class="pagination-info">Showing ${start}–${end} of ${itemCount} orders</div>
      <div class="pagination-controls">
        <button class="ov-prev page-nav-btn" ${current===1?'disabled':''}>
          ${icon('chevLeft','icon-xs')} Prev
        </button>
        <div class="page-number-wrap">${pageButtons.join('')}</div>
        <button class="ov-next page-nav-btn" ${current===total?'disabled':''}>
          Next ${icon('chevRight','icon-xs')}
        </button>
      </div>
    </div>`;
}

// ══════════════════════════════════════════════════════════════
//  ORDERS TAB — WITH PAGINATION
// ══════════════════════════════════════════════════════════════
async function loadOrders(){
  await loadOrdersData();
  currentOrderPage = 1;
  renderOrdersTab();
}

function renderOrdersTab(){
  const list     = document.getElementById('orderList');
  const filtered = orderFilter==='all' ? allOrdersCache : allOrdersCache.filter(o=>o.status===orderFilter);
  const total    = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / ORDERS_PER_PAGE));

  if(currentOrderPage < 1) currentOrderPage = 1;
  if(currentOrderPage > totalPages) currentOrderPage = totalPages;

  const start      = (currentOrderPage - 1) * ORDERS_PER_PAGE;
  const pageOrders = filtered.slice(start, start + ORDERS_PER_PAGE);
  const approvedCount = allOrdersCache.filter(o=>o.status==='approved').length;

  const toolbar = `
    <div class="orders-toolbar">
      <div class="order-filters">
        <button class="order-filter-btn ${orderFilter==='all'?'active':''}" data-f="all">All (${allOrdersCache.length})</button>
        <button class="order-filter-btn ${orderFilter==='pending'?'active':''}" data-f="pending">Pending (${allOrdersCache.filter(o=>o.status==='pending').length})</button>
        <button class="order-filter-btn ${orderFilter==='approved'?'active':''}" data-f="approved">Approved (${approvedCount})</button>
        <button class="order-filter-btn ${orderFilter==='reviewed'?'active':''}" data-f="reviewed">Reviewed (${allOrdersCache.filter(o=>o.status==='reviewed').length})</button>
        <button class="order-filter-btn ${orderFilter==='flagged'?'active':''}" data-f="flagged">Flagged (${allOrdersCache.filter(o=>o.status==='flagged').length})</button>
      </div>
      ${approvedCount>0?`<button class="bulk-delete-btn" id="bulkDeleteApproved">${icon('bulkdel')} Delete All Approved (${approvedCount})</button>`:''}
    </div>`;

  const cardsHtml = !pageOrders.length
    ? '<p class="admin-empty">Walang orders sa filter na ito.</p>'
    : '<div class="order-cards-wrap">'+pageOrders.map(o=>buildOrderCard(o)).join('')+'</div>';

  const paginationHtml = buildPagination(currentOrderPage, totalPages, total);
  list.innerHTML = toolbar + cardsHtml + paginationHtml;
  attachOrderCardEvents(list);

  list.querySelectorAll('.order-filter-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      orderFilter = btn.dataset.f;
      currentOrderPage = 1;
      renderOrdersTab();
    });
  });

  const bulkBtn = document.getElementById('bulkDeleteApproved');
  if(bulkBtn){
    bulkBtn.addEventListener('click', async()=>{
      const count = allOrdersCache.filter(o=>o.status==='approved').length;
      if(!confirm(`Burahin ang lahat ng ${count} approved orders? Kasama ang lahat ng screenshots. Hindi na maibabalik!`)) return;
      bulkBtn.disabled=true; bulkBtn.textContent='Deleting...';
      try{
        const r=await fetch('/api/orders/bulk/approved',{method:'DELETE',headers:{Authorization:'Bearer '+getToken()}});
        if(r.ok){ currentOrderPage=1; await loadAllData(); renderOrdersTab(); }
      } catch(e){ alert('May error sa pag-delete.'); }
    });
  }

  list.querySelectorAll('.page-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const p = parseInt(btn.dataset.page);
      if(!isNaN(p)){ currentOrderPage=p; renderOrdersTab(); }
    });
  });
  const prevBtn = list.querySelector('.page-prev');
  const nextBtn = list.querySelector('.page-next');
  if(prevBtn) prevBtn.addEventListener('click',()=>{ if(currentOrderPage>1){ currentOrderPage--; renderOrdersTab(); } });
  if(nextBtn) nextBtn.addEventListener('click',()=>{ if(currentOrderPage<totalPages){ currentOrderPage++; renderOrdersTab(); } });
}

function buildPagination(current, total, itemCount){
  if(total <= 1) return '';
  const start = (current - 1) * ORDERS_PER_PAGE + 1;
  const end   = Math.min(current * ORDERS_PER_PAGE, itemCount);
  let startPage = Math.max(1, current - 2);
  let endPage   = Math.min(total, startPage + 4);
  if(endPage - startPage < 4) startPage = Math.max(1, endPage - 4);
  const pageButtons = [];
  for(let i = startPage; i <= endPage; i++){
    pageButtons.push(`<button class="page-btn ${i===current?'active':''}" data-page="${i}">${i}</button>`);
  }
  return `
    <div class="pagination-wrap">
      <div class="pagination-info">Showing ${start}–${end} of ${itemCount} orders</div>
      <div class="pagination-controls">
        <button class="page-prev page-nav-btn" ${current===1?'disabled':''}>
          ${icon('chevLeft','icon-xs')} Prev
        </button>
        <div class="page-number-wrap">${pageButtons.join('')}</div>
        <button class="page-next page-nav-btn" ${current===total?'disabled':''}>
          Next ${icon('chevRight','icon-xs')}
        </button>
      </div>
    </div>`;
}

function buildOrderCard(o){
  const isApproved=o.status==='approved';
  const isReviewed=o.status==='reviewed';
  const isFlagged =o.status==='flagged';
  const canApprove=!isApproved&&!isFlagged;

  return `
    <div class="order-card ${isApproved?'order-card--approved':''} ${isFlagged?'order-card--flagged':''}">
      ${o.screenshot
        ? `<img class="order-thumb" src="${o.screenshot}" data-full="${o.screenshot}">`
        : `<div class="order-thumb order-thumb-empty">${icon('image')}</div>`}
      <div class="order-info">
        <div class="order-info-top">
          <span class="order-user">${o.username}</span>
          <span class="order-status ${o.status}">${o.status}</span>
          ${isFlagged?`<span class="order-permanent-tag">${icon('locked','icon-xs')} Permanent</span>`:''}
        </div>
        <div class="order-meta"><strong>${o.tier}</strong> &middot; &#8369;${Number(o.price).toLocaleString()} &middot; ${o.method}</div>
        <div class="order-time">${timeAgo(o.createdAt)}</div>
        ${isApproved&&o.approvedAt?`<div class="order-approved-time">${icon('approve','icon-xs')} Approved ${timeAgo(o.approvedAt)}</div>`:''}
        ${isFlagged?`<div class="order-flagged-notice">${icon('locked','icon-xs')} Hindi na maaprubahan ang order na ito.</div>`:''}
${o.feedback?`<div class="order-feedback-tag">${icon('warning','icon-xs')} ${escapeHtmlAdmin(o.feedback)}</div>`:''}
      </div>
      <div class="order-actions">
        <button class="approve-btn ${isFlagged?'approve-btn--blocked':''}" data-id="${o.id}" ${!canApprove?'disabled':''}>
          ${icon('approve','icon-xs')} ${isApproved?'Approved':isFlagged?'Blocked':'Approve'}
        </button>
        <button class="review-btn" data-id="${o.id}" ${isReviewed||isApproved||isFlagged?'disabled':''}>
          ${icon('review','icon-xs')} ${isReviewed||isApproved?'Reviewed':isFlagged?'Flagged':'Mark Reviewed'}
        </button>
        <button class="flag-btn" data-id="${o.id}" ${isFlagged?'disabled':''}>
          ${icon('flag','icon-xs')} ${isFlagged?'Flagged':'Flag'}
        </button>
        ${o.screenshot?`<button class="delete-btn" data-id="${o.id}">${icon('image','icon-xs')} Screenshot</button>`:''}
        <button class="remove-order-btn" data-id="${o.id}">${icon('trash','icon-xs')} Delete</button>
      </div>
    </div>`;
}

function attachOrderCardEvents(container){
  container.querySelectorAll('.order-thumb:not(.order-thumb-empty)').forEach(img=>{
    img.addEventListener('click',()=>{
      document.getElementById('imgFull').src=img.dataset.full;
      document.getElementById('imgOverlay').classList.add('show');
    });
  });
  container.querySelectorAll('.approve-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      if(!confirm('I-approve ang order na ito? Makikita na ito ng user sa kanyang dashboard.')) return;
      await updateOrder(btn.dataset.id,{status:'approved'});
    });
  });
  container.querySelectorAll('.review-btn').forEach(btn=>{
    btn.addEventListener('click',()=>updateOrder(btn.dataset.id,{status:'reviewed'}));
  });
  container.querySelectorAll('.flag-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openFeedback(btn.dataset.id));
  });
  container.querySelectorAll('.delete-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      if(!confirm('Burahin ang screenshot? Hindi na maibabalik.')) return;
      await fetch('/api/orders/'+btn.dataset.id+'/screenshot',{method:'DELETE',headers:{Authorization:'Bearer '+getToken()}});
      await loadAllData(); renderOrdersTab();
    });
  });
  container.querySelectorAll('.remove-order-btn').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const order=allOrdersCache.find(o=>o.id===btn.dataset.id);
      const label=order?`${order.username} - ${order.tier}`:'this order';
      if(!confirm(`Burahin ang order ni ${label}? Kasama ang screenshot. Hindi na maibabalik!`)) return;
      btn.disabled=true;
      try{
        const r=await fetch('/api/orders/'+btn.dataset.id,{method:'DELETE',headers:{Authorization:'Bearer '+getToken()}});
        if(r.ok){ await loadAllData(); renderOrdersTab(); }
      } catch(e){ btn.disabled=false; }
    });
  });
}

async function updateOrder(id,body){
  await fetch('/api/orders/'+id,{method:'PATCH',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getToken()},body:JSON.stringify(body)});
  await loadAllData();
  const activeTab=document.querySelector('.sidebar-nav-item.active');
  if(activeTab&&activeTab.dataset.tab==='orders') renderOrdersTab();
  else renderRecentOrders();
}

// ── Feedback modal ────────────────────────────────────────────
let feedbackId=null;
const feedbackOverlay=document.getElementById('feedbackOverlay');
function openFeedback(id){ feedbackId=id; document.getElementById('feedbackText').value=''; feedbackOverlay.classList.add('show'); }
document.getElementById('feedbackClose').addEventListener('click',()=>feedbackOverlay.classList.remove('show'));
feedbackOverlay.addEventListener('click',e=>{ if(e.target===feedbackOverlay) feedbackOverlay.classList.remove('show'); });
document.getElementById('feedbackSend').addEventListener('click',async()=>{
  const text=document.getElementById('feedbackText').value.trim();
  if(!text) return;
  await updateOrder(feedbackId,{status:'flagged',feedback:text});
  feedbackOverlay.classList.remove('show');
});

// ── Users tab ─────────────────────────────────────────────────
async function loadUsers(){
  const list=document.getElementById('userList');
  try{
    const r=await fetch('/api/admin/users',{headers:{Authorization:'Bearer '+getToken()}});
    const users=await r.json();
    if(!users.length){ list.innerHTML='<p class="admin-empty">Wala pang nakarehistrong user.</p>'; return; }
const sortedUsers = users.slice().sort((a,b) => (b.balance||0) - (a.balance||0));
    list.innerHTML=`
      <div class="data-table" style="overflow-x:auto;">
        <div class="data-table-head" style="grid-template-columns:1.3fr 1.3fr 1fr 1fr 0.9fr 0.9fr 1fr;"><span>Username</span><span>Phone</span><span>Balance</span><span>Joined</span><span>Status</span><span>Block</span><span>Password</span></div>
        ${sortedUsers.map(u=>`
          <div class="data-table-row" style="grid-template-columns:1.3fr 1.3fr 1fr 1fr 0.9fr 0.9fr 1fr;">
            <span class="dt-username">${u.username}</span>
            <span class="dt-phone">${u.phone}</span>
            <span class="dt-balance">₱${Number(u.balance||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2})}</span>
            <span class="dt-date">${new Date(u.createdAt).toLocaleDateString('en-PH')}</span>
            <span class="dt-status ${u.blocked?'blocked':'active'}">${u.blocked?'Blocked':'Active'}</span>
            <span><button class="block-btn ${u.blocked?'unblock':''}" data-username="${u.username}" data-blocked="${u.blocked}">
              ${icon('block','icon-xs')} ${u.blocked?'Unblock':'Block'}
            </button></span>
            <span><button class="reset-pass-btn" data-username="${u.username}">
              Reset Pass
            </button></span>
          </div>`).join('')}
      </div>`;
    list.querySelectorAll('.block-btn').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        if(!confirm((btn.dataset.blocked==='true'?'I-unblock':'I-block')+' si '+btn.dataset.username+'?')) return;
        await fetch('/api/admin/users/'+encodeURIComponent(btn.dataset.username)+'/block',{method:'PATCH',headers:{Authorization:'Bearer '+getToken()}});
        loadUsers(); renderStats();
      });
    });
    list.querySelectorAll('.reset-pass-btn').forEach(btn=>{
      btn.addEventListener('click',async()=>{
        const newPass = prompt('Ilagay ang bagong password para kay '+btn.dataset.username+' (min. 6 characters):');
        if(!newPass) return;
        if(newPass.length<6){ alert('Minimum 6 characters ang password.'); return; }
        try{
          const r = await fetch('/api/admin/users/'+encodeURIComponent(btn.dataset.username)+'/reset-password',{
            method:'PATCH',
            headers:{'Content-Type':'application/json',Authorization:'Bearer '+getToken()},
            body:JSON.stringify({newPassword:newPass})
          });
          const d = await r.json();
          if(!r.ok){ alert(d.error||'May error sa pag-reset.'); return; }
          alert('Successfully na-reset ang password ni '+btn.dataset.username+'. Sabihin mo sa kanya ang bagong password: '+newPass);
        } catch(e){ alert('Hindi makonekta sa server.'); }
      });
    });
  } catch(e){ list.innerHTML='<p class="admin-empty">May error sa pag-load ng users.</p>'; }
}

// ── Admins tab ────────────────────────────────────────────────
async function loadAdmins(){
  const list=document.getElementById('adminList');
  try{
    const r=await fetch('/api/admin/list',{headers:{Authorization:'Bearer '+getToken()}});
    const admins=await r.json();
    list.innerHTML=`
      <div class="data-table">
        <div class="data-table-head"><span>Username</span><span>Date Added</span></div>
        ${admins.map(a=>`
          <div class="data-table-row">
            <span class="dt-username">${icon('admins','icon-xs')} ${a.username}</span>
            <span class="dt-date">${new Date(a.createdAt).toLocaleDateString('en-PH')}</span>
          </div>`).join('')}
      </div>`;
  } catch(e){ list.innerHTML='<p class="admin-empty">May error.</p>'; }
}

document.getElementById('addAdminBtn').addEventListener('click',async()=>{
  const errEl=document.getElementById('newAdminError');
  const u=document.getElementById('newAdminUser').value.trim();
  const p=document.getElementById('newAdminPass').value;
  errEl.style.display='none';
  if(!u||!p){ errEl.textContent='Punan lahat ng fields.'; errEl.style.display='block'; return; }
  if(p.length<6){ errEl.textContent='Minimum 6 characters ang password.'; errEl.style.display='block'; return; }
  try{
    const r=await fetch('/api/admin/setup',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+getToken()},body:JSON.stringify({username:u,password:p})});
    const d=await r.json();
    if(!r.ok){ errEl.textContent=d.error||'May error.'; errEl.style.display='block'; return; }
    document.getElementById('newAdminUser').value='';
    document.getElementById('newAdminPass').value='';
    loadAdmins();
  } catch(e){ errEl.textContent='May error.'; errEl.style.display='block'; }
});

// ── Featured / Announcements tab ──────────────────────────────
let announcements = [];
let editingAnnouncementId = null;

function announcementsKey(){ return `orbx_announcements`; }
function loadAnnouncementsFromStorage(){
  try{ return JSON.parse(localStorage.getItem(announcementsKey())||'[]'); } catch(e){ return []; }
}
function saveAnnouncementsToStorage(arr){
  localStorage.setItem(announcementsKey(), JSON.stringify(arr));
}

const TYPE_META = {
  info:        { label:'Info',        color:'#578bff', bg:'rgba(87,139,255,0.12)', border:'rgba(87,139,255,0.3)' },
  promo:       { label:'Promo 🔥',    color:'#FFB347', bg:'rgba(255,179,71,0.12)', border:'rgba(255,179,71,0.3)' },
  warning:     { label:'Warning',     color:'#ff8080', bg:'rgba(255,90,90,0.10)',  border:'rgba(255,90,90,0.3)'  },
  new:         { label:'New ✨',      color:'#7CFFB2', bg:'rgba(124,255,178,0.10)',border:'rgba(124,255,178,0.3)'},
  maintenance: { label:'Maintenance', color:'#c4a3ff', bg:'rgba(160,87,255,0.10)', border:'rgba(160,87,255,0.3)' },
};

function loadFeatured(){
  announcements = loadAnnouncementsFromStorage();
  renderAnnouncements();
}

function renderAnnouncements(){
  const list = document.getElementById('announcementList');
  if(!announcements.length){
    list.innerHTML='<p class="admin-empty">Wala pang announcements. Mag-add na!</p>';
    return;
  }
  list.innerHTML = `<div class="announcement-cards">`
    + announcements.map(a=>{
        const meta = TYPE_META[a.type]||TYPE_META.info;
        const now = new Date();
        const expired = a.expiry && new Date(a.expiry) < now;
        return `
          <div class="announcement-card ${!a.active||expired?'announcement-card--inactive':''}">
            <div class="announcement-card-top">
              <span class="announcement-type-badge" style="color:${meta.color};background:${meta.bg};border:1px solid ${meta.border};">${meta.label}</span>
              ${!a.active?'<span class="announcement-status-tag inactive">Inactive</span>':expired?'<span class="announcement-status-tag expired">Expired</span>':'<span class="announcement-status-tag active">Live</span>'}
            </div>
            <div class="announcement-title">${escapeHtmlAdmin(a.title)}</div>
            <div class="announcement-body">${escapeHtmlAdmin(a.body)}</div>
            <div class="announcement-footer">
              ${a.expiry?`<span class="announcement-expiry">Until: ${new Date(a.expiry).toLocaleDateString('en-PH')}</span>`:'<span class="announcement-expiry">No expiry</span>'}
              <div class="announcement-actions">
                <button class="ann-edit-btn" data-id="${a.id}">${icon('edit','icon-xs')} Edit</button>
                <button class="ann-toggle-btn" data-id="${a.id}">${a.active?'Deactivate':'Activate'}</button>
                <button class="ann-delete-btn" data-id="${a.id}">${icon('trash','icon-xs')} Delete</button>
              </div>
            </div>
          </div>`;
      }).join('')
    + `</div>`;

  list.querySelectorAll('.ann-edit-btn').forEach(btn=>{
    btn.addEventListener('click',()=>openFeaturedForm(btn.dataset.id));
  });
  list.querySelectorAll('.ann-toggle-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const a = announcements.find(x=>x.id===btn.dataset.id);
      if(a){ a.active=!a.active; saveAnnouncementsToStorage(announcements); renderAnnouncements(); }
    });
  });
  list.querySelectorAll('.ann-delete-btn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(!confirm('Burahin ang announcement na ito?')) return;
      announcements = announcements.filter(x=>x.id!==btn.dataset.id);
      saveAnnouncementsToStorage(announcements);
      renderAnnouncements();
    });
  });
}

function openFeaturedForm(editId=null){
  editingAnnouncementId = editId;
  const card = document.getElementById('featuredFormCard');
  const titleEl = document.getElementById('featuredFormTitle');
  card.classList.remove('hidden');
  document.getElementById('featuredError').style.display='none';
  if(editId){
    const a = announcements.find(x=>x.id===editId);
    if(a){
      titleEl.textContent='Edit Announcement';
      document.getElementById('announcementTitle').value = a.title;
      document.getElementById('announcementType').value  = a.type;
      document.getElementById('announcementBody').value  = a.body;
      document.getElementById('announcementExpiry').value= a.expiry||'';
      document.getElementById('announcementActive').checked = a.active;
    }
  } else {
    titleEl.textContent='New Announcement';
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementType').value  = 'info';
    document.getElementById('announcementBody').value  = '';
    document.getElementById('announcementExpiry').value= '';
    document.getElementById('announcementActive').checked = true;
  }
  card.scrollIntoView({behavior:'smooth',block:'start'});
}

document.getElementById('addAnnouncementBtn').addEventListener('click',()=>openFeaturedForm());
document.getElementById('cancelFeaturedBtn').addEventListener('click',()=>{
  document.getElementById('featuredFormCard').classList.add('hidden');
  editingAnnouncementId=null;
});

document.getElementById('saveFeaturedBtn').addEventListener('click',()=>{
  const errEl = document.getElementById('featuredError');
  const title = document.getElementById('announcementTitle').value.trim();
  const type  = document.getElementById('announcementType').value;
  const body  = document.getElementById('announcementBody').value.trim();
  const expiry= document.getElementById('announcementExpiry').value;
  const active= document.getElementById('announcementActive').checked;
  errEl.style.display='none';
  if(!title||!body){ errEl.textContent='Punan ang Title at Message.'; errEl.style.display='block'; return; }
  if(editingAnnouncementId){
    const idx = announcements.findIndex(x=>x.id===editingAnnouncementId);
    if(idx>-1) announcements[idx]={...announcements[idx],title,type,body,expiry,active};
  } else {
    announcements.unshift({ id: Date.now().toString(), title, type, body, expiry, active, createdAt: new Date().toISOString() });
  }
  saveAnnouncementsToStorage(announcements);
  document.getElementById('featuredFormCard').classList.add('hidden');
  editingAnnouncementId=null;
  renderAnnouncements();
});

// ── Profile tab ───────────────────────────────────────────────
function loadProfile(){
  const p = getProfileData();
  document.getElementById('profileUsername').value = currentAdminUser;
  document.getElementById('profileNameDisplay').textContent = currentAdminUser;
  document.getElementById('profileGmail').value = p.gmail;
  document.getElementById('profilePhone').value = p.phone;
  document.getElementById('profileAvatarLetter').textContent = currentAdminUser.charAt(0).toUpperCase();
  document.getElementById('profileJoined').textContent = 'Admin since ' + new Date().toLocaleDateString('en-PH',{year:'numeric',month:'long'});
  const preview = document.getElementById('profileAvatarPreview');
  const letter  = document.getElementById('profileAvatarLetter');
  if(p.photo){ preview.src=p.photo; preview.style.display='block'; letter.style.display='none'; }
  else { preview.style.display='none'; letter.style.display=''; }
  document.getElementById('profileCurrentPass').value='';
  document.getElementById('profileNewPass').value='';
  document.getElementById('profileNewPass2').value='';
  document.getElementById('profileError').style.display='none';
  document.getElementById('profileSuccess').classList.add('hidden');
}

document.getElementById('profileAvatarOverlay').addEventListener('click',()=>{
  document.getElementById('profilePicInput').click();
});
document.getElementById('profilePicInput').addEventListener('change', e=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    const data = ev.target.result;
    saveProfileData({photo: data});
    const preview = document.getElementById('profileAvatarPreview');
    const letter  = document.getElementById('profileAvatarLetter');
    preview.src=data; preview.style.display='block'; letter.style.display='none';
    updateSidebarAvatar();
  };
  reader.readAsDataURL(file);
});

document.getElementById('saveProfileBtn').addEventListener('click', async ()=>{
  const errEl     = document.getElementById('profileError');
  const successEl = document.getElementById('profileSuccess');
  errEl.style.display='none'; successEl.classList.add('hidden');
  const gmail = document.getElementById('profileGmail').value.trim();
  const phone = document.getElementById('profilePhone').value.trim();
  const curPass = document.getElementById('profileCurrentPass').value;
  const newPass = document.getElementById('profileNewPass').value;
  const newPass2= document.getElementById('profileNewPass2').value;
  saveProfileData({gmail, phone});
  if(curPass || newPass || newPass2){
    if(!curPass){ errEl.textContent='I-enter ang current password.'; errEl.style.display='block'; return; }
    if(!newPass||newPass.length<6){ errEl.textContent='Minimum 6 characters ang new password.'; errEl.style.display='block'; return; }
    if(newPass!==newPass2){ errEl.textContent='Hindi magkatugma ang new password.'; errEl.style.display='block'; return; }
    try{
      const r=await fetch('/api/admin/change-password',{
        method:'POST',
        headers:{'Content-Type':'application/json',Authorization:'Bearer '+getToken()},
        body:JSON.stringify({currentPassword:curPass,newPassword:newPass})
      });
      const d=await r.json();
      if(!r.ok){ errEl.textContent=d.error||'Hindi na-update ang password.'; errEl.style.display='block'; return; }
    } catch(e){ errEl.textContent='Hindi makonekta sa server.'; errEl.style.display='block'; return; }
  }
  successEl.classList.remove('hidden');
  document.getElementById('profileCurrentPass').value='';
  document.getElementById('profileNewPass').value='';
  document.getElementById('profileNewPass2').value='';
  setTimeout(()=>successEl.classList.add('hidden'),3000);
});

// ── Image modal ───────────────────────────────────────────────
document.getElementById('imgClose').addEventListener('click',()=>document.getElementById('imgOverlay').classList.remove('show'));
document.getElementById('imgOverlay').addEventListener('click',e=>{ if(e.target.id==='imgOverlay') document.getElementById('imgOverlay').classList.remove('show'); });

// ── Time helper ───────────────────────────────────────────────
function timeAgo(iso){
  if(!iso) return '—';
  const d=Math.floor((Date.now()-new Date(iso).getTime())/1000);
  if(d<60)    return 'kanina lang';
  if(d<3600)  return Math.floor(d/60)+'m ago';
  if(d<86400) return Math.floor(d/3600)+'h ago';
  return Math.floor(d/86400)+'d ago';
}

// ── Refresh ───────────────────────────────────────────────────
document.getElementById('refreshBtn').addEventListener('click',()=>loadAllData());
setInterval(()=>{ if(!dashboardEl.classList.contains('hidden')) loadAllData(); },15000);
// ══════════════════════════════════════════════════════════════
//  SUPPORT CHAT (Admin)
// ══════════════════════════════════════════════════════════════
let supportConvoCache = [];
let activeSupportConvoId = null;
let supportThreadPollInterval = null;

async function loadSupportConversations(){
  try{
    const r = await fetch('/api/admin/support/conversations', { headers:{ Authorization:'Bearer '+getToken() } });
    supportConvoCache = await r.json();
  } catch(e){ supportConvoCache = []; }
  renderSupportBadge();
}

function renderSupportBadge(){
  const totalUnread = supportConvoCache.reduce((s,c) => s + c.unreadCount, 0);
  const badge = document.getElementById('supportBadge');
  if(badge){ badge.textContent = totalUnread; badge.classList.toggle('show', totalUnread > 0); }
}

function renderSupportList(){
  const list = document.getElementById('supportConvoList');
  if(!supportConvoCache.length){ list.innerHTML = '<p class="admin-empty">Wala pang conversations.</p>'; return; }
  list.innerHTML = '<div class="order-cards-wrap">' + supportConvoCache.map(c => `
    <div class="order-card" data-convo="${c.id}" style="cursor:pointer;">
      <div class="order-info">
        <div class="order-info-top">
          <span class="order-user">${c.username}</span>
          ${c.unreadCount > 0 ? `<span class="order-status pending">${c.unreadCount} new</span>` : ''}
          <span class="order-status ${c.status === 'open' ? 'reviewed' : 'flagged'}">${c.status}</span>
        </div>
        <div class="order-meta">${c.lastMessage ? c.lastMessage.slice(0,80) : 'No messages yet'}</div>
        <div class="order-time">${c.lastMessageAt ? timeAgo(c.lastMessageAt) : ''}</div>
      </div>
    </div>`).join('') + '</div>';
  list.querySelectorAll('[data-convo]').forEach(card => {
    card.addEventListener('click', () => openSupportThread(card.dataset.convo));
  });
}

async function openSupportThread(convoId){
  activeSupportConvoId = convoId;
  const convo = supportConvoCache.find(c => String(c.id) === String(convoId));
  document.getElementById('supportThreadTitle').textContent = convo ? `Chat with ${convo.username}` : 'Chat';
  document.getElementById('supportThreadOverlay').classList.add('show');
  await loadSupportThreadMessages();
  await fetch('/api/admin/support/'+convoId+'/read', { method:'PATCH', headers:{ Authorization:'Bearer '+getToken() } });
  await loadSupportConversations();
  renderSupportList();
  clearInterval(supportThreadPollInterval);
  supportThreadPollInterval = setInterval(loadSupportThreadMessages, 5000);
}

async function loadSupportThreadMessages(){
  if(!activeSupportConvoId) return;
  try{
    const r = await fetch('/api/admin/support/'+activeSupportConvoId+'/messages', { headers:{ Authorization:'Bearer '+getToken() } });
    const msgs = await r.json();
    const list = document.getElementById('supportThreadMsgList');
    list.innerHTML = msgs.map(m => `
      <div class="support-bubble support-bubble--${m.senderType === 'admin' ? 'user' : 'admin'}">
        ${m.attachmentUrl ? `<img class="support-bubble-img" src="${m.attachmentUrl}" data-full="${m.attachmentUrl}" alt="attachment">` : ''}
        ${m.message ? `<div>${m.message.replace(/</g,'&lt;')}</div>` : ''}
        <div class="support-bubble-time">${m.senderType === 'admin' ? (m.senderName||'Admin') : m.senderName} · ${new Date(m.createdAt).toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>`).join('');
    list.scrollTop = list.scrollHeight;
    list.querySelectorAll('.support-bubble-img').forEach(img => {
      img.addEventListener('click', () => {
        document.getElementById('imgFull').src = img.dataset.full;
        document.getElementById('imgOverlay').classList.add('show');
      });
    });
  } catch(e){}
}

document.getElementById('supportThreadClose').addEventListener('click', () => {
  document.getElementById('supportThreadOverlay').classList.remove('show');
  clearInterval(supportThreadPollInterval);
  activeSupportConvoId = null;
});
document.getElementById('supportThreadOverlay').addEventListener('click', e => {
  if(e.target.id === 'supportThreadOverlay'){
    document.getElementById('supportThreadOverlay').classList.remove('show');
    clearInterval(supportThreadPollInterval);
    activeSupportConvoId = null;
  }
});

const supportThreadAttachBtn     = document.getElementById('supportThreadAttachBtn');
const supportThreadAttachInput   = document.getElementById('supportThreadAttachInput');
const supportThreadAttachPreview = document.getElementById('supportThreadAttachPreview');
let supportThreadSelectedFile = null;

if(supportThreadAttachBtn) supportThreadAttachBtn.addEventListener('click', () => supportThreadAttachInput.click());
if(supportThreadAttachInput) supportThreadAttachInput.addEventListener('change', () => {
  const file = supportThreadAttachInput.files[0];
  if(!file) return;
  supportThreadSelectedFile = file;
  const reader = new FileReader();
  reader.onload = ev => {
    supportThreadAttachPreview.innerHTML = `
      <img src="${ev.target.result}" alt="preview">
      <button type="button" id="supportThreadAttachRemove">&times;</button>`;
    supportThreadAttachPreview.style.display = 'flex';
    document.getElementById('supportThreadAttachRemove').addEventListener('click', () => {
      supportThreadSelectedFile = null;
      supportThreadAttachInput.value = '';
      supportThreadAttachPreview.style.display = 'none';
      supportThreadAttachPreview.innerHTML = '';
    });
  };
  reader.readAsDataURL(file);
});

document.getElementById('supportThreadSendBtn').addEventListener('click', async () => {
  const input = document.getElementById('supportThreadInput');
  const text = input.value.trim();
  if((!text && !supportThreadSelectedFile) || !activeSupportConvoId) return;
  input.value = '';
  const fileToSend = supportThreadSelectedFile;
  supportThreadSelectedFile = null;
  supportThreadAttachPreview.style.display = 'none';
  supportThreadAttachPreview.innerHTML = '';
  supportThreadAttachInput.value = '';
  const fd = new FormData();
  fd.append('message', text);
  if(fileToSend) fd.append('attachment', fileToSend);
  await fetch('/api/admin/support/'+activeSupportConvoId+'/message', {
    method:'POST', headers:{ Authorization:'Bearer '+getToken() }, body: fd
  });
  await loadSupportThreadMessages();
  await loadSupportConversations();
});