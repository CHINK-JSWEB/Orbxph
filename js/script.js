// Tab switching
const tabBtns = document.querySelectorAll('.tab-btn');
const switchLine = document.getElementById('switchLine');
function showPanel(name){
  document.querySelectorAll('.panel').forEach(p => p.classList.add('hidden'));
  document.getElementById('panel-' + name).classList.remove('hidden');
}
function setActiveTab(name){
  tabBtns.forEach(b => b.classList.toggle('active', b.dataset.target === name));
}
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target;
    setActiveTab(target);
    showPanel(target);
    document.getElementById('authTabs').style.display = 'flex';
    if(target === 'signin'){
      switchLine.innerHTML = 'New here? <a href="#" id="goSignup">Create account</a>';
    }else{
      switchLine.innerHTML = 'Already have an account? <a href="#" id="goSignin">Sign in</a>';
    }
    bindSwitchLine();
    clearErrors();
  });
});

function bindSwitchLine(){
  const goSignup = document.getElementById('goSignup');
  const goSignin = document.getElementById('goSignin');
  if(goSignup) goSignup.addEventListener('click', (e) => { e.preventDefault(); document.querySelector('[data-target="signup"]').click(); });
  if(goSignin) goSignin.addEventListener('click', (e) => { e.preventDefault(); document.querySelector('[data-target="signin"]').click(); });
}
bindSwitchLine();

// Forgot password / username
document.querySelectorAll('[data-forgot]').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const type = link.dataset.forgot;
    document.getElementById('forgotTitle').textContent =
      type === 'password' ? 'Reset your password' : 'Recover your username';
    document.getElementById('authTabs').style.display = 'none';
    switchLine.style.display = 'none';
    showPanel('forgot');
  });
});
document.getElementById('backToSignin').addEventListener('click', (e) => {
  e.preventDefault();
  document.getElementById('authTabs').style.display = 'flex';
  switchLine.style.display = 'block';
  document.querySelector('[data-target="signin"]').click();
});

// Password show/hide
document.querySelectorAll('.toggle-eye').forEach(eye => {
  eye.addEventListener('click', () => {
    const input = document.getElementById(eye.dataset.target);
    const isPw = input.type === 'password';
    input.type = isPw ? 'text' : 'password';
    eye.textContent = isPw ? 'HIDE' : 'SHOW';
  });
});

// ToS checkbox gates submit button
document.querySelectorAll('.tos-check').forEach(box => {
  box.addEventListener('change', () => {
    document.getElementById(box.dataset.for).disabled = !box.checked;
  });
});

// ToS modal
const tosOverlay = document.getElementById('tosOverlay');
document.querySelectorAll('.tos-link').forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    tosOverlay.classList.add('show');
  });
});
document.getElementById('tosClose').addEventListener('click', () => tosOverlay.classList.remove('show'));
tosOverlay.addEventListener('click', (e) => { if(e.target === tosOverlay) tosOverlay.classList.remove('show'); });

// ── Referral code input — auto-uppercase + checkmark ────────────
const refInput     = document.getElementById('su-referral');
const refCheckIcon = document.getElementById('refCheckIcon');
const refHint      = document.getElementById('refHint');

if(refInput){
  refInput.addEventListener('input', () => {
    // Force uppercase as user types
    const pos = refInput.selectionStart;
    refInput.value = refInput.value.toUpperCase();
    refInput.setSelectionRange(pos, pos);

    // Show checkmark if looks like a valid code (at least 6 chars)
    const val = refInput.value.trim();
    if(val.length >= 6){
      refCheckIcon.classList.remove('hidden');
      refHint.textContent = 'Code entered — irerecieve ng nagpa-refer sa iyo ang reward kapag na-approve ang iyong order.';
      refHint.style.color = '#7CFFB2';
    } else {
      refCheckIcon.classList.add('hidden');
      refHint.textContent = 'May nagpa-refer sa iyo? I-paste ang kanilang referral code.';
      refHint.style.color = '';
    }
  });

  // Also handle paste — uppercase after paste
  refInput.addEventListener('paste', () => {
    setTimeout(() => {
      refInput.value = refInput.value.toUpperCase();
      refInput.dispatchEvent(new Event('input'));
    }, 0);
  });
}

// ── Error helpers ────────────────────────────────────────────
function showError(formId, message, isSuccess){
  const el = document.querySelector('#' + formId + ' .form-error');
  if(el){
    el.textContent = message;
    el.style.display = 'block';
    el.style.color = isSuccess ? '#7CFFB2' : '#ff8080';
    el.style.borderColor = isSuccess ? 'rgba(124,255,178,0.3)' : 'rgba(255,90,90,0.25)';
    el.style.background = isSuccess ? 'rgba(124,255,178,0.08)' : 'rgba(255,90,90,0.08)';
  }
}
function clearErrors(){
  document.querySelectorAll('.form-error').forEach(el => { el.textContent=''; el.style.display='none'; });
}

function fullPhone(inputEl){
  return '+63' + inputEl.value.replace(/\D/g,'');
}

// ── Sign up ──────────────────────────────────────────────────
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const username    = document.getElementById('su-username').value.trim();
  const phoneInput  = document.getElementById('su-phone');
  const phone       = fullPhone(phoneInput);
  const password    = document.getElementById('su-password').value;
  const confirm     = document.getElementById('su-confirm').value;
  const referralCode = document.getElementById('su-referral')?.value.trim().toUpperCase() || '';

  if(!username){
    return showError('signupForm', 'Maglagay ng username.');
  }
  if(phoneInput.value.replace(/\D/g,'').length < 10){
    return showError('signupForm', 'Maglagay ng tamang 10-digit na mobile number.');
  }
  if(password.length < 6){
    return showError('signupForm', 'Dapat hindi bababa sa 6 characters ang password.');
  }
  if(password !== confirm){
    return showError('signupForm', 'Hindi magkatugma ang password.');
  }

  try{
    const res = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username,
        phone,
        password,
        referralCode: referralCode || undefined   // send only if may laman
      })
    });
    const data = await res.json();
    if(!res.ok){
      return showError('signupForm', data.error || 'May problema sa pag-register.');
    }
    document.querySelector('[data-target="signin"]').click();
    showError('signinForm', 'Account created! Pwede ka nang mag-login.', true);
  } catch(err){
    showError('signupForm', 'Hindi makonekta sa server. Siguraduhing tumatakbo ang server.js.');
  }
});

// ── Sign in ──────────────────────────────────────────────────
document.getElementById('signinForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();

  const phoneInput = document.getElementById('si-phone');
  const phone      = fullPhone(phoneInput);
  const password   = document.getElementById('si-password').value;

  if(phoneInput.value.replace(/\D/g,'').length < 10){
    return showError('signinForm', 'Maglagay ng tamang mobile number.');
  }

  try{
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    });
    const data = await res.json();
    if(!res.ok){
      return showError('signinForm', data.error || 'Hindi ma-login.');
    }
    localStorage.setItem('orbx_user', data.username);
    window.location.href = 'welcome.html';
  } catch(err){
    showError('signinForm', 'Hindi makonekta sa server. Siguraduhing tumatakbo ang server.js.');
  }
});

// ── Forgot (UI only) ─────────────────────────────────────────
document.getElementById('forgotForm').addEventListener('submit', (e) => {
  e.preventDefault();
  alert('Demo lang ito sa ngayon — wala pang aktwal na SMS o email na ipapadala.');
});
