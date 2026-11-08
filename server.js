import express from 'express';
import helmet from 'helmet';
import multer from 'multer';
import { spawn, spawnSync } from 'node:child_process';
import { randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 3000);
const TOKEN = process.env.SIGNER_ACCESS_TOKEN ?? '';
const SIGNER = process.env.ZSIGN_PATH ?? 'zsign';
const MAX_IPA_MB = Math.max(10, Math.min(1500, Number(process.env.MAX_IPA_MB ?? 250)));
const MAX_IPA_BYTES = MAX_IPA_MB * 1024 * 1024;
const MAX_ACTIVE = 2;
const RETENTION_MS = 20 * 60 * 1000;
const SIGN_TIMEOUT_MS = 7 * 60 * 1000;
const jobs = new Map();
const tickets = new Map();
let reserved = 0;

function safeEqual(left, right) {
  const a = Buffer.from(left || '', 'utf8');
  const b = Buffer.from(right || '', 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}
function authorize(req, res, next) {
  if (!TOKEN || TOKEN.length < 24) return res.status(503).json({ error: 'Set SIGNER_ACCESS_TOKEN (minimum 24 characters) on the server.' });
  const header = req.get('Authorization') || '';
  const provided = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!safeEqual(provided, TOKEN)) return res.status(401).json({ error: 'Incorrect access key. Open Settings to update it.' });
  next();
}
function fail(res, status, message) { return res.status(status).json({ error: message }); }
const dir = path.join(root, 'public');
app.disable('x-powered-by');
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
      connectSrc: ["'self'"], imgSrc: ["'self'", 'data:'],
      manifestSrc: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));
app.get('/api/health', (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json({ ok: true, signerReady: Boolean(spawnSync('which', [SIGNER]).status === 0 || fs.existsSync(SIGNER)), name: 'NEBULA Engine', maxIpaMB: MAX_IPA_MB });
});

