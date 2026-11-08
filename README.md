# NEBULA — iPhone IPA Signer

A **working IPA re-signing application**, presented as an installable, iOS-style Progressive Web App (PWA). The app's UI runs in Safari or Home Screen standalone mode. Re-signing runs **on a server that you control** through the open-source [`zsign`](https://github.com/zhlynn/zsign) engine, without requiring a Mac or Xcode on your phone.

> **Not a pre-signed iOS `.ipa`:** iOS won't install arbitrary native apps just because they are downloaded. An installable native `.ipa` requires valid Apple signing/distribution, and a signed result only installs on eligible devices. You must provide a legitimate `.p12` certificate and matching `.mobileprovision` profile. Do not upload keys to a server you do not trust.

## Included

- **Premium iOS UI:** dark glass, luminous gradients, orbital artwork, dot grid, responsive tabs and Home Screen icon
- **Real re-signing:** IPA upload, P12, 1–6 provisioning profiles (extensions supported where corresponding profiles are supplied), optional bundle ID and display name, P12 password
- **Privacy controls:** private server access key, HTTPS hosting, sensitive uploads deleted immediately after signing, signed IPA removed within 20 minutes, download tickets expire after 60 seconds
- **Progress and activity:** upload progress, signing status poll, short-lived download, local-only activity history
- **Deployment:** Dockerfile with zsign compilation, `render.yaml` blueprint

## Deploy from an iPhone (no Mac required)

You need a hosted Linux Docker environment with persistent availability during signing and sufficient temporary disk capacity. Render is an option. A paid plan may be necessary for large IPA uploads or continuous availability.

1. Use an iPhone-accessible cloud development tool or GitHub browser interface to put all project files in a **private repository**, preserving the folder layout. The source ZIP needs to be **extracted** before pushing to GitHub; uploading the ZIP as a single GitHub file will not create a deployable project.
2. Open [Render Dashboard](https://dashboard.render.com/) in Safari, create a **Blueprint** connected to your repository, and let it discover `render.yaml`. Alternatively create a Docker web service pointed at the repo.
3. Set `SIGNER_ACCESS_TOKEN` to a **random secret with at least 24 characters**, for example a randomly generated 40+ character password. **Do not publish this token or the signing certificate in GitHub.**
4. Deploy, then open the service's `https://…onrender.com` URL in Safari. Visit **Settings → Private Access Key** and enter the token you configured.
5. In the Signing Studio, import the `.ipa`, `.p12`, and matching `.mobileprovision` file(s) using iPhone Files. Enter the P12 password; sign; download the resulting IPA into Files.
6. To install the signer interface as a Home Screen app: Safari **Share → Add to Home Screen**.

**Important:** Installing the resulting *signed application* is a **separate step** from downloading it. An Apple-approved distribution method or compatible authorized installer is still required; NEBULA does not silently install IPAs or bypass iOS restrictions. Development/ad hoc profiles require the device to be registered and the app's bundle ID/entitlements must match. Depending on distribution method, Developer Mode and/or an authorized installation method may be required.

## Run locally (Linux/macOS with zsign)

```bash
cp .env.example .env
# Edit the secret in .env and install zsign
npm install
set -a; source .env; set +a
npm start
```

Visit `http://localhost:3000`. On a real iPhone use an HTTPS host, never HTTP with signing keys. Node 20+ is supported. No SDK is needed on the client; the signing server does require zsign and enough RAM/disk space for the IPA's temporary extraction.

## Architecture

```text
iPhone Safari / PWA
    │ HTTPS POST (multipart IPA, P12, provisioning profiles, password)
    ▼
Node/Express signing service — Bearer key gate (SIGNER_ACCESS_TOKEN)
    │ ephemeral temp directory, one zsign process per job
    ▼
zsign (Linux executable)
    │ signed IPA in temp storage for up to 20 minutes
    ▼
One-time 60-second ticket → iPhone Files download
```

### API

- `GET /api/health` — public readiness check
- `POST /api/jobs` — authenticated multipart request: `ipa`, `cert`, `profiles` (one or more), `password`, optional `bundleId`, `displayName`
- `GET /api/jobs/:id` — authenticated job polling
- `POST /api/jobs/:id/ticket` — authenticated one-time download ticket
- `GET /api/download/:ticket` — one-time file download
- `DELETE /api/jobs/:id` — cancel a running job

The backend allows 2 simultaneous requests to limit resource use. By default the IPA upload limit is **250 MB**. Increase `MAX_IPA_MB` only when the hosting resources support it. Uploaded certificates, profiles, and passwords are **not intentionally persisted to a database**; uploads are deleted on completion. Passwords are provided as a zsign process argument, so the server must remain private/trusted. The signed IPA temporarily resides unencrypted on the host's filesystem and is removed at expiration.

### Security limitations

This is a single-owner personal tool, **not** a multi-tenant production signing service. Before opening to other users, add robust user auth, upload quotas, malware/scanning isolation, per-job container sandboxing, stronger rate limits, log redaction, alerting, and full lifecycle testing. Do not use publicly accessible shared credentials or store P12 files in the web application's assets.

### Verification status

The browser interface and JS syntax have been inspected/tested in a browser preview, including tabs and disabled signing states. A real `.ipa` signing job has **not been executed** because no authorized Apple signing certificate or provisioning profile was supplied here. The Docker build also requires internet access to download zsign and Node dependencies when deployed.

## zsign credits

The zsign engine is an independent open-source project at https://github.com/zhlynn/zsign (MIT license). The NEBULA source ZIP does not contain Apple certificates, actual IPAs, or zsign binary distributions. Source licenses from upstream apply when deploying.
