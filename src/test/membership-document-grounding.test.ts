import { expect, it } from "vitest";
import { numberedPage, documentReference, referencedDocumentText, documentPages } from "@/lib/ai/document-index";
import { parseTheoryMarking } from "@/lib/ai/theory-marking";
const document=Array.from({length:70},(_,p)=>numberedPage({page:p+1,lines:Array.from({length:40},(_,l)=>`Actual text on page ${p+1}, line ${l+1}: ${p===64&&l===19?"the capacitor stores 24 joules":"a separate source passage"}`)})).join("\n");
it("finds the twentieth line on page 65 without substituting the title or first page",()=>{
  for(const query of ["Explain the 20th line in the 65th page","Explain page 65, line 20","what does line 20 on p.65 mean?"]) {
    expect(documentReference(query)).toEqual({page:65,line:20});
    const result=referencedDocumentText(document,query); expect(result?.text).toContain("[Line 20] Actual text on page 65, line 20: the capacitor stores 24 joules");expect(result?.text).not.toContain("[Page 1]");
  }
  expect(documentPages(document)).toHaveLength(70);
});
it("rejects nonexistent pages or lines instead of inventing the passage",()=>{
  expect(()=>referencedDocumentText(document,"page 90 line 20")).toThrow("outside");expect(()=>referencedDocumentText(document,"page 65 line 90")).toThrow("40 extracted");expect(referencedDocumentText(document,"explain capacitor energy")).toBeNull();
});
const marking=(earned=0)=>JSON.stringify({criteria:[{criterion:"Correct physical relationship",possible:4,earned,evidence:"",reason:"No valid relationship was supplied."},{criterion:"Substitution and calculation",possible:4,earned:0,evidence:"",reason:"No calculation was supplied."},{criterion:"Units and conclusion",possible:2,earned:0,evidence:"",reason:"No conclusion was supplied."}],feedback:"State the relationship, substitute the values, and show the units.",strengths:[],areasToImprove:["Show your calculation."]});
it("preserves a genuine zero and derives the score from the actual rubric",()=>{expect(parseTheoryMarking(marking()).score).toBe(0);expect(parseTheoryMarking(marking(2.5)).score).toBe(2.5);});
it("rejects fabricated defaults, impossible marks and incomplete rubrics",()=>{
  expect(()=>parseTheoryMarking('{"score":5,"feedback":"Estimated credit"}')).toThrow("breakdown");expect(()=>parseTheoryMarking(marking(5))).toThrow("invalid marks");expect(()=>parseTheoryMarking(marking(),20)).toThrow("available marks");
});
it("does not invent a numeric grade for illegible work",()=>{expect(()=>parseTheoryMarking('{"needsReview":true,"referenceIssue":"The working is illegible."}')).toThrow("illegible");});
