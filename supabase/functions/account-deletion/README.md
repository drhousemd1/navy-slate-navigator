Account deletion backend
========================

Implemented and verified on the isolated local backend. Parent applied migrations
1400 and1500 and ran both actual API suites: six main-suite tests and four
extra-suite tests passed, including their parent cases. The author also ran25
mocked deletion handler tests and10 message-media handler tests. Original lifecycle
and accounting gates remain unchanged. Nothing was pushed or deployed; no scheduler
or real notification delivery is installed.

The actual built-app browser check verified saved deletion recovery after reload,
Continue through completion, completion after another reload, and the survivor's
retained100-point balance, shared photo and earlier reward history. Frontend
verification passed167 focused tests, application TypeScript and the local build.
Raw IndexedDB cleanup contents were not independently dumped; cleanup evidence is
the rendered result plus focused tests. This is local verification, not production
rollout or user acceptance.

Wire contract
-------------

The client saves a UUID commandId and32 cryptographically random bytes encoded as
43-character base64url recoveryToken **before** its first request. Job ID equals
commandId, so a lost initial response is recoverable. Never put capability in URL,
logs or error text. Public gateway apikey header is supported.

* POST `/functions/v1/account-deletion/start`, live user Bearer, exact JSON:
  `{commandId,expectedRelationshipId,expectedRelationshipSessionId,recoveryToken}`.
* POST `/status` or `/resume`, exact `{jobId,recoveryToken}`; capability survives
  Auth removal. A new/recreated account cannot adopt an existing job.
* POST `/continue`, exact `{jobId}`, service Bearer only, for a separately
  authorized future worker. No scheduler is activated.

Responses contain only `{jobId,state,phase,retryAfterMs,completedAt}`. States are
pending/retry_required/complete; phases storage/account/complete. Start202 proves a
prepared matching job; preparation409 does not. DELETION_UNCONFIRMED503 means the
outcome is unknown: query exact saved status. A missing job and wrong well-formed
capability both produce DELETION_UNAVAILABLE404. Invalid shape is400. Callers honor
retryAfterMs and retain recovery state through retries. Completion is200 only when
all prepared work finished, not just because Auth is missing.

The server hashes the capability and resolves actor, periods, participants,
Storage paths and deletions itself. Client-supplied targets are rejected.

Preparation and concurrency
---------------------------

Preparation verifies current identity/session and lifecycle/accounting gates,
archives the active relationship, moves a surviving partner into initialized solo
accounting with their own balance, masks detached identity, removes private account
rows and revokes application access. Shared financial facts and actual surviving
conversation membership remain. There are no automatic inventory transfers,
refunds or currency conversions. Wellbeing stays private and is removed.

Overlapping participant periods or claimed source objects are serialized.
Unrelated jobs can prepare/process independently. A same-pair concurrent start
returns DELETION_BUSY until the first job completes; the second account refreshes
its changed context before retrying. Jobs use90-second processing leases while
handlers have45-second operation deadlines and15-second request deadlines.
Expired workers cannot finalize using an old lease. Capability continuation can
finish after a lost Auth-delete response.

Media and upload races
---------------------

Owned survivor media is uploaded through Storage API to a random private,
service-owned path; downloaded bytes, MIME and SHA256 are compared, SQL verifies
owner/owner_id NULL, references switch atomically, and only then does Storage API
remove the source. Native owner-null shared photos stay in place. Actual message
readers continue through message-media. Archived card bytes have private durable
mappings; existing History does not render those card images. A live surviving
card/profile/global-content reference leaves the job pending for an appropriate
reader/remap rather than silently breaking its URL. Logos whose only consumers may
be browser-local also require review. Objects above64MiB are resumable review work.

`message_upload_claims` retains each native upload path independently of attachment
rows. Each upload attempt has an expiring token carried in Storage metadata.
The Storage metadata trigger shares the identity transaction lock, rejects stale
or replaced tokens, and permanently rejects prepared deletion paths even after
job completion. Preparation captures missing pending paths too; a bounded wait
allows old work to settle, but the permanent fence—not timeout—is why absence can
be trusted. A delayed upload cannot publish a readable object after deletion.
Ordinary same-upload-ID retries verify persisted bytes and never overwrite them.

