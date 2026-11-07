# Trusted notification dispatcher

Local implementation; not deployed. Migration `20261027110000_trusted_notifications.sql` requires
the accepted 0900 messages and 1000 wellbeing schema. It creates no cron job and
leaves `notification_configuration.delivery_enabled=false`. No existing account
gate is changed. Existing subscriptions remain preserved but unverified/disabled;
each browser must register explicitly against the configured public key.
Each actual registration or renewed opt-in records its verification time. Event
jobs only expand to bindings verified before that event; retrying the exact same
active registration preserves its time. Reusing an old database row cannot
deliver a backlog from before re-enabling notifications on that device.

The worker accepts only an authenticated `POST` with an empty body or `{}`. It
does not accept recipient, sender, text, or URL parameters. Use the separate
`NOTIFICATION_WORKER_SECRET` (at least 32 characters) in the Bearer header. This
route needs `verify_jwt=false` plus its own secret validation; the public anon key
and ordinary user JWTs are insufficient. Deployment configuration is a separate
reviewed change. Never put this secret in a browser or a committed cron command.

Server environment: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`,
`NOTIFICATION_WORKER_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`VAPID_SUBJECT`. The pinned `npm:web-push@3.6.7` library generates encrypted
`aes128gcm` requests; bounded redirect-disabled Fetch performs transport. Supabase
supports npm dependencies and Node APIs. The pinned encryption library has also
been exercised under Deno with ephemeral keys and network access denied. The
deployed worker, scheduler and real device display still require verification.

Public VAPID keys are 87-character raw base64url; private keys are 43-character raw
base64url. Unknown legacy PKCS8 keys fail closed. No code generates, converts,
rotates, prints, or returns a private key. `get-vapid-public-key` returns
`{publicKey,keyId}`; `keyId` is SHA-256 hex of the UTF-8 public-key string. Set that
public fingerprint in the service-owned configuration row before registration.
Do not enable delivery until the replacement endpoints, client integration,
scheduler authentication, preferences, and test devices are verified together.
The old sender/reminder/key-generator endpoints now return 410; their former
diagnostic UI cannot report a test push as successful.

Authenticated RPCs (owner always comes from `auth.uid()`):

- `get_my_push_device(p_device_id uuid)` returns deviceId, subscriptionId|null,
  enabled, vapidKeyId|null; never an endpoint or key.
- `register_my_push_device(p_device_id,p_endpoint,p_p256dh,p_auth,p_vapid_key_id)`
  returns that status. It cannot steal an endpoint owned by another account.
- `revoke_my_push_device(p_device_id)` revokes only that account/device.
- `request_my_push_test(p_device_id,p_command_id)` explicitly queues a fixed,
  private test to that owned device's exact current registration. Delivery and
  master preferences must be enabled; at most one new test per account/minute.
  It returns a stable `{commandId,deviceId,jobId}` receipt; retries reuse the same
  ID/device even if the response was lost. Changed payloads reject.
- `get_my_push_test(p_command_id)` returns that own receipt plus `status`:
  `queued`, `skipped`, `acceptedByPushService`, or `failed`; unknown IDs return
  null. It never returns endpoints or proves display. Test jobs expire after five
  minutes and then report skipped even while the worker is stopped; an earlier
  recorded push-service acceptance remains accepted. Re-registering the device
  invalidates its earlier pending test.
- `get_my_wellness_reminder()` returns the existing row plus next_due_at, or null.
- `save_my_wellness_reminder(p_enabled boolean,p_reminder_time time)` saves both
  enable and disable, derives timezone from the owner's profile, and returns it.

The source API adapter is `src/data/notifications/api.ts`. It pins the checked
account token and rejects late account-switch responses. One 10-second deadline
covers session/RPC/final account verification and respects caller abort. A timeout
leaves a mutation unconfirmed: reload or reconcile the same diagnostic ID rather
than silently creating a replacement. Logout must revoke the
device before discarding its authenticated token; it does not silently unsubscribe
the browser. AuthContext attempts this with a bounded wait, preserves sign-out
when revocation is unconfirmed, and warns about that uncertainty. Generic previews are
used even if remote revocation fails. Existing confirmed action feedback remains
independent of external push delivery and is not replaced by this worker.

Service-only SQL operations enqueue due reminders, claim a maximum batch, prepare
each leased attempt with a fresh preference/connection/device check, and finish
that exact lease. Event producers run in the committed action/message/check-in
transaction. There is no historical backfill. Retries use the same delivery ID;
expired leases get a new token. A lost provider response can result in another
push attempt; stable service-worker tags reduce duplicate display but do not
provide exactly-once delivery. `accepted` means push-service acceptance only.
An in-flight accepted push cannot be recalled after a preference/connection change.

Daily reminders retain the selected minute and use the recipient's saved IANA
timezone. DST gaps choose the first valid minute after the gap; folds choose the
first occurrence only. Restarts catch up within today's local date, not prior
days. Explicit timezone or schedule changes cancel queued stale occurrences and
recompute the next future due time. `last_sent` advances only on push acceptance.

Endpoints currently cover FCM, Mozilla and Apple's Web Push domains. Unsupported
providers fail explicitly and need a reviewed allowlist extension, never arbitrary
HTTPS forwarding. Full names, message content, rewards and points stay inside the
authenticated app. Service workers navigate only approved same-origin routes.

Checks: `npm run test:ui -- tests/notification-dispatcher.test.ts
tests/notification-device-api.test.ts tests/notification-worker-sw.test.ts`.
`tests/backend/notifications.sql` passed against the isolated local database and
rolled back all synthetic writes. It requires the pinned wrapper's local target
marker, disabled cron, no active fixture and no pending deliveries. The native
proxy uses external loopback port 20324 but can report server port 5432 with a
Unix-socket address. Original reminders are locked, snapshotted and temporarily
disabled inside the transaction; their exact restoration is checked after rollback.
Parent review, applied schema and an exclusive fixture lease remain prerequisites.
`encryption.test.ts` tests actual pinned Web Push encryption without sending:
`ECE_KEYLOG=0 deno test --cached-only --frozen --deny-net --allow-env=ECE_KEYLOG
--config supabase/functions/dispatch-notifications/deno.json
supabase/functions/dispatch-notifications/encryption.test.ts` (from the app root).

Deployed source is not recovered (the six captured archives were empty). Live
VAPID validity, authenticated scheduler operation, and supported device display
remain external verification requirements. No live credentials were used here.
