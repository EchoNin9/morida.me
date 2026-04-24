# morida.me Bootstrap Tasks

Clone of `orangewhip.surf` → `morida.me`  
Resource prefix: `mo-` (was `ows-`)  
DNS: ClouDNS (not Route 53 — key architectural difference from source repo)  
Branches: `main` (production) · `develop` (staging)  
Environments: `www.morida.me` (prod) · `stage.morida.me` (staging)

> **Legend**  
> 🤖 Agent can execute autonomously  
> 👤 Human intervention required  
> ⚡ Can run in parallel with other tasks in the same phase

---

## Phase 0 — Prerequisites (Manual Bootstrap)

These must be completed before any agent or CI work can run. No automation possible.

### P0-A — AWS Terraform State Bootstrap
> 👤 **Human** — Run once in your AWS account before `terraform init`

```bash
AWS_PROFILE=echo9  # or whichever profile targets the right account
REGION=us-east-1

# 1. Create Terraform state bucket (versioning + encryption)
aws s3api create-bucket --bucket mo-aws-s3-terraform-state --region $REGION
aws s3api put-bucket-versioning \
  --bucket mo-aws-s3-terraform-state \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption \
  --bucket mo-aws-s3-terraform-state \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'
aws s3api put-public-access-block \
  --bucket mo-aws-s3-terraform-state \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

# 2. Create DynamoDB lock table
aws dynamodb create-table \
  --table-name mo-terraform-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region $REGION
```

**Note your AWS account ID** — needed for the media bucket variable in Phase 2.

---

### P0-B — AWS OIDC Identity Provider (GitHub Actions)
> 👤 **Human** — One-time per AWS account; skip if already exists

