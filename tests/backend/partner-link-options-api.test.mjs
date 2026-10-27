/** Prepared LOCAL migration 0700 only; parent review/apply required. This harness never applies SQL and never
 * enables an existing account. Requires an explicit pinned runtime status path.
 * All identities are synthetic; credentials and record contents are not logged.
 * Run only after parent review/apply and exclusive release of the fixture runtime.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';

const statusFile = process.env.OBEDIENCE_LOCAL_STATUS_FILE;
test('masked partner invitation options and explicit Fresh/Continue consent', {
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
  const tables=['admin_document_readers','app_guide_content','archived_messages','encyclopedia_entries','messages',
    'profiles','punishment_history','punishments','reward_usage','rewards','rule_violations','rules','task_completion_history','tasks',
    'user_color_schemes','user_notification_preferences','user_push_subscriptions','user_roles','wellbeing_snapshots','wellness_reminders',
    'identity_contexts','relationship_periods','relationship_period_members','partner_link_invitations',
    'action_accounting_periods','action_events','action_wallets','action_point_entries','reward_inventory_lots',
    'action_inventory_movements','action_command_receipts','action_feedback_outbox','action_feedback_acknowledgments','action_task_openings'];
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
  async function identity(a){const result=ok(await rpc(a,'get_my_identity'));if(result.relationship_id)periods.add(result.relationship_id);return result;}
  const scope=i=>({p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:i.relationship_session_id});
  async function createAccount(role,balance=0){
    const email=`link-options-${randomUUID()}@example.invalid`,password=randomBytes(24).toString('base64url');
    const user=ok(await req('POST','/auth/v1/admin/users',service,{email,password,email_confirm:true,user_metadata:role?{role}:{}}));
    const a={id:user.id,token:null};accounts.push(a);
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
  async function link(a,b,mode='fresh',previous=null){const result=await accept(b,await generate(a,mode,previous));periods.add(result.relationship_id);return result;}
  async function unlink(a){const result=ok(await rpc(a,'unlink_my_partner',scope(await identity(a))));await Promise.all(accounts.filter(a=>!a.deleted).map(identity));return result;}
  const wallets=async p=>await rows('action_wallets',`relationship_id=eq.${p}&select=*`);
  const balance=async(p,role)=>(await wallets(p)).find(w=>w.currency===role)?.balance;

  const options=async a=>ok(await rpc(a,'get_my_partner_link_options',scope(await identity(a))));
  const globalDigest=async()=>{const out={};for(const table of tables)out[table]=hash(await allRows(table));return out;};
  await rows('relationship_periods','select=relationship_session_id&limit=0');
  // Exercise the function before creating fixtures; an absent migration is a
  // different error from its expected unauthenticated denial.
  const anonymous=await rpc(null,'get_my_partner_link_options',{p_expected_relationship_id:randomUUID(),p_expected_relationship_session_id:randomUUID()});
  denied(anonymous);assert.equal(anonymous.data?.code,'42501');assert.match(anonymous.data?.message??'',/permission denied for function get_my_partner_link_options/i);
  const originalAuth=await authIds();
  for(const table of tables)originals.set(table,hash(await allRows(table)));
  assert.equal((await rows('identity_contexts','select=lifecycle_ready')).some(x=>x.lifecycle_ready),false,'Another lifecycle fixture is active');
  assert.equal((await rows('action_accounting_periods','select=accounting_enabled')).some(x=>x.accounting_enabled),false,'Another accounting fixture is active');
  let dom,sub,otherDom,stranger,deletedDom,survivor,pair,invite,reviewed;
  try {
    await t.test('options never activate staged accounts and reject missing or stale caller scope',async()=>{
      dom=await createAccount('dom',10);sub=await createAccount('sub',20);otherDom=await createAccount('dom');stranger=await createAccount('sub');
      const i=await identity(dom),before=await globalDigest(),first=await options(dom);
      assert.deepEqual(first,{relationship_id:i.relationship_id,relationship_session_id:i.relationship_session_id,
        can_generate_fresh:false,invitation:null,archived_relationships:[]});
      denied(await rpc(dom,'get_my_partner_link_options',{p_expected_relationship_id:i.relationship_id,p_expected_relationship_session_id:null}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(dom,'get_my_partner_link_options',{...scope(i),p_expected_relationship_session_id:randomUUID()}),'STALE_RELATIONSHIP_SESSION');
      denied(await rpc(sub,'get_my_partner_link_options',scope(i)),'STALE_RELATIONSHIP');
      assert.deepEqual(await globalDigest(),before);
      await ready(dom);assert.equal((await options(dom)).can_generate_fresh,false);
      for(const a of [dom,sub,otherDom,stranger]){await activate(a);await ready(a);}
      assert.equal((await options(dom)).can_generate_fresh,true);
    });
    await t.test('only owned archived pairs appear, with exact dates and no former identity fields',async()=>{
      const joined=await link(dom,sub);pair=joined.relationship_id;
      denied(await rpc(dom,'get_my_partner_link_options',scope(await identity(dom))),'UNLINK_BEFORE_LINKING');
      await unlink(sub);
      const result=await options(dom),period=(await rows('relationship_periods',`id=eq.${pair}&select=*`))[0];
      assert.equal(result.archived_relationships.length,1);
      assert.deepEqual(result.archived_relationships[0],{relationship_id:pair,started_at:period.started_at,ended_at:period.ended_at,
        former_partner_label:'Former partner',can_generate_continue:true});
      assert.deepEqual(Object.keys(result).sort(),['archived_relationships','can_generate_fresh','invitation','relationship_id','relationship_session_id']);
      for(const a of [dom,sub,otherDom,stranger])assert.equal(JSON.stringify(result).includes(a.id),false);
      assert.deepEqual((await options(stranger)).archived_relationships,[]);
      denied(await rpc(stranger,'generate_partner_link_code',{...scope(await identity(stranger)),p_mode:'continue',p_previous_relationship_id:pair}),'INVALID_PREVIOUS_RELATIONSHIP');
    });
    await t.test('former partner current links do not change the issuer list or eligibility',async()=>{
      const before=await options(dom);
      await link(otherDom,sub);
      assert.deepEqual(await options(dom),before);
      // Generating an invitation is not a claim that the other account is free.
      invite=await generate(dom,'continue',pair);
      denied(await rpc(sub,'accept_partner_link_code',{...scope(await identity(sub)),p_code:invite.code,p_mode:invite.mode,p_previous_relationship_id:invite.previous_relationship_id}),'ALREADY_LINKED_OR_INCOMPLETE');
      await unlink(sub);
    });
    await t.test('reload preserves exact invitation mode and selected dates; replacement invalidates old code',async()=>{
      const continued=await options(dom);
      assert.deepEqual(continued.invitation,{code:invite.code,mode:'continue',previous_relationship_id:pair});
      assert.deepEqual(await options(dom),continued);
      const fresh=await generate(dom,'fresh'),read=await options(dom);
      assert.deepEqual(read.invitation,{code:fresh.code,mode:'fresh',previous_relationship_id:null});
      denied(await rpc(sub,'preview_partner_link_code',{p_code:invite.code}),'INVALID_LINK_CODE');
      invite=await generate(dom,'continue',pair);
      reviewed=ok(await rpc(sub,'preview_partner_link_code',{p_code:invite.code}));
      assert.deepEqual(reviewed,{mode:'continue',previous_relationship_id:pair,can_continue_previous:true});
      denied(await rpc(stranger,'preview_partner_link_code',{p_code:invite.code}),'INVALID_LINK_CODE');
    });
    await t.test('acceptance requires exact shared period and mode, then rotates the generation',async()=>{
      const prior=await identity(sub),savedSession=(await rows('relationship_periods',`id=eq.${pair}&select=relationship_session_id`))[0].relationship_session_id;
      denied(await rpc(sub,'accept_partner_link_code',{...scope(prior),p_code:invite.code,p_mode:'fresh',p_previous_relationship_id:null}),'CONSENT_MISMATCH');
      denied(await rpc(sub,'accept_partner_link_code',{...scope(prior),p_code:invite.code,p_mode:'continue',p_previous_relationship_id:randomUUID()}),'CONSENT_MISMATCH');
      const next=await accept(sub,invite);assert.equal(next.relationship_id,pair);assert.notEqual(next.relationship_session_id,savedSession);
      denied(await rpc(sub,'get_my_partner_link_options',scope(prior)),'STALE_RELATIONSHIP');
      await unlink(sub);assert.equal((await options(dom)).invitation,null);
    });
    await t.test('an invitation stamped for an old generation is suppressed rather than relabeled',async()=>{
      const old=await generate(dom,'continue',pair),i=await identity(dom),next=randomUUID();
      // Service-only fixture simulates retained stale metadata without bypassing
      // invitation_session's stamp trigger. Real lifecycle commands consume it.
      ok(await req('PATCH',`/rest/v1/relationship_periods?id=eq.${i.relationship_id}`,service,{relationship_session_id:next}));
      assert.equal((await options(dom)).invitation,null);
      assert.equal((await rows('partner_link_invitations',`user_id=eq.${dom.id}&select=code`))[0].code,old.code);
      denied(await rpc(sub,'accept_partner_link_code',{...scope(await identity(sub)),p_code:old.code,p_mode:'continue',p_previous_relationship_id:pair}),'LINK_INVITATION_STALE');
    });
    await t.test('recorded role and saved accounting constrain Continue eligibility without exposing why a peer is unavailable',async()=>{
      // Service-owned synthetic legacy period: these same accounts had reversed
      // recorded roles. Complete wallets isolate the original-role eligibility.
      const old=ok(await req('POST','/rest/v1/relationship_periods',service,{status:'archived',ended_at:new Date().toISOString()}))[0];periods.add(old.id);
      const members=ok(await req('POST','/rest/v1/relationship_period_members',service,[
        {relationship_id:old.id,user_id:dom.id,role:'sub'},{relationship_id:old.id,user_id:sub.id,role:'dom'}]));
      ok(await req('POST','/rest/v1/action_wallets',service,members.map(m=>({relationship_id:old.id,participant_id:m.participant_id,currency:m.role,balance:0}))));
      ok(await req('POST','/rest/v1/action_accounting_periods',service,{relationship_id:old.id,accounting_enabled:true,
        activation_id:randomUUID(),activated_at:new Date().toISOString(),source_snapshot:{synthetic_fixture:true}}));
      const changed=await options(dom);assert.equal(changed.can_generate_fresh,true);
      assert.equal(changed.archived_relationships.find(x=>x.relationship_id===old.id).can_generate_continue,false);
      ok(await req('PATCH',`/rest/v1/action_accounting_periods?relationship_id=eq.${pair}`,service,{accounting_enabled:false}));
      assert.equal((await options(dom)).archived_relationships.find(x=>x.relationship_id===pair).can_generate_continue,false);
      ok(await req('PATCH',`/rest/v1/action_accounting_periods?relationship_id=eq.${pair}`,service,{accounting_enabled:true}));
    });
    await t.test('deleted original participant remains a neutral unavailable choice, never a reusable invitation',async()=>{
      deletedDom=await createAccount('dom');survivor=await createAccount('sub');
      for(const a of [deletedDom,survivor]){await activate(a);await ready(a);}
      const joined=await link(deletedDom,survivor);await unlink(survivor);
      ok(await req('DELETE',`/auth/v1/admin/users/${deletedDom.id}`,service));deletedDom.deleted=true;
      const option=(await options(survivor)).archived_relationships.find(x=>x.relationship_id===joined.relationship_id);
      assert.equal(option.former_partner_label,'Deleted account');assert.equal(option.can_generate_continue,false);
      denied(await rpc(survivor,'generate_partner_link_code',{...scope(await identity(survivor)),p_mode:'continue',p_previous_relationship_id:joined.relationship_id}),'INVALID_PREVIOUS_RELATIONSHIP');
      const before=await globalDigest();await options(survivor);assert.deepEqual(await globalDigest(),before);
    });
  } finally {
    trace('cleanup-start');
    const ids=accounts.map(a=>a.id);
    if(ids.length)for(const m of await rows('relationship_period_members',`user_id=in.(${ids.join(',')})&select=relationship_id`))periods.add(m.relationship_id);
    for(const p of periods)for(const table of ['action_feedback_acknowledgments','action_feedback_outbox','action_command_receipts',
      'reward_usage','task_completion_history','rule_violations','punishment_history','action_inventory_movements','action_point_entries',
      'reward_inventory_lots','action_events','action_task_openings','action_wallets','action_accounting_periods','rewards','tasks','rules','punishments']) {
      ok(await req('DELETE',`/rest/v1/${table}?relationship_id=eq.${p}`,service));
    }
    for(const a of accounts.filter(a=>!a.deleted))ok(await req('PATCH',`/rest/v1/profiles?id=eq.${a.id}`,service,{linked_partner_id:null}));
    for(const a of accounts.filter(a=>!a.deleted))ok(await req('DELETE',`/auth/v1/admin/users/${a.id}`,service));
    for(const p of periods){ok(await req('DELETE',`/rest/v1/relationship_period_members?relationship_id=eq.${p}`,service));ok(await req('DELETE',`/rest/v1/relationship_periods?id=eq.${p}`,service));}
    for(const table of tables)assert.equal(hash(await allRows(table)),originals.get(table),`Original ${table} changed`);
    assert.deepEqual(await authIds(),originalAuth,'Original Auth accounts changed');
    trace('cleanup-verified',{protectedTables:tables.length,originalAuthIdsUnchanged:true});
  }
});
