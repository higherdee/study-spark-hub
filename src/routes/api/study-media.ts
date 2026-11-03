import { createFileRoute } from "@tanstack/react-router";
import { requireCurrentUserId } from "@/lib/auth.server";
import { getProfile } from "@/integrations/turso/client.server";
import { readStudyMedia, saveStudyMedia, transcribeStudyVoice, MEDIA_LIMIT } from "@/lib/study-media.server";
async function actor() { const id=await requireCurrentUserId(); if((await getProfile(id))?.suspended)throw new Error("Unauthorized"); return id; }
const fail=(e:unknown)=>Response.json({error:e instanceof Error?e.message:"Attachment unavailable."},{status:e instanceof Error&&e.message==="Unauthorized"?401:400,headers:{"Cache-Control":"no-store"}});
export const Route=createFileRoute("/api/study-media")({server:{handlers:{
  POST:async({request})=>{try{
    const id=await actor();
    if(Number(request.headers.get("content-length"))>MEDIA_LIMIT+16384)throw new Error("Choose a file smaller than 3 MB for chat.");
    const form=await request.formData(); const file=form.get("file");
    if(!(file instanceof File))throw new Error("Choose a file first.");
    const purpose=String(form.get("purpose")||"study");
    if(purpose==="transcribe")return Response.json(await transcribeStudyVoice(id,file));
    const target=String(form.get("target")||"").slice(0,100);
    return Response.json(await saveStudyMedia(id,file,target||undefined,Number(form.get("duration"))||0),{headers:{"Cache-Control":"no-store"}});
  }catch(e){return fail(e);}},
  GET:async({request})=>{try{
    const userId=await actor(); const id=new URL(request.url).searchParams.get("id")||"";
    if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error("Attachment not found.");
    const file=await readStudyMedia(userId,id);
    return new Response(new Uint8Array(file.bytes),{headers:{"Content-Type":file.mime,"Content-Disposition":`inline; filename*=UTF-8''${encodeURIComponent(file.title)}`,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff"}});
  }catch(e){return fail(e);}}
}}});