function reserveSlot(req, res, next) {
  if (reserved >= MAX_ACTIVE) return fail(res, 429, 'Signer is busy. Try again after the active job finishes.');
  reserved++;
  req.slotHeld = true;
  req.workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nebula-job-'));
  next();
}
function releaseSlot(req) {
  if (req.slotHeld) { reserved = Math.max(0, reserved - 1); req.slotHeld = false; }
}
async function removeFolder(folder) {
  if (folder) await fsp.rm(folder, { recursive: true, force: true }).catch(() => {});
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, req.workDir),
    filename: (req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase().slice(0, 32)}`)
  }),
  limits: { fileSize: MAX_IPA_BYTES, files: 8, fields: 4, fieldSize: 512, parts: 12 }
}).fields([{ name: 'ipa', maxCount: 1 }, { name: 'cert', maxCount: 1 }, { name: 'profiles', maxCount: 6 }]);
const validBundle = /^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z0-9-]+$/;

function newJobPublic(job) {
  return { id: job.id, state: job.state, name: job.name, createdAt: job.createdAt, expiresAt: job.expiresAt ?? null, message: job.message };
}
async function runSign(job) {
  if (job.state === 'canceled') return;
  job.state = 'signing';
  job.message = 'Resigning the IPA with zsign…';
  const args = ['-f', '-k', job.cert, '-p', job.password];
  for (const profile of job.profiles) args.push('-m', profile);
  if (job.bundleId) args.push('-b', job.bundleId);
  if (job.displayName) args.push('-n', job.displayName);
  args.push('-o', path.join(job.workDir, 'signed.ipa'), job.ipa);
  let timedOut = false;
  try {
    await new Promise((resolve, reject) => {
      const child = spawn(SIGNER, args, { stdio: ['ignore', 'ignore', 'pipe'], cwd: job.workDir, env: { ...process.env, HOME: job.workDir } });
      job.child = child;
      let errors = '';
      child.stderr.on('data', chunk => { if (errors.length < 1024) errors += String(chunk).slice(0, 1024); });
      const timeout = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, SIGN_TIMEOUT_MS);
      child.on('error', err => { clearTimeout(timeout); reject(err); });
      child.on('close', code => { clearTimeout(timeout); code === 0 && !timedOut ? resolve() : reject(new Error(timedOut ? 'Signing timed out' : `zsign exited with ${code}`)); });
    });
    const output = path.join(job.workDir, 'signed.ipa');
    const stat = await fsp.stat(output);
    if (stat.size < 16) throw new Error('Output file was empty');
    const resultDir = await fsp.mkdtemp(path.join(os.tmpdir(), 'nebula-output-'));
    job.resultDir = resultDir;
    job.resultPath = path.join(resultDir, 'signed.ipa');
    await fsp.rename(output, job.resultPath);
    job.state = 'done';
    job.message = 'Your signed IPA is ready to download.';
    job.expiresAt = Date.now() + RETENTION_MS;
  } catch (error) {
    if (job.state !== 'canceled') {
      job.state = 'error';
      job.message = timedOut ? 'Signing timed out. Try a smaller IPA.' : 'Signing failed. Check certificate password, provisioning profile, bundle ID, and IPA compatibility.';
      job.expiresAt = Date.now() + 3 * 60 * 1000;
    }
  } finally {
    job.password = '';
    job.child = null;
    await removeFolder(job.workDir);
    job.workDir = null;
    releaseSlot(job.request);
    job.request = null;
    job.cert = null;
    job.ipa = null;
    job.profiles = [];
  }
}

app.post('/api/jobs', authorize, reserveSlot, (req, res) => {
  upload(req, res, async (error) => {
    if (error) {
      releaseSlot(req); await removeFolder(req.workDir);
      return fail(res, error instanceof multer.MulterError ? 413 : 400, error.code === 'LIMIT_FILE_SIZE' ? `File too large (maximum ${MAX_IPA_MB} MB).` : 'Upload failed. Check your files and try again.');
    }
    const ipa = req.files?.ipa?.[0];
    const cert = req.files?.cert?.[0];
    const profiles = req.files?.profiles || [];
    const bundleId = String(req.body?.bundleId ?? '').trim();
    const displayName = String(req.body?.displayName ?? '').trim();
    const password = String(req.body?.password ?? '');
    let message = '';
    if (!ipa || !cert || profiles.length < 1) message = 'IPA, .p12 certificate, and at least one provisioning profile are required.';
    else if (path.extname(ipa.originalname).toLowerCase() !== '.ipa') message = 'Choose an .ipa file.';
    else if (path.extname(cert.originalname).toLowerCase() !== '.p12') message = 'Choose a .p12 certificate.';
    else if (cert.size > 5 * 1024 * 1024) message = 'Certificate exceeds 5 MB.';
    else if (profiles.some(p => path.extname(p.originalname).toLowerCase() !== '.mobileprovision' || p.size > 5 * 1024 * 1024)) message = 'Profiles must be .mobileprovision files under 5 MB each.';
    else if (bundleId && (!validBundle.test(bundleId) || bundleId.length > 200)) message = 'Invalid bundle identifier.';
    else if (displayName.length > 80 || /[\x00-\x1f]/.test(displayName)) message = 'Display name is invalid or too long.';
    else if (Buffer.byteLength(password, 'utf8') > 400) message = 'Certificate password is too long.';
    else {
      try {
        const fh = await fsp.open(ipa.path, 'r');
        const head = Buffer.alloc(4);
        await fh.read(head, 0, 4, 0);
        await fh.close();
        if (head.subarray(0, 2).toString('hex') !== '504b') message = 'IPA does not appear to be a ZIP archive.';
      } catch { message = 'Could not verify IPA header.'; }
    }
    if (message) { releaseSlot(req); await removeFolder(req.workDir); return fail(res, 400, message); }
    const id = randomUUID();
    const baseName = path.basename(ipa.originalname, '.ipa').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'app';
    const job = { id, state: 'queued', message: 'Upload complete. Preparing signing engine…',
      createdAt: Date.now(), name: `${baseName}-signed.ipa`, workDir: req.workDir, request: req,
      ipa: ipa.path, cert: cert.path, profiles: profiles.map(p => p.path),
      bundleId, displayName, password, expiresAt: null, resultDir: null, resultPath: null, child: null };
    jobs.set(id, job);
    res.status(202).json(newJobPublic(job));
    setImmediate(() => runSign(job));
  });
});
app.get('/api/jobs/:id', authorize, (req, res) => {
  res.set('Cache-Control', 'no-store');
  const job = jobs.get(req.params.id);
  if (!job) return fail(res, 404, 'Signing job expired or not found.');
  res.json(newJobPublic(job));
});
app.post('/api/jobs/:id/ticket', authorize, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || job.state !== 'done' || !job.resultPath) return fail(res, 404, 'Signed file is not available.');
  const ticket = randomBytes(32).toString('hex');
  tickets.set(ticket, { jobId: job.id, expiresAt: Date.now() + 60_000 });
  res.set('Cache-Control', 'no-store').json({ url: `/api/download/${ticket}` });
});
app.get('/api/download/:ticket', (req, res) => {
  res.set('Cache-Control', 'no-store, private');
  res.set('Referrer-Policy', 'no-referrer');
  const item = tickets.get(req.params.ticket);
  if (!item || item.expiresAt < Date.now()) return fail(res, 404, 'Download link expired. Generate a new one from NEBULA.');
  const job = jobs.get(item.jobId);
  if (!job || job.state !== 'done' || !job.resultPath) return fail(res, 404, 'Signed file no longer available.');
  tickets.delete(req.params.ticket);
  res.download(job.resultPath, job.name);
});
app.delete('/api/jobs/:id', authorize, async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return fail(res, 404, 'Job not found.');
  job.state = 'canceled';
  job.message = 'Job canceled.';
  job.expiresAt = Date.now() + 30_000;
  job.child?.kill('SIGKILL');
  if (!job.child && job.workDir) { await removeFolder(job.workDir); releaseSlot(job.request); job.workDir = null; }
  res.json({ ok: true });
});
setInterval(async () => {
  const now = Date.now();
  for (const [ticket, info] of tickets) if (info.expiresAt <= now) tickets.delete(ticket);
  for (const [id, job] of jobs) {
    if (job.expiresAt && job.expiresAt <= now && job.state !== 'signing') {
      jobs.delete(id);
      await removeFolder(job.workDir);
      await removeFolder(job.resultDir);
    }
  }
}, 30_000).unref();
app.use(express.static(dir, { index: 'index.html', maxAge: '5m' }));
app.get('*', (req, res) => res.sendFile(path.join(dir, 'index.html')));
app.use((err, req, res, next) => {
  releaseSlot(req);
  if (req.workDir) removeFolder(req.workDir);
  if (!res.headersSent) fail(res, 500, 'Unexpected server error.');
});
app.listen(PORT, '0.0.0.0', () => console.log(`NEBULA listening on :${PORT}`));