```bash
# Check if OIDC provider already exists
aws iam list-open-id-connect-providers | grep token.actions.githubusercontent.com

# If not present, create it:
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

---

### P0-C — IAM Roles for GitHub Actions (Staging + Production)
> 👤 **Human** — Create two IAM roles that CI assumes via OIDC

Create two roles, one per environment. Each role needs:

1. **Trust policy** — allow `token.actions.githubusercontent.com` to assume it, scoped to `repo:EchoNin9/morida.me:ref:refs/heads/<branch>`
2. **Permissions** — attach a policy covering: S3 (state + website + media buckets), DynamoDB (state lock), IAM, Lambda, API Gateway, Cognito, CloudFront, ACM, EventBridge, MediaConvert, Bedrock, CloudWatch Logs

Use the orangewhip IAM role trust policies and `ows-deploy` policy as a template, substituting:
- `orangewhip` → `morida`
- `ows-` → `mo-`

| Role name | Branch scope |
|-----------|-------------|
| `github-actions-morida-staging` | `refs/heads/develop` |
| `github-actions-morida-production` | `refs/heads/main` |

After creation, record both role ARNs — needed for P0-D.

---

### P0-D — GitHub Actions Repository Variables
> 👤 **Human** — Set in the `EchoNin9/morida.me` repo → Settings → Secrets and variables → Actions → Variables

| Variable | Value |
|----------|-------|
| `AWS_ROLE_ARN_STAGING` | ARN of `github-actions-morida-staging` |
| `AWS_ROLE_ARN_PRODUCTION` | ARN of `github-actions-morida-production` |
| `AWS_REGION` | `us-east-1` |

---

### P0-E — ClouDNS Zone Verification
> 👤 **Human** — Confirm `morida.me` zone exists in ClouDNS with NS records propagated

Verify at [ClouDNS control panel](https://www.cloudns.net/zone/). No records need to be added yet — they are added in Phase 4 after CloudFront distributions are created.

---

## Phase 1 — Copy & Rename Source Files

> 🤖 Agent · Sequential (run in order within phase)

### T1-A — Copy repo structure from orangewhip.surf
> ⚡

Copy these directories/files from `../orangewhip.surf` into this repo, preserving relative paths:

```
.cursor/
.cursorrules
.github/workflows/dev.yml
.github/workflows/main.yml
infra/cloudfront.tf
infra/layer_requirements.txt
infra/main.tf
infra/outputs.tf
infra/variables.tf
infra/versions.tf
scripts/backfill-webp-thumbs.sh
scripts/verify-media-item.sh
src/lambda/api/__init__.py
src/lambda/api/handler.py
src/lambda/thumb/__init__.py
src/lambda/thumb/handler.py
src/lambda/common/__init__.py
src/lambda/common/response.py
src/lambda/tests/__init__.py
src/lambda/tests/test_github_vars.py
src/lambda/tests/test_handler.py
src/lambda/requirements.txt
src/lambda/requirements-test.txt
src/web/auth.js
src/web/spa/index.html
src/web/spa/package.json
src/web/spa/vite.config.ts
src/web/spa/tailwind.config.js
src/web/spa/tsconfig.json
src/web/spa/public/auth.js
src/web/spa/public/config.js
src/web/spa/public/favicon.png
src/web/spa/public/logo.png
src/web/spa/src/
```

Do **not** copy: `infra/.terraform.lock.hcl`, `infra/build/`, `src/web/spa/dist/`, `src/web/spa/node_modules/`.

Also copy the `.gitignore` from orangewhip.surf, then append morida-specific entries if needed.

---

### T1-B — Global find-and-replace: resource prefix `ows` → `mo`
> ⚡ after T1-A

Run across all copied text files. This covers Terraform resource names, S3 bucket names, DynamoDB table names, Lambda function names, IAM role/policy names, Cognito domain prefix, and script defaults.

Replacements (case-sensitive, exact match):

| Find | Replace |
|------|---------|
| `ows-` | `mo-` |
| `ows_` | `mo_` |
| `OWS` | `MO` |

---

### T1-C — Global find-and-replace: domain and project names
> ⚡ after T1-A

| Find | Replace |
|------|---------|
| `orangewhip.surf` | `morida.me` |
| `orangewhip.info` | *(remove — no redirect domain for morida.me)* |
| `orangewhip` | `morida` |
| `orangewhip-spa` | `morida-spa` |
| `EchoNin9/orangewhip.surf` | `EchoNin9/morida.me` |
| `stage.orangewhip` | `stage.morida` |
| `www.orangewhip` | `www.morida` |

---

### T1-D — Update Terraform backend config (`infra/versions.tf`)
> After T1-B, T1-C

Verify (and correct if needed) the backend block:

```hcl
backend "s3" {
  bucket         = "mo-aws-s3-terraform-state"
  key            = "morida/terraform.tfstate"
  region         = "us-east-1"
  dynamodb_table = "mo-terraform-state-lock"
  encrypt        = true
}
```

---

### T1-E — Update `infra/variables.tf` defaults
> After T1-B, T1-C

Key variables to audit and set correct defaults:

| Variable | New default |
|----------|------------|
| `project` | `morida` |
| `domain` | `morida.me` |
| `stagingDomain` | `stage.morida.me` |
| `mediaBucketName` | `mo-media-{accountId}` — leave as variable, no hardcoded account ID |
| `websiteStagingBucket` | `mo-website-staging` |
| `websiteProductionBucket` | `mo-website-production` |
| `terraformStateBucket` | `mo-aws-s3-terraform-state` |

---

### T1-F — Remove Route 53 resources from `infra/cloudfront.tf`
> After T1-C · Critical — DNS is ClouDNS, not Route 53

The orangewhip source repo manages DNS via Route 53. **morida.me DNS lives in ClouDNS** and is managed manually. Remove (or comment out) all Route 53 Terraform resources:

- `aws_route53_zone.*`
- `aws_route53_record.*`
- Any `depends_on` references to those resources

Also remove the `orangewhip.info` redirect distribution and its associated resources (no redirect domain for morida.me) — unless a `www` → apex redirect or apex → `www` redirect is desired (ask user if needed).

Keep: ACM certificate (`aws_acm_certificate`), CloudFront distributions, S3 OAC/OAI, S3 bucket policies.

**Important:** ACM certificate DNS validation records (`aws_acm_certificate_validation`) cannot be automated via Terraform without Route 53. Remove the `aws_acm_certificate_validation` resource and its `depends_on`. Certificate validation becomes a manual step (Phase 3).

Add output values for the ACM certificate validation CNAME records so a human can easily copy them into ClouDNS:

```hcl
output "acmValidationCnameNames" {
  value = [for dvo in aws_acm_certificate.main.domain_validation_options : dvo.resource_record_name]
}
output "acmValidationCnameValues" {
  value = [for dvo in aws_acm_certificate.main.domain_validation_options : dvo.resource_record_value]
}
```

---

### T1-G — Update `infra/outputs.tf` for removed resources
> After T1-F

Remove any outputs that reference deleted Route 53 or redirect resources. Add the ACM validation outputs from T1-F if not already present.

---

### T1-H — Update script defaults
> After T1-B · ⚡

In `scripts/backfill-webp-thumbs.sh` and `scripts/verify-media-item.sh`, update hardcoded defaults:

| Old | New |
|-----|-----|
| `TABLE_NAME=ows-main` | `TABLE_NAME=mo-main` |
| `BUCKET_NAME=ows-media-452644920012` | `BUCKET_NAME=mo-media-${AWS_ACCOUNT_ID}` (or prompt user) |
| `THUMB_FUNCTION=ows-thumb` | `THUMB_FUNCTION=mo-thumb` |
| `AWS_PROFILE=echo9` | keep as-is (still valid) |

---

### T1-I — Update SPA cache key and package name
> After T1-B, T1-C · ⚡

In `src/web/spa/src/` (any file referencing `ows_categories`):

| Old | New |
|-----|-----|
| `ows_categories` | `mo_categories` |

Verify `src/web/spa/package.json`:
```json
{ "name": "morida-spa" }
```

---

### T1-J — Update `.github/workflows/` environment references
> After T1-B, T1-C · ⚡

Audit both workflow files:
- Confirm `AWS_ROLE_ARN_STAGING` / `AWS_ROLE_ARN_PRODUCTION` variable names match what was set in P0-D
- Confirm repo reference is `EchoNin9/morida.me`
- Remove any orangewhip-specific CloudFront distribution ID hardcodes (should be sourced from Terraform outputs)

---

### T1-K — Update `.cursor/` rules and `.cursorrules`
> After T1-C · ⚡

Replace `orangewhip` / `ows` references in cursor rule files with `morida` / `mo`.

---

## Phase 2 — Initial Terraform Apply (First Bootstrap)

> 👤 Human + 🤖 Agent

### T2-A — `terraform init`
> 🤖 after all Phase 1 tasks complete, and P0-A is done

```bash
cd infra
terraform init
```

Requires: P0-A (state bucket + lock table exist), local AWS credentials with sufficient permissions.

---

### T2-B — `terraform plan` — review before apply
> 👤 Human review after T2-A

```bash
terraform plan -out=tfplan
```

Review the plan. Expected resources to create: ~40-60 (Lambda functions, S3 buckets, Cognito pool, API Gateway, CloudFront distributions, IAM roles, DynamoDB table, ACM certificate).

**ACM certificate will be created in PENDING_VALIDATION state** — that is expected. Do not apply `aws_acm_certificate_validation` yet.

---

### T2-C — `terraform apply`
> 👤 Human after T2-B review

```bash
terraform apply tfplan
```

After apply, capture the outputs — specifically:
- `acmValidationCnameNames`
- `acmValidationCnameValues`
- `cloudfrontStagingDomain` (or equivalent output)
- `cloudfrontProductionDomain` (or equivalent output)

---

## Phase 3 — DNS Setup in ClouDNS

> 👤 Human — All manual, in ClouDNS control panel

### T3-A — Add ACM certificate validation CNAME records
> 👤 after T2-C

Add the CNAME records output from `acmValidationCnameNames` / `acmValidationCnameValues` to the `morida.me` zone in ClouDNS.

There will be 1-2 records (one per domain on the cert: `morida.me` and `*.morida.me`).

Wait for certificate to reach `ISSUED` status before proceeding:
```bash
aws acm describe-certificate --certificate-arn <arn> --region us-east-1 \
  --query 'Certificate.Status'
