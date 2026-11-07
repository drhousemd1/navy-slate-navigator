import { createMessageMediaHandler } from './handler.ts';
import { validateImage } from './validation.ts';
const assert = (condition: unknown, message = 'Assertion failed') => { if (!condition) throw new Error(message); };
const png=Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgYGD4DwABBAEAX+XDSwAAAABJRU5ErkJggg=='),c=>c.charCodeAt(0));
const id='10000000-0000-4000-8000-000000000001', attachment='10000000-0000-4000-8000-000000000002';
const config={supabaseUrl:'http://127.0.0.1:28622',anonKey:'test-anon',serviceKey:'test-service'};
const json=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
function upload(token='test-user') { const form=new FormData();form.append('uploadId',id);form.append('expectedRelationshipId',id);form.append('expectedRelationshipSessionId',id);
  form.append('file',new File([png],'private-name.png',{type:'image/png'}));
  return new Request('http://127.0.0.1:28622/functions/v1/message-media',{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form}); }
Deno.test('anon/service bearer never reaches a service operation',async()=>{
  for(const token of['test-anon','test-service']){let calls=0;const handler=createMessageMediaHandler(config,async()=>{calls++;return json({id});});
    const r=await handler(upload(token));assert(r.status===401&&calls===0);}
});
Deno.test('verified caller is the only actor; success exposes no key/path/filename',async()=>{
  const verified=await validateImage(png,'image/png');const paths:string[]=[];
  const mapping={attachmentId:attachment,bucket:'message-media',objectPath:attachment,...verified,status:'pending'};
  const handler=createMessageMediaHandler(config,async(input,init)=>{
    const path=new URL(String(input)).pathname;paths.push(path);
    if(path==='/auth/v1/user'){assert(new Headers(init?.headers).get('Authorization')==='Bearer test-user');return json({id});}
    assert(new Headers(init?.headers).get('Authorization')==='Bearer test-service');
    if(path.endsWith('/message_media_begin')){const body=JSON.parse(String(init?.body));assert(body.p_actor===id);return json(mapping);}
    if(path.startsWith('/storage/'))return init?.method==='POST'?json({}):new Response(png);
    if(path.endsWith('/message_media_finalize'))return json({...verified,attachmentId:attachment,status:'ready'});
    throw new Error('Unexpected request');
  });
  const r=await handler(upload()),body=await r.text();assert(r.status===200&&paths[0]==='/auth/v1/user');
  assert(!body.includes('objectPath')&&!body.includes('bucket')&&!body.includes('private-name')&&!body.includes('sha256'));
});
Deno.test('upload failure leaves pending private bytes, with no delete or false readiness',async()=>{
  const verified=await validateImage(png,'image/png');let finalized=false;
  const handler=createMessageMediaHandler(config,async(input,init)=>{
    const path=new URL(String(input)).pathname;assert(init?.method!=='DELETE');
    if(path==='/auth/v1/user')return json({id});
    if(path.endsWith('/message_media_begin'))return json({attachmentId:attachment,bucket:'message-media',objectPath:attachment,...verified,status:'pending'});
    if(path.endsWith('/message_media_finalize')){finalized=true;return json({});}
    return json({error:'unavailable'},503);
  });
  const r=await handler(upload());assert(r.status===503&&!finalized);assert((await r.json()).error.code==='UPLOAD_UNCONFIRMED');
});
Deno.test('lost upload response retry verifies exact object before finalizing; stale finalize is visible',async()=>{
  const verified=await validateImage(png,'image/png');let read=false;
  const handler=createMessageMediaHandler(config,async(input,init)=>{
    const path=new URL(String(input)).pathname;assert(init?.method!=='DELETE');
    if(path==='/auth/v1/user')return json({id});
    if(path.endsWith('/message_media_begin'))return json({attachmentId:attachment,bucket:'message-media',objectPath:attachment,...verified,status:'pending'});
    if(path.startsWith('/storage/')){if(init?.method==='POST')return json({error:'Duplicate'},400);read=true;return new Response(png);}
    if(path.endsWith('/message_media_finalize')){assert(read);return json({message:'STALE_RELATIONSHIP_SESSION'},403);}
    throw new Error('Unexpected request');
  });
  const r=await handler(upload());assert(r.status===403);assert((await r.json()).error.code==='STALE_RELATIONSHIP_SESSION');
});
Deno.test('GET checks participation and streams no-store binary, without redirect',async()=>{
  const verified=await validateImage(png,'image/png');let calls=0;
  const handler=createMessageMediaHandler(config,async(input)=>{calls++;const path=new URL(String(input)).pathname;
    if(path==='/auth/v1/user')return json({id});
    if(path.endsWith('/message_media_read'))return json({attachmentId:attachment,bucket:'message-media',objectPath:attachment,...verified});
    return new Response(png);
  });
  const r=await handler(new Request(`http://127.0.0.1:28622/functions/v1/message-media/${attachment}`,{headers:{Authorization:'Bearer test-user'}}));
  assert(r.status===200&&calls===3&&r.headers.get('Cache-Control')==='no-store, private'&&!r.headers.has('Location'));
  assert(new Uint8Array(await r.arrayBuffer()).every((v,i)=>v===png[i]));
});
Deno.test('failed authorization stops before fetching Storage bytes',async()=>{
  let storageCalls=0;
  const handler=createMessageMediaHandler(config,async(input)=>{const path=new URL(String(input)).pathname;
    if(path==='/auth/v1/user')return json({id});
    if(path.endsWith('/message_media_read'))return json({message:'MESSAGE_ATTACHMENT_UNAVAILABLE',details:'internal secret'},403);
    storageCalls++;return new Response(png);
  });
  const r=await handler(new Request(`http://127.0.0.1:28622/functions/v1/message-media/${attachment}`,{headers:{Authorization:'Bearer test-user'}}));
  assert(r.status===403&&storageCalls===0);assert(!(await r.text()).includes('internal secret'));
});
Deno.test('truncated or changed stored bytes are not served as verified media',async()=>{
  const verified=await validateImage(png,'image/png');
  const handler=createMessageMediaHandler(config,async(input)=>{const path=new URL(String(input)).pathname;
    if(path==='/auth/v1/user')return json({id});
    if(path.endsWith('/message_media_read'))return json({attachmentId:attachment,bucket:'message-media',objectPath:attachment,...verified});
    return new Response(png.subarray(0,png.length-1));
  });
  const r=await handler(new Request(`http://127.0.0.1:28622/functions/v1/message-media/${attachment}`,{headers:{Authorization:'Bearer test-user'}}));
  assert(r.status===503);assert((await r.json()).error.code==='MEDIA_INTEGRITY_FAILED');
});
