# Deploying kol.quest

| Hostname | What it serves | Host |
|----------|----------------|------|
| `kol.quest`, `www.kol.quest` | Next.js app in `site/` (UI, `/api/*`, auth) | Cloud Run service `kol-quest` (project `aerial-vehicle-466722-p5`, region `us-central1`) behind the Cloudflare Worker `kol-quest-proxy` |
| `docs.kol.quest` | Static documentation in `docs/` | Cloudflare Pages project `kol-quest` |

The `kol.quest` zone lives on Cloudflare. At Namecheap, the domain's nameservers point to Cloudflare. The PostgreSQL database is hosted on Neon.

## Why there's a Worker in front of Cloud Run

A Cloud Run domain mapping only works for a domain verified in Google Search Console under the deploying account. Instead, the Worker in [`deploy/cloudflare-proxy/`](../deploy/cloudflare-proxy/) is attached to `kol.quest` and `www.kol.quest` as a Workers Custom Domain and forwards each request to the `run.app` URL. Along the way it:

- sets `X-Forwarded-Host` and `X-Forwarded-Proto: https`
- passes redirects through (`redirect: "manual"`)
- rewrites a `Location` header that points at the `run.app` origin back to the public hostname, so auth callbacks stay on `kol.quest`

Cloudflare manages the DNS records and certificates for both hostnames. Don't add `A` or `CNAME` records for them.

## App (Cloud Run)

Cloud Run builds `site/` from source with Google Cloud buildpacks. [`site/.gcloudignore`](../site/.gcloudignore) keeps `node_modules`, `.next` and `.env*` out of the upload.

```bash
P=aerial-vehicle-466722-p5
cd site
gcloud run deploy kol-quest --source . \
  --region us-central1 --project "$P" \
  --service-account "three-ws@$P.iam.gserviceaccount.com" \
  --build-service-account "projects/$P/serviceAccounts/three-ws-build@$P.iam.gserviceaccount.com" \
  --memory 2Gi --cpu 1 --timeout 300 --allow-unauthenticated
```

Leave out the env and secret flags when redeploying and the service keeps its current configuration.

### Configuration

| Variable | Value / source |
|----------|----------------|
| `NEXT_PUBLIC_URL`, `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_BASE_URL`, `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL` | `https://kol.quest` |
| `BETTER_AUTH_TRUSTED_ORIGINS` | `https://kol.quest,https://www.kol.quest` |
| `DATABASE_URL` | Secret `kol-quest-database-url` (Neon) |
| `BETTER_AUTH_SECRET` | Secret `kol-quest-auth-secret` |
| `CRON_SECRET` | Secret `kol-quest-cron-secret` |
| `BIRDEYE_API_KEY`, `MORALIS_API_KEY`, `ETHERSCAN_API_KEY`, `DEBANK_API_KEY`, `HELIUS_API_KEY`, `DUNE_API_KEY`, `COVALENT_API_KEY`, `ALCHEMY_API_KEY`, `THE_GRAPH_API_KEY` | Secret Manager, one secret each |

`BETTER_AUTH_TRUSTED_ORIGINS` contains a comma, so pass it to `--set-env-vars` with an alternate delimiter: `'--set-env-vars=^@^BETTER_AUTH_TRUSTED_ORIGINS=https://kol.quest,https://www.kol.quest'`.

Not configured: Upstash Redis (`UPSTASH_REDIS_REST_URL` is missing, so the rate limiter falls back to in-memory) and Flipside (the Flipside half of the analytics refresh fails until `FLIPSIDE_API_KEY` is set).

The runtime service account `three-ws` needs `roles/secretmanager.secretAccessor` on every secret it reads.

## Scheduled job

`site/vercel.json` declares a Vercel cron for `/api/cron/analytics-refresh` every 15 minutes, but Vercel crons don't run on Cloud Run. The Cloud Scheduler job `kol-quest-analytics-refresh` (us-central1, `*/15 * * * *` UTC) calls `https://kol.quest/api/cron/analytics-refresh` with `Authorization: Bearer <CRON_SECRET>`.

```bash
gcloud scheduler jobs describe kol-quest-analytics-refresh --location us-central1
gcloud scheduler jobs run kol-quest-analytics-refresh --location us-central1
```

When you rotate `kol-quest-cron-secret`, update the job's `Authorization` header too.

## Proxy Worker

```bash
cd deploy/cloudflare-proxy
CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... npx wrangler@4 deploy
```

`ORIGIN` in `wrangler.toml` is the Cloud Run URL. Update it if the service is recreated.

## Docs (Cloudflare Pages)

```bash
npx wrangler@4 pages deploy docs --project-name=kol-quest --branch=main
```

[`.github/workflows/cloudflare-pages.yml`](../.github/workflows/cloudflare-pages.yml) runs this on each push to `main` that touches `docs/`. It needs the `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets.

## Verify

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://kol.quest/            # 200
curl -s https://kol.quest/api/health                                     # health JSON
curl -s -o /dev/null -w '%{http_code}\n' https://kol.quest/api/cron/analytics-refresh   # 401 without the cron secret
curl -s -o /dev/null -w '%{http_code}\n' https://docs.kol.quest/       # 200
```

## Rollback

- **App:** `gcloud run services update-traffic kol-quest --region us-central1 --to-revisions <REVISION>=100`.
- **Docs:** in the Cloudflare dashboard, open Pages → `kol-quest` → Deployments and choose **Rollback**.
- **Worker:** `npx wrangler@4 rollback` from `deploy/cloudflare-proxy/`.