Pinned local Storage v1.84.19-r0 source was inspected at its installed server.js
completeUpload implementation (byte offset10105387), metadata parser and batch
delete path. Final publication reauthorizes inside the database transaction;
rejected upload versions use Storage's normal ObjectAdminDelete handling. App
completion proves supported Storage removal and no later readable object, not
forensic erasure of provider internals, temporary rejected versions or backups.
No managed Storage metadata is directly deleted or reassigned by this code.

Rollout and verification
------------------------

Drain/stop old message-media workers before applying/enabling this coordinated
version. Restart with both Edge handlers and migrations1400/1500; root deployment config
must include `[functions.account-deletion] verify_jwt=false` (the adjacent config
is a merge fragment). Old workers have no upload-attempt claim. Keep original
accounts gated until the full actual-path verification is accepted.

The guarded `tests/backend/account-deletion-api.test.mjs` requires explicit
OBEDIENCE_ACCOUNT_DELETION_REVIEWED=1, OBEDIENCE_LOCAL_STATUS_FILE and
OBEDIENCE_LOCAL_NATIVE_STATE_FILE. It pins API28622/DB20324, requires a cleaned
exclusive browser fixture, verifies private file modes and native key identity,
and uses a short-lived signed **synthetic** owner token for real legacy Storage
ownership. OBEDIENCE_PSQL_BINARY may specify psql for SELECT-only ownership proof.
Credentials are not printed. Synthetic recovery material stays in private fixture
manifests; the native signing secret is not copied into the public repository.

The harness covers legacy/native survivor bytes, actual source/target owners,
self-only exclusion, all four legacy history families, preserved own balance,
expired upload-token rejection, begin/claim/deletion/late-upload ordering, exact
command retry, overlap rejection, real Auth removal, lost Auth response recovery,
last-survivor cleanup, old JWT/device/upload/write denials, masked reads and
48-table/full-original-Auth/bucket preservation. The separate guarded
`tests/backend/account-deletion-extra-api.test.mjs` covers independent concurrent
leases/progress, same-email recreated Auth identity denial, and new-partner denial
of prior conversation/photo/activity while the original survivor retains access.
It requires OBEDIENCE_ACCOUNT_DELETION_EXTRA_REVIEWED=1 and the pinned private
status file after the normal browser fixture is cleaned. Its own mode600 manifest
tracks four synthetic identities, every period/participant/job and recovery
capability, plus a48-table/full-original-Auth/bucket snapshot. Cleanup uses actual
delete endpoints first, then removes only exact synthetic completed receipts and
frozen claims; no managed Storage writes or browser-fixture helper changes. An
unresolved product cleanup failure leaves its private manifest for parent
recovery. Parent ran all three extra cases and verified cleanup. An initial run
timed out during image-reference classification; migration1500 removes avoidable
full-row serialization and large JSON-value materialization without changing
retention or access rules. A rollback-only comparison matched187 synthetic
reference cases, all45 existing definition projections and the original-payload
classification; one timing pair improved from721.881ms to218.479ms. Both actual API
suites then passed against1500. These are local measurements, not a general
performance guarantee. Deno fault injection covers external copy,
readback, reference switch, removal and Auth boundaries without claiming SQL or
Storage runtime proof.

The private browser fixture helper classifies completed actor-null jobs by exact
verified expected/affected periods, claims by own relationship/job, and copied
objects by their durable job linkage. It rechecks every retained target against
baseline and current unrelated consumers on each cleanup retry. Operator cleanup
removes only that synthetic graph before Auth, preserving the new Auth guard.
Operator cleanup is not evidence the product endpoint completed. The frozen
original preservation verifier still covers its original40-table set; the new
fixture verifier covers48 tables captured after1400 and includes the new private
bucket in that baseline. Neither is a claim of provider-internal disk inspection.