```

---

### T3-B — Add CloudFront CNAME records
> 👤 after T3-A (cert must be ISSUED before CloudFront can use it)

Add to `morida.me` zone in ClouDNS:

| Host | Type | Value |
|------|------|-------|
| `stage` | CNAME | `<cloudfrontStagingDomain>` (e.g. `xxxx.cloudfront.net`) |
| `www` | CNAME | `<cloudfrontProductionDomain>` |
| `@` (apex) | CNAME or ALIAS | `<cloudfrontProductionDomain>` |

**Note:** ClouDNS supports ALIAS records for apex domains — use ALIAS instead of CNAME for `@` if available, as bare CNAME on apex is technically invalid per RFC.

---

### T3-C — Wait for DNS propagation
> 👤 after T3-B

```bash
dig stage.morida.me CNAME
dig www.morida.me CNAME
dig morida.me
```

Propagation typically takes 5-30 minutes on ClouDNS.

---

## Phase 4 — First Deployments via CI

> 🤖 Agent / CI automated — after Phase 3 complete

### T4-A — Push `develop` branch → triggers staging deploy
> 🤖 after Phase 3

```bash
git checkout -b develop
git push origin develop
```

GitHub Actions `dev.yml` will run:
1. Pytest
2. Build Lambda layers
3. `terraform apply` (updates any remaining pending state)
4. Build React SPA
5. Generate `config.js` from Terraform outputs
6. Sync to `mo-website-staging` S3 bucket
7. CloudFront invalidation

Verify at `https://stage.morida.me`.

---

