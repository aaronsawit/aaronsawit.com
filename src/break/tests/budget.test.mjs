// The daily budget: the model is never called once the day's count passes the cap, and never at all
// if the counter is missing. A fake D1 and a fake AI stand in for Cloudflare.
import test from "node:test";
import assert from "node:assert/strict";
import worker, { DAILY_AI_CALLS, RESTING } from "../worker.js";

function fakeDb(start = 0) {
  const state = { calls: start };
  return {
    state,
    prepare: () => ({ bind: () => ({ first: async () => ({ calls: ++state.calls }) }) }),
  };
}

function env(db) {
  const ai = { runs: 0, run: async () => { ai.runs += 1; return { response: "hello" }; } };
  return { AI: ai, BUDGET: db, ASSETS: { fetch: () => new Response("asset") } };
}

const chat = () => new Request("https://aaronsawit.com/api/break", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "chat", level: 1, message: "hi" }),
});

test("under the cap the model is called", async () => {
  const e = env(fakeDb(0));
  const res = await (await worker.fetch(chat(), e)).json();
  assert.ok(e.AI.runs >= 1);
  assert.notEqual(res.reply, RESTING);
});

test("over the cap the bot rests and the model is not called", async () => {
  const e = env(fakeDb(DAILY_AI_CALLS));
  const res = await (await worker.fetch(chat(), e)).json();
  assert.equal(e.AI.runs, 0);
  assert.equal(res.reply, RESTING);
  assert.equal(res.resting, true);
});

test("with no counter configured it fails closed", async () => {
  const e = env(undefined);
  const res = await (await worker.fetch(chat(), e)).json();
  assert.equal(e.AI.runs, 0);
  assert.equal(res.reply, RESTING);
});

test("the level list does not spend budget", async () => {
  const db = fakeDb(0);
  await worker.fetch(new Request("https://aaronsawit.com/api/break"), env(db));
  assert.equal(db.state.calls, 0);
});
