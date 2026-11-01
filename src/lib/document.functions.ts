import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireCurrentUserId } from "./auth.server";
import { answerDocumentQuestion, loadDocumentContext } from "./document-study.server";
import { referencedDocumentText } from "./ai/document-index";
export const askDocumentQuestionServerFn = createServerFn({ method: "POST" }).validator((input: unknown) => z.object({ materialId: z.string().min(1).max(100), threadId: z.string().uuid().optional(), message: z.string().trim().min(1).max(6000) }).strict().parse(input)).handler(async ({ data }) => answerDocumentQuestion(await requireCurrentUserId(), data));
export const getDocumentPassageServerFn = createServerFn({method:"GET"}).validator((input:unknown)=>z.object({materialId:z.string().min(1).max(100),page:z.number().int().min(1).max(1000),line:z.number().int().min(1).max(5000).optional()}).parse(input)).handler(async({data})=>{
  const document=await loadDocumentContext(await requireCurrentUserId(),data.materialId);
  const passage=referencedDocumentText(document.text,`page ${data.page}${data.line?` line ${data.line}`:""}`);
  return {text:passage?.text||"This page is a scan. Boss AI will read the original page image when you ask your question.",pages:document.pages,page:data.page,line:data.line||null};
});