### T4-B — Push `main` branch → triggers production deploy
> 🤖 after T4-A verified

```bash
git checkout main
git push origin main
```

Verify at `https://www.morida.me` and `https://morida.me`.

---

## Phase 5 — Post-Deploy Verification

> 🤖 after T4-A / T4-B

### T5-A — Smoke test staging
> ⚡

- [ ] `https://stage.morida.me` loads (200, correct HTML)
- [ ] Auth flow (Cognito sign-in) works
- [ ] API returns 200 at `/health` or equivalent
- [ ] No console errors in browser

### T5-B — Smoke test production
> ⚡

- [ ] `https://www.morida.me` loads
- [ ] `https://morida.me` redirects correctly (www or apex, whichever is canonical)
- [ ] HTTPS cert is valid
- [ ] API returns 200

### T5-C — Verify S3 + Lambda
> ⚡

```bash
# DynamoDB table exists
aws dynamodb describe-table --table-name mo-main --region us-east-1

# Lambda functions exist
aws lambda get-function --function-name mo-api --region us-east-1
aws lambda get-function --function-name mo-thumb --region us-east-1

# Media bucket exists
aws s3 ls s3://mo-media-<accountId>/
```

---

## Resource Naming Reference

Full mapping from orangewhip → morida:

| Resource | orangewhip.surf | morida.me |
|----------|----------------|-----------|
| Terraform state bucket | `ows-aws-s3-terraform-state` | `mo-aws-s3-terraform-state` |
| Terraform state key | `orangewhip/terraform.tfstate` | `morida/terraform.tfstate` |
| Terraform lock table | `ows-terraform-state-lock` | `mo-terraform-state-lock` |
| Main DynamoDB table | `ows-main` | `mo-main` |
| Media S3 bucket | `ows-media-{accountId}` | `mo-media-{accountId}` |
| Website staging bucket | `ows-website-staging` | `mo-website-staging` |
| Website production bucket | `ows-website-production` | `mo-website-production` |
| Redirect bucket | `ows-redirect-info` | *(not applicable)* |
| API Lambda | `ows-api` | `mo-api` |
| Thumb Lambda | `ows-thumb` | `mo-thumb` |
| API Lambda role | `ows-api-lambda-role` | `mo-api-lambda-role` |
| Thumb Lambda role | `ows-thumb-lambda-role` | `mo-thumb-lambda-role` |
| MediaConvert role | `ows-mediaconvert-role` | `mo-mediaconvert-role` |
| Cognito user pool | `ows-user-pool` | `mo-user-pool` |
| Cognito domain | `ows-auth` | `mo-auth` |
| GitHub Actions role (staging) | `github-actions-orangewhip-staging` | `github-actions-morida-staging` |
| GitHub Actions role (production) | `github-actions-orangewhip-production` | `github-actions-morida-production` |
| Deploy IAM policy | `ows-deploy` | `mo-deploy` |
| SPA package name | `orangewhip-spa` | `morida-spa` |
| localStorage key | `ows_categories` | `mo_categories` |

---

## Dependency Graph (summary)

```
P0-A (state bucket) ─┐
P0-B (OIDC)         ─┤─► T2-A (tf init) ─► T2-B (plan) ─► T2-C (apply)
P0-C (IAM roles)    ─┘                                         │
P0-D (GH vars)                                                  │
P0-E (ClouDNS zone)                                             │
Phase 1 (copy+rename) ──────────────────────────────────────────┘
                                                                 │
                                         T3-A (ACM DNS) ◄───────┘
                                                  │
                                         T3-B (CF DNS)
                                                  │
                                         T3-C (propagation)
                                                  │
                                    T4-A (push develop) ─► T4-B (push main)
                                                  │
                                    T5-A/B/C (smoke tests)
```

---

## Notes for Agents

- **All Phase 1 tasks (T1-A through T1-K) can be executed autonomously** given repo access.
- **Phase 2 requires human review** at the plan step (T2-B) before applying.
- **Phase 3 is entirely manual** — no AWS or GitHub automation can add ClouDNS records.
- The redirect domain (`orangewhip.info`) has no equivalent for morida.me. If a redirect from a secondary domain is needed, add a new phase.
- The `infra/build/` directory (Lambda zips) is excluded — CI rebuilds these fresh each run.
- ClouDNS does not support Route 53-style dynamic DNS validation. ACM cert validation CNAME records must be added manually in ClouDNS before the cert will issue.
- The Pillow Lambda layer is built in CI from Linux wheels — do not build locally on macOS.
- FFmpeg layer is downloaded from `johnvansickle.com` static builds in CI — verify URL is still valid at time of first deploy.
