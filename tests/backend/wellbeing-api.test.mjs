/** Prepared LOCAL migration 1000 only; parent review/apply required. This harness never applies SQL and never
 * enables an existing account. Requires an explicit pinned runtime status path.
 * All identities are synthetic; credentials and record contents are not logged.
 * Run only after parent review/apply and exclusive release of the fixture runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('append-only wellbeing check-ins and scoped self-report history', {
  skip: statusFile ? false : 'Requires explicit reviewed local runtime; no API requests made.',
  timeout: 180_000,
}, async (t) => {
  assert.ok(statusFile.startsWith('/'));
  const status = JSON.parse(await readFile(statusFile, 'utf8'));
  assert.equal(status.runtime, 'native');
  assert.equal(status.env.API_URL, 'http://127.0.0.1:28622');
  assert.equal(new URL(status.env.DB_URL).hostname, '127.0.0.1');
  assert.equal(new URL(status.env.DB_URL).port, '20324');
  const api=status.env.API_URL, anon=status.env.ANON_KEY, service=status.env.SERVICE_ROLE_KEY;
  assert.ok(anon && service);
  const accounts=[], periods=new Set(), originals=new Map();
  const originalPeriodIds=new Set(), originalAccountIds=new Set();
  const trackPeriod=id=>{assert.match(id,/^[0-9a-f-]{36}$/i);assert.ok(!originalPeriodIds.has(id),'Refusing original period');periods.add(id);};
  const assertOwnedAccount=id=>{assert.ok(!originalAccountIds.has(id),'Refusing original account');assert.ok(accounts.some(a=>a.id===id),'Account is not owned by this fixture');};
  const tables=['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages',
    'profiles','punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations',
    'action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots',
    'action_inventory_movements','action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings','action_recording_openings'];
  const canon=x=>Array.isArray(x)?x.map(canon):x&&typeof x==='object'
    ?Object.fromEntries(Object.keys(x).sort().map(k=>[k,canon(x[k])])):x;
  const hash=rows=>createHash('sha256').update(JSON.stringify(rows.map(canon).map(JSON.stringify).sort())).digest('hex');
  const diagnostics=process.env.OBEDIENCE_API_DIAGNOSTICS==='1';
  const trace=(phase,detail={})=>{if(diagnostics)console.error(JSON.stringify({phase,at:new Date().toISOString(),...detail}));};
  let requestSequence=0;
  async function req(method,path,token=service,body,sessionId) {
    assert.match(path,/^\/(auth|rest)\/v1\//);
    const url=new URL(path,api); assert.equal(url.origin,api);
    // Endpoint names only: omit query strings, UUIDs, tokens and all payload values.
    const detail={request:++requestSequence,method,endpoint:url.pathname.replace(/[0-9a-f]{8}-[0-9a-f-]{27}/gi,'[fixture-id]')};
    const started=performance.now(),controller=new AbortController();let timer;
    trace('request-start',detail);
    const deadline=new Promise((_,reject)=>{timer=setTimeout(()=>{
      const error=new Error(`Request deadline 12000ms: ${method} ${detail.endpoint}`);
      controller.abort(error);reject(error);
    },12_000);});
    try {
      const result=await Promise.race([deadline,(async()=>{
        const response=await fetch(url,{method,headers:{apikey:token===service?service:anon,Authorization:`Bearer ${token}`,
          'Content-Type':'application/json',Prefer:'return=representation',...(sessionId?{'x-relationship-session-id':sessionId}:{})},
          body:body===undefined?undefined:JSON.stringify(body),signal:controller.signal,redirect:'error'});
        const text=await response.text();let data;try{data=text?JSON.parse(text):null;}catch{data=null;}
        return {status:response.status,data};
      })()]);
      trace('request-end',{...detail,status:result.status,elapsedMs:Math.round(performance.now()-started)});
      return result;
    } catch(error) {
      trace('request-error',{...detail,errorName:error.name,elapsedMs:Math.round(performance.now()-started)});
      throw error;
    } finally {clearTimeout(timer);}
  }
  const ok=r=>{assert.ok(r.status>=200&&r.status<300,`API status ${r.status}; code ${r.data?.code??'none'}; message ${r.data?.message??'none'}`);return r.data;};
  const denied=(r,message)=>{assert.ok(r.status>=400,`Expected rejection, got ${r.status}`);if(message)assert.equal(r.data?.message,message);};
  const rows=async(table,query='select=*',token=service)=>ok(await req('GET',`/rest/v1/${table}?${query}`,token));
  async function allRows(table) {
    const result=[]; for(let offset=0;;offset+=500){const page=await rows(table,`select=*&limit=500&offset=${offset}`);result.push(...page);if(page.length<500)return result;}
  }
  async function authIds(){const result=[];for(let page=1;;page++){const data=ok(await req('GET',`/auth/v1/admin/users?page=${page}&per_page=100`));result.push(...data.users.map(u=>u.id));if(data.users.length<100)return result.sort();}}
  const rpc=(a,name,body={})=>req('POST',`/rest/v1/rpc/${name}`,a?.token??anon,body);
  async function identity(a){const result=ok(await rpc(a,'get_my_identity'));if(result.relationship_id)trackPeriod(result.relationship_id);return result;}
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  async function createAccount(role,balance=0){
    const email=`wellbeing-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:role?{role}:{}}));
    assert.ok(!originalAccountIds.has(user.id),'Create returned an original account');
    const a={id:user.id,token:null};accounts.push(a);assertOwnedAccount(a.id);
    a.token=ok(await req('POST','/auth/v1/token?grant_type=password',anon,{email,password})).access_token;
    let i=await identity(a);
    if(i.role){
      ok(await rpc(a,'set_my_timezone',{p_timezone:i.role==='dom'?'Pacific/Kiritimati':'America/Boise'}));
      ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,i.role==='dom'?{dom_points:balance}:{points:balance}));
    }
    return a;
  }
  const ready=async a=>ok(await req('PATCH',`/rest/v1/identity_contexts?user_id=eq.${a.id}`,service,{lifecycle_ready:true}));
  const activate=async a=>ok(await req('POST','/rest/v1/rpc/activate_action_accounting',service,{p_relationship_id:(await identity(a)).relationship_id}));
  const generate=async(a,mode='fresh',previous=null)=>ok(await rpc(a,'generate_partner_link_code',{...scope(await identity(a)),p_mode:mode,p_previous_relationship_id:previous}));
  const accept=async(a,invite)=>ok(await rpc(a,'accept_partner_link_code',{...scope(await identity(a)),p_code:invite.code,p_mode:invite.mode,p_previous_relationship_id:invite.previous_relationship_id}));
  async function link(a,b,mode='fresh',previous=null){const result=await accept(b,await generate(a,mode,previous));trackPeriod(result.relationship_id);return result;}
  async function unlink(a){const result=ok(await rpc(a,'unlink_my_partner',scope(await identity(a))));await Promise.all(accounts.filter(a=>!a.deleted).map(identity));return result;}
  const wallets=async p=>await rows('action_wallets',`relationship_id=eq.${p}&select=*`);
  const balance=async(p,role)=>(await wallets(p)).find(w=>w.currency===role)?.balance;


  const recordingOpeningProbe=await req('GET','/rest/v1/action_recording_openings?select=*&limit=1');
  if(recordingOpeningProbe.status===404 && recordingOpeningProbe.data?.code==='PGRST205') tables.splice(tables.indexOf('action_recording_openings'),1);
  else ok(recordingOpeningProbe);
  for(const table of tables)originals.set(table,hash(await allRows(table)));
  const originalAuth=await authIds();originalAuth.forEach(id=>originalAccountIds.add(id));
  (await rows('relationship_periods','select=id')).forEach(row=>originalPeriodIds.add(row.id));
  assert.equal((await rows('identity_contexts','select=lifecycle_ready')).some(x=>x.lifecycle_ready),false,'Another lifecycle fixture is active');
  assert.equal((await rows('action_accounting_periods','select=accounting_enabled')).some(x=>x.accounting_enabled),false,'Another accounting fixture is active');
  const metrics={anxiety:100,stress:100,irritability:100,overwhelm:100,energy:0,intimacy:100,physical_touch:100,emotional_support:100};
  const save=(a,i,values=metrics,extra={})=>rpc(a,'save_wellbeing_checkin',{...scope(i),p_command_id:randomUUID(),p_expected_timezone:i.timezone,p_metrics:values,p_client_reported_at:'2025-02-03T18:00:00Z',...extra});
  const listing=(a,i,subject,extra={})=>rpc(a,'list_wellbeing_checkins',{...scope(i),p_subject_user_id:subject,p_mode:'legacy',p_limit:100,...extra});
  let dom,sub,stranger,pair,subIdentity,first,firstArgs,legacy;
  try {
    await t.test('anonymous callers cannot use the boundary; synthetic pair alone is prepared',async()=>{
      denied(await rpc(null,'get_wellbeing_status',{p_expected_relationship_id:randomUUID(),p_expected_relationship_session_id:randomUUID()}));
      dom=await createAccount('dom');sub=await createAccount('sub');stranger=await createAccount('sub');
      for(const a of [dom,sub]){await activate(a);await ready(a);}
      await link(dom,sub);subIdentity=await identity(sub);pair=subIdentity.relationship_id;
    });
    await t.test('own report is server-scored, timestamped and exactly once, including concurrent retries',async()=>{
      firstArgs={...scope(subIdentity),p_command_id:randomUUID(),p_expected_timezone:subIdentity.timezone,p_metrics:metrics,p_client_reported_at:'2025-02-03T18:00:00Z'};
      const result=await Promise.all([rpc(sub,'save_wellbeing_checkin',firstArgs),rpc(sub,'save_wellbeing_checkin',firstArgs)]);
      first=ok(result[0]);assert.deepEqual(ok(result[1]),first);assert.equal(first.overallScore,0);assert.equal(first.userId,sub.id);
      assert.equal(first.relationshipSessionId,subIdentity.relationship_session_id);assert.equal(first.timezone,'America/Boise');
      assert.equal(first.localDate,new Intl.DateTimeFormat('en-CA',{timeZone:first.timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(first.recordedAt)));
      assert.notEqual(first.localDate,'2025-02-03');assert.equal(Date.parse(first.clientReportedAt),Date.parse(firstArgs.p_client_reported_at));
      assert.equal((await rows('wellbeing_snapshots',`user_id=eq.${sub.id}&submission_id=eq.${firstArgs.p_command_id}`)).length,1);
      denied(await rpc(sub,'save_wellbeing_checkin',{...firstArgs,p_metrics:{...metrics,energy:100}}),'COMMAND_ID_REUSED');
      assert.deepEqual(ok(await rpc(sub,'get_my_wellbeing_receipt',{p_command_id:first.commandId,p_relationship_id:pair})),first);
      assert.equal(ok(await rpc(dom,'get_my_wellbeing_receipt',{p_command_id:first.commandId,p_relationship_id:pair})),null);
    });
    await t.test('current partner reads are allowed; unrelated reads and direct writes are denied',async()=>{
      const di=await identity(dom),si=await identity(stranger);
      const status=ok(await rpc(dom,'get_wellbeing_status',scope(di)));assert.equal(status.find(x=>x.userId===sub.id).latest.id,first.id);
      denied(await rpc(stranger,'get_wellbeing_status',scope(di)),'STALE_RELATIONSHIP');
      denied(await listing(stranger,si,sub.id),'WELLBEING_READ_NOT_ALLOWED');
      denied(await req('PATCH',`/rest/v1/wellbeing_snapshots?id=eq.${first.id}`,dom.token,{overall_score:99},di.relationship_session_id));
      denied(await req('POST','/rest/v1/wellbeing_snapshots',sub.token,{user_id:sub.id,relationship_id:pair,metrics,overall_score:0},subIdentity.relationship_session_id));
      denied(await req('DELETE',`/rest/v1/wellbeing_snapshots?id=eq.${first.id}`,sub.token,undefined,subIdentity.relationship_session_id));
      denied(await req('GET','/rest/v1/wellbeing_snapshots?select=*',dom.token));
    });
    await t.test('eight finite ranges and explicit bounded list modes are enforced',async()=>{
      for(const values of [{...metrics,energy:101},{...metrics,energy:-1},{...metrics,energy:'50'},{...metrics,extra:1},{energy:50}]) denied(await save(sub,subIdentity,values),'INVALID_WELLBEING_METRICS');
      denied(await save(sub,subIdentity,metrics,{p_client_reported_at:null}),'INVALID_WELLBEING_REQUEST');
      denied(await listing(sub,subIdentity,sub.id,{p_mode:'dated'}),'INVALID_WELLBEING_RANGE');
      denied(await listing(sub,subIdentity,sub.id,{p_limit:101}),'INVALID_WELLBEING_RANGE');
      denied(await listing(sub,subIdentity,sub.id,{p_mode:'legacy',p_start_date:'2025-01-01',p_end_date:'2025-02-01'}),'INVALID_WELLBEING_RANGE');
    });
    await t.test('multiple same-day check-ins remain, zero survives, and keyset pages do not repeat',async()=>{
      const next=ok(await save(sub,subIdentity,{...metrics,energy:100}));assert.notEqual(next.id,first.id);assert.equal(next.overallScore,13);
      const end=new Date(`${first.localDate}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+1);
      const args={p_mode:'dated',p_start_date:first.localDate,p_end_date:end.toISOString().slice(0,10),p_limit:1};
      const page=ok(await listing(sub,subIdentity,sub.id,args));assert.equal(page.length,1);assert.equal(page[0].id,next.id);
      const second=ok(await listing(sub,subIdentity,sub.id,{...args,p_before_recorded_at:page[0].recordedAt,p_before_id:page[0].id}));assert.equal(second[0].id,first.id);
      assert.equal(ok(await rpc(sub,'get_wellbeing_status',scope(subIdentity))).find(x=>x.userId===sub.id).latest.id,next.id);
    });
    await t.test('legacy values and both original timestamps remain, without invented calendar or score',async()=>{
      legacy=ok(await req('POST','/rest/v1/wellbeing_snapshots',service,{user_id:sub.id,relationship_id:pair,
        created_at:'2024-01-01T00:00:00Z',updated_at:'2025-02-03T18:00:00Z',metrics:{energy:0},overall_score:7}))[0];
      const retained=ok(await listing(sub,subIdentity,sub.id));assert.equal(retained.length,1);const row=retained[0];
      assert.equal(row.id,legacy.id);assert.equal(row.provenance,'legacy_snapshot');assert.equal(row.localDate,null);assert.equal(row.timezone,null);assert.equal(row.scoreVersion,null);
      assert.deepEqual(row.metrics,{energy:0});assert.equal(row.overallScore,7);
      assert.equal(Date.parse(row.legacyCreatedAt),Date.parse(legacy.created_at));assert.equal(Date.parse(row.legacyUpdatedAt),Date.parse(legacy.updated_at));
      assert.deepEqual(ok(await listing(sub,subIdentity,sub.id,{p_mode:'dated',p_start_date:'2025-02-03',p_end_date:'2025-02-04'})),[]);
    });
    await t.test('timezone changes require fresh review, while original receipts retain their dates',async()=>{
      ok(await rpc(sub,'set_my_timezone',{p_timezone:'Europe/London'}));
      denied(await save(sub,subIdentity),'WELLBEING_TIMEZONE_CHANGED');
      assert.deepEqual(ok(await rpc(sub,'save_wellbeing_checkin',firstArgs)),first);
      const fresh=await identity(sub),row=ok(await save(sub,fresh));assert.equal(row.timezone,'Europe/London');
      const unchanged=(await rows('wellbeing_snapshots',`id=eq.${first.id}`))[0];assert.equal(unchanged.recorded_timezone,first.timezone);assert.equal(unchanged.local_date,first.localDate);
    });
    await t.test('old session cannot create new reports; own old receipt recovery never rebinds it',async()=>{
      await unlink(sub);
      denied(await save(sub,subIdentity),'STALE_RELATIONSHIP');
      assert.deepEqual(ok(await rpc(sub,'get_my_wellbeing_receipt',{p_command_id:first.commandId,p_relationship_id:pair})),first);
      assert.deepEqual(ok(await rpc(sub,'save_wellbeing_checkin',firstArgs)),first);
      const now=await identity(sub);assert.notEqual(now.relationship_id,pair);
      assert.equal(ok(await rpc(sub,'get_wellbeing_status',scope(now))).find(x=>x.userId===sub.id).latest,null);
    });
  } finally {
    const ids=accounts.map(a=>a.id);ids.forEach(assertOwnedAccount);
    if(ids.length)for(const m of await rows('relationship_period_members',`user_id=in.(${ids.join(',')})&select=relationship_id`))trackPeriod(m.relationship_id);
    for(const p of periods)assert.ok(!originalPeriodIds.has(p),'Refusing cleanup of original period');
    for(const p of periods)for(const table of ['wellbeing_snapshots','action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
      'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements','action_point_entries',
      'reward_inventory_lots','action_events','action_task_openings','action_recording_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments'].filter(table=>tables.includes(table))) ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${p}`,service));
    for(const a of accounts)ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
    for(const a of accounts)ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
    for(const p of periods){ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${p}`,service));ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${p}`,service));}
    for(const table of tables)assert.equal(hash(await allRows(table)),originals.get(table),`Original ${table} changed`);
    assert.deepEqual(await authIds(),originalAuth,'Original Auth accounts changed');
  }
});
