const $ = id => document.getElementById(id);
const els = {
  ipa: $('ipaInput'), cert: $('certInput'), profiles: $('profileInput'), password: $('passwordInput'),
  bundle: $('bundleInput'), displayName: $('displayNameInput'), sign: $('signButton'),
  panel: $('progressPanel'), result: $('resultPanel'), token: $('accessTokenInput'), remember: $('rememberToken')
};
const state = { busy: false, jobId: null, signedName: '', history: [], token: '' };
try { state.history = JSON.parse(localStorage.getItem('nebula_history') || '[]'); } catch { state.history = []; }
const KEY = 'nebula_access_token';
try { state.token = sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || ''; } catch {}
try { els.remember.checked = Boolean(localStorage.getItem(KEY)); } catch {}
state.token = '';
els.token.value = '';
els.token.disabled = true;
$('saveSettings').disabled = true;
for (const input of [els.ipa, els.cert, els.profiles, els.password]) input.disabled = true;

function toast(message) {
  const el = $('toast');
  el.textContent = message;
  el.classList.add('visible');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('visible'), 4200);
}
function iconSafeText(node, text) { node.textContent = text; }
function size(bytes) { return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }
function firstFile(input) { return input.files && input.files.length ? input.files[0] : null; }
function textFile(input, titleId, descId, placeholder, descPlaceholder) {
  const file = firstFile(input);
  iconSafeText($(titleId), file ? file.name : placeholder);
  iconSafeText($(descId), file ? size(file.size) + ' • ready' : descPlaceholder);
}
function updateVault(name, badge, value, loaded) {
  $(name).textContent = value;
  $(badge).textContent = loaded ? 'READY' : 'EMPTY';
  $(badge).classList.toggle('present', loaded);
}
function updateFileState() {
  els.sign.disabled = true;
  textFile(els.ipa, 'ipaFileTitle', 'ipaFileDescription', 'Choose an IPA file', 'Browse Files on your iPhone');
  textFile(els.cert, 'certTitle', 'certDesc', 'Certificate', 'Import .p12');
  const profiles = Array.from(els.profiles.files || []);
  $('profileTitle').textContent = profiles.length > 1 ? `${profiles.length} profiles` : profiles.length ? profiles[0].name : 'Provisioning';
  $('profileDesc').textContent = profiles.length ? `${profiles.length} profile${profiles.length === 1 ? '' : 's'} selected` : 'Import profile(s)';
  const ipa = firstFile(els.ipa), cert = firstFile(els.cert);
  updateVault('vaultIpa', 'vaultIpaBadge', ipa?.name || 'No IPA selected', Boolean(ipa));
  updateVault('vaultCert', 'vaultCertBadge', cert?.name || 'No .p12 selected', Boolean(cert));
  updateVault('vaultProfile', 'vaultProfileBadge', profiles.length ? profiles.map(p => p.name).join(', ') : 'No profile selected', Boolean(profiles.length));
  els.sign.disabled = true;
  if (!state.busy) $('signButtonText').textContent = 'SIGNING OFFLINE';
  els.result.hidden = true;
}
[els.ipa, els.cert, els.profiles].forEach(input => input.addEventListener('change', updateFileState));
function showView(view) {
  document.querySelectorAll('.view').forEach(el => el.classList.toggle('active', el.id === `view-${view}`));
  document.querySelectorAll('.tab').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => showView(el.dataset.view)));
