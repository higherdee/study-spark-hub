import { beforeAll, expect, it, vi } from "vitest";
vi.mock("@/integrations/turso/client.server", async () => {
  const { createClient } = await import("@libsql/client");
  return { turso: createClient({ url: "file::memory:" }) };
});
import { turso } from "@/integrations/turso/client.server";
import { createAnswerShare, readAnswerShare } from "@/lib/sharing.server";
beforeAll(async () => {
  await turso.executeMultiple(
    "CREATE TABLE profiles(id TEXT PRIMARY KEY,username TEXT,suspended INTEGER DEFAULT 0);CREATE TABLE chat_messages(id TEXT PRIMARY KEY,thread_id TEXT,user_id TEXT,role TEXT,parts TEXT);",
  );
  await turso.execute({
    sql: "INSERT INTO profiles(id,username) VALUES(?,?)",
    args: ["owner", "public_handle"],
  });
  await turso.execute({
    sql: "INSERT INTO chat_messages VALUES(?,?,?,?,?)",
    args: [
      "answer",
      "thread",
      "owner",
      "assistant",
      JSON.stringify([{ text: "A useful answer" }, { text: "with mathematics" }]),
    ],
  });
});
it("shares only the selected saved answer and returns a stable account-gated link", async () => {
  const input = { threadId: "thread", content: "A useful answer\nwith mathematics" };
  const first = await createAnswerShare("owner", input);
  expect(await createAnswerShare("owner", input)).toEqual(first);
  expect(first.url).toMatch(/^https:\/\/syllaboss.org\/shared\/[a-f0-9-]{36}$/);
  const shared = await readAnswerShare(first.url.split("/").at(-1)!);
  expect(shared).toEqual({ content: input.content, author: "@public_handle" });
  expect((await turso.execute("SELECT COUNT(*) n FROM study_answer_shares")).rows[0]?.["n"]).toBe(
    1,
  );
});
it("rejects another user's thread and unsaved content", async () => {
  await expect(
    createAnswerShare("outsider", {
      threadId: "thread",
      content: "A useful answer\nwith mathematics",
    }),
  ).rejects.toThrow("Only your saved");
  await expect(
    createAnswerShare("owner", {
      threadId: "thread",
      content: "Private text from another conversation",
    }),
  ).rejects.toThrow("Only your saved");
});
it("shares the same saved quiz across native and web message formats", async()=>{
  const questions=[{question:"Compute",options:["A","B","C","D"],modelAnswer:"A",correctOptionIndex:0}];
  await turso.execute({sql:"INSERT INTO chat_messages VALUES(?,?,?,?,?)",args:["quiz","thread","owner","assistant",JSON.stringify({quizData:{mode:"objective",topic:"Algebra",questions}})]});
  const result=await createAnswerShare("owner",{threadId:"thread",content:JSON.stringify({nativeStudySet:{mode:"objective",topic:"Algebra",items:questions}})});
  expect((await readAnswerShare(result.url.split("/").at(-1)!)).content).toContain('"nativeStudySet"');
});
it("withdraws access to a shared answer when the original chat answer is deleted",async()=>{
  const shared=await createAnswerShare("owner",{threadId:"thread",content:"A useful answer\nwith mathematics"});
  await turso.execute("DELETE FROM chat_messages WHERE id='answer'");
  await expect(readAnswerShare(shared.url.split("/").at(-1)!)).rejects.toThrow("unavailable");
});
