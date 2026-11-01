import { beforeAll, expect, it, vi } from "vitest";
const state=vi.hoisted(()=>({bytes:new Uint8Array(),vision:vi.fn().mockResolvedValue("The capacitor stores 24 joules.")}));
vi.mock("@/integrations/turso/client.server",async()=>{const{createClient}=await import("@libsql/client");return{turso:createClient({url:"file::memory:"}),getMaterialById:async()=>({id:"test-pdf",title:"MISLEADING TITLE: French literature",course:"Test",status:"verified",user_id:"owner",file_path:"materials/test.pdf",file_size:state.bytes.length,mime_type:"application/pdf"})};});
vi.mock("@/integrations/r2/client.server",()=>({getFromR2:async()=>({bytes:state.bytes})}));
vi.mock("@/lib/membership/policy.server",()=>({requireLibraryAiAccess:async()=>{},enforceChatRetention:async()=>{}}));
vi.mock("@/lib/membership/ai.server",()=>({budgetedAiFetch:vi.fn(),withAiAllowance:async(_id:string,run:()=>unknown)=>run()}));
vi.mock("@/lib/gemini",()=>({askGeminiAI:vi.fn(),askGeminiVisionAI:(...args:unknown[])=>state.vision(...args)}));
import {loadDocumentContext,generateFromStoredDocument,selectDocumentExcerpt} from "@/lib/document-study.server";
beforeAll(()=>{
  const objects:string[]=["<< /Type /Catalog /Pages 2 0 R >>","", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"];
  const kids:string[]=[];
  for(let page=1;page<=70;page++){
    const id=objects.length+1;kids.push(`${id} 0 R`);
    const lines=Array.from({length:40},(_,l)=>`(Page ${page} line ${l+1}: ${page===65&&l===19?"the capacitor stores 24 joules":"source text"}) Tj T*`).join("\n");
    const content=`BT /F1 10 Tf 40 800 Td 12 TL\n${lines}\nET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 900] /Resources << /Font << /F1 3 0 R >> >> /Contents ${id+1} 0 R >>`,`<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`);
  }
  objects[1]=`<< /Type /Pages /Count 70 /Kids [${kids.join(" ")}] >>`;
  let pdf="%PDF-1.4\n";const offsets=[0];objects.forEach((object,i)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${i+1} 0 obj\n${object}\nendobj\n`;});
  const xref=Buffer.byteLength(pdf);pdf+=`xref\n0 ${objects.length+1}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  state.bytes=new Uint8Array(Buffer.from(pdf));
});
it("extracts all 70 actual PDF pages and retrieves page 65 line 20 despite an unrelated title",async()=>{
  const document=await loadDocumentContext("owner","test-pdf");expect(document.pages).toBe(70);expect(document.text).toContain("[Page 70]");
  const passage=selectDocumentExcerpt(document.text,"Explain line 20 on page 65");expect(passage).toContain("[Line 20] Page 65 line 20: the capacitor stores 24 joules");expect(passage).not.toContain("French literature");
});
it("sends the original complete PDF bytes to study generation rather than its title or description",async()=>{
  await generateFromStoredDocument("owner","test-pdf","Create questions from page 65 line 20");
  const args=state.vision.mock.calls[0]!;expect(Buffer.from(args[1] as string,"base64")).toEqual(Buffer.from(state.bytes));expect(args[2]).toBe("application/pdf");expect(args[0]).toContain("capacitor stores 24 joules");
});