document.querySelectorAll('[data-goto]').forEach(el => el.addEventListener('click', () => showView(el.dataset.goto)));
$('connectButton').addEventListener('click', () => showView('settings'));
for (const [button, input] of [['revealPassword', els.password], ['revealAccessToken', els.token]]) {
  $(button).addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    $(button).textContent = hidden ? 'HIDE' : 'SHOW';
  });
}
$('saveSettings').addEventListener('click', async () => {
  const token = els.token.value.trim();
  state.token = token;
  try {
    if (els.remember.checked) {
      localStorage.setItem(KEY, token);
      sessionStorage.removeItem(KEY);
    } else {
      sessionStorage.setItem(KEY, token);
      localStorage.removeItem(KEY);
    }
  } catch { toast('Browser storage is unavailable; key will remain until the page reloads.'); }
  $('engineMessage').textContent = token ? 'Key saved. Signer API access is ready to test.' : 'No access key saved yet.';
  toast(token ? 'Access key saved on this device.' : 'Access key cleared.');
  await checkHealth();
});
async function checkHealth() {
  $('statusDot').className = 'online-pulse offline';
  $('connectionStatus').textContent = 'PREVIEW MODE';
  $('engineMessage').textContent = 'Free GitHub Pages UI preview: signing is disabled until a secure server is available. Do not enter certificates or passwords.';
  return;
  try {
    const response = await fetch('/api/health', { cache: 'no-store' });
    if (!response.ok) throw new Error('offline');
    const data = await response.json();
    $('statusDot').className = `online-pulse ${data.signerReady ? 'online' : 'offline'}`;
    $('connectionStatus').textContent = data.signerReady ? 'ENGINE ONLINE' : 'ENGINE UNAVAILABLE';
    $('engineMessage').textContent = data.signerReady ? `Signer active • IPA upload limit ${data.maxIpaMB} MB. ${state.token ? 'Access key saved.' : 'Add your private access key to sign.'}` : 'Server is online, but the zsign executable is missing.';
  } catch {
    $('statusDot').className = 'online-pulse offline';
    $('connectionStatus').textContent = 'OFFLINE / PREVIEW';
    $('engineMessage').textContent = 'Deploy this project to a server with zsign to enable real signing.';
  }
}
function setProgress(percent, title, description) {
  els.panel.hidden = false;
  $('progressFill').style.width = `${percent}%`;
  $('progressPercent').textContent = title === 'Signing application' ? '•••' : `${Math.floor(percent)}%`;
  $('progressTitle').textContent = title;
  $('progressText').textContent = description;
}
function addHistory(job, stateName = 'done') {
  state.history = [{ id: job.id, name: job.name, date: new Date().toISOString(), state: stateName }, ...state.history.filter(item => item.id !== job.id)].slice(0, 18);
  try { localStorage.setItem('nebula_history', JSON.stringify(state.history)); } catch {}
  renderActivity();
}
function renderActivity() {
  const list = $('activityList');
  list.replaceChildren();
  if (!state.history.length) {
    const empty = document.createElement('div'); empty.className = 'empty-activity';
    empty.innerHTML = '<svg><use href="#ic-activity"/></svg>No signatures yet. Your recent jobs will appear here.';
    list.append(empty);
    return;
  }
  for (const activity of state.history) {
    const card = document.createElement('div'); card.className = 'activity-card';
    const symbol = document.createElement('div'); symbol.className = 'module-icon purple'; symbol.innerHTML = '<svg><use href="#ic-file"/></svg>';
    const details = document.createElement('div');
    const name = document.createElement('strong'); name.textContent = activity.name;
    const date = document.createElement('p'); date.textContent = new Date(activity.date).toLocaleString();
    details.append(name, date);
    const badge = document.createElement('span'); badge.className = 'state ' + (activity.state === 'done' ? 'done' : 'error'); badge.textContent = activity.state === 'done' ? 'SIGNED' : 'FAILED';
    card.append(symbol, details, badge); list.append(card);
  }
}
$('clearHistory').addEventListener('click', () => { state.history = []; try { localStorage.removeItem('nebula_history'); } catch {} renderActivity(); toast('Local history cleared.'); });
function authHeader() { return { Authorization: `Bearer ${state.token}` }; }
async function requestJSON(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { ...authHeader(), ...(options.headers || {}) }, cache: 'no-store' });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}
function createJobWithUpload(body) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/jobs');
    xhr.setRequestHeader('Authorization', `Bearer ${state.token}`);
    xhr.timeout = 10 * 60 * 1000;
    xhr.upload.onprogress = event => {
      if (event.lengthComputable) setProgress(Math.min(95, event.loaded / event.total * 100), 'Uploading securely', `${size(event.loaded)} of ${size(event.total)} sent to your private signing engine`);
    };
    xhr.upload.onload = () => setProgress(100, 'Upload complete', 'Your signing engine is preparing the certificate and package…');
    xhr.onerror = () => reject(new Error('Network upload failed. Check your connection and try again.'));
    xhr.ontimeout = () => reject(new Error('Upload timed out. Try a smaller IPA or a faster connection.'));
    xhr.onload = () => {
      let data = {}; try { data = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(new Error(data.error || `Upload failed (${xhr.status}).`));
    };
    xhr.send(body);
  });
}
async function waitForJob(id) {
  for (let i = 0; i < 420; i++) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    const job = await requestJSON(`/api/jobs/${encodeURIComponent(id)}`);
    if (job.state === 'done') return job;
    if (job.state === 'error' || job.state === 'canceled') throw new Error(job.message || 'Signing failed.');
    setProgress(100, 'Signing application', 'Applying signature and repacking your IPA. This may take several minutes…');
  }
  throw new Error('Could not confirm job completion. Check your signing server.');
}
async function sign() {
  if (state.busy) return;
  if (!state.token) { showView('settings'); toast('Set your private engine access key before signing.'); return; }
  const ipa = firstFile(els.ipa), cert = firstFile(els.cert), profiles = Array.from(els.profiles.files || []);
  if (!ipa || !cert || !profiles.length) { toast('Select an IPA, certificate, and provisioning profile.'); return; }
  if (!ipa.name.toLowerCase().endsWith('.ipa') || !cert.name.toLowerCase().endsWith('.p12') || profiles.some(p => !p.name.toLowerCase().endsWith('.mobileprovision'))) { toast('File types must be IPA, P12, and mobileprovision.'); return; }
  state.busy = true; state.jobId = null; state.signedName = ''; els.sign.disabled = true; els.result.hidden = true;
  $('signButtonText').textContent = 'PROCESSING…';
  setProgress(0, 'Preparing upload', 'Creating your secure one-time signing request…');
  const form = new FormData(); form.append('ipa', ipa); form.append('cert', cert);
  for (const profile of profiles) form.append('profiles', profile);
  form.append('password', els.password.value);
  form.append('bundleId', els.bundle.value.trim());
  form.append('displayName', els.displayName.value.trim());
  let job = null;
  try {
    job = await createJobWithUpload(form);
    state.jobId = job.id;
    setProgress(100, 'Signing application', 'Applying the Apple certificate and provisioning profile…');
    const done = await waitForJob(job.id);
    state.signedName = done.name;
    $('resultFileName').textContent = done.name;
    els.result.hidden = false;
    els.panel.hidden = true;
    addHistory(done, 'done');
    toast('IPA signed successfully. Download is ready.');
  } catch (error) {
    els.panel.hidden = true;
    if (job?.id) addHistory(job, 'error');
    toast(error.message || 'Signing failed.');
  } finally {
    state.busy = false;
    updateFileState();
    if (state.jobId && state.signedName) els.result.hidden = false;
    $('signButtonText').textContent = 'SIGN APPLICATION';
  }
}
els.sign.addEventListener('click', sign);
$('downloadButton').addEventListener('click', async () => {
  if (!state.jobId) { toast('No signed IPA available in this session.'); return; }
  try {
    const ticket = await requestJSON(`/api/jobs/${encodeURIComponent(state.jobId)}/ticket`, { method: 'POST' });
    const link = document.createElement('a');
    link.href = ticket.url; link.download = state.signedName || 'signed.ipa';
    document.body.append(link); link.click(); link.remove();
    toast('Download requested. Check Safari Downloads or the Files app.');
  } catch (error) { toast(error.message); }
});
updateFileState(); renderActivity(); checkHealth();
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
