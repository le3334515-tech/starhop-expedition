// tools/archive-leaderboard.ts
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// src/leaderboard-core.ts
var LEADERBOARD_VERSION = "starhop-v2";
var REQUIRED_ROOMS = 4;
var MODIFIER_IDS = ["standard", "moon", "haste", "iron"];
var WEAPON_IDS = ["blade", "ember", "disc"];
function sanitizeName(name) {
  return Array.from(name.normalize("NFC").replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069<>&"'`]/g, "").replace(/\s+/g, " ").trim()).slice(0, 12).join("") || "\u661F\u9645\u65C5\u4EBA";
}
function object(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : null;
}
function number(value, min, max, integer = true) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max && (!integer || Number.isInteger(value));
}
function ids(value, max) {
  return Array.isArray(value) && value.length <= max && value.every((v) => typeof v === "string" && /^[a-zA-Z0-9_-]{1,64}$/.test(v));
}
function date(value) {
  return typeof value === "string" && value.length <= 40 && Number.isFinite(Date.parse(value));
}
function validateRecord(value) {
  const v = object(value);
  if (!v || v.version !== LEADERBOARD_VERSION || typeof v.runId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.runId) || typeof v.playerId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.playerId) || typeof v.name !== "string" || v.name.length > 100 || !date(v.createdAt)) return null;
  const r = object(v.result);
  if (!r || r.won !== true || r.roomsCleared !== REQUIRED_ROOMS || !MODIFIER_IDS.includes(r.modifier) || !WEAPON_IDS.includes(r.weapon) || !number(r.seed, 0, 4294967295) || !number(r.time, 0.01, 86400, false) || !number(r.score, 0, 1e8) || !number(r.coins, 0, 1e6) || !number(r.kills, 1, 1e5) || !number(r.level, 1, 1e4) || !number(r.deaths, 0, 1e5) || !number(r.maxCombo, 0, 1e5) || !number(r.overdriveCount, 0, 1e5) || !ids(r.upgrades, 100) || !ids(r.synergies, 32)) return null;
  return {
    version: LEADERBOARD_VERSION,
    runId: v.runId,
    playerId: v.playerId,
    name: sanitizeName(v.name),
    createdAt: new Date(v.createdAt).toISOString(),
    result: {
      seed: r.seed,
      modifier: r.modifier,
      weapon: r.weapon,
      won: true,
      time: r.time,
      score: r.score,
      coins: r.coins,
      kills: r.kills,
      level: r.level,
      deaths: r.deaths,
      roomsCleared: REQUIRED_ROOMS,
      maxCombo: r.maxCombo,
      overdriveCount: r.overdriveCount,
      upgrades: [...r.upgrades],
      synergies: [...r.synergies]
    }
  };
}
function compareRecords(a, b) {
  return a.result.time - b.result.time || a.createdAt.localeCompare(b.createdAt) || a.runId.localeCompare(b.runId);
}
function mergeRecords(...groups) {
  const best = /* @__PURE__ */ new Map();
  for (const group of groups) for (const raw of group) {
    const record = validateRecord(raw);
    if (!record) continue;
    const key = `${record.result.modifier}:${record.playerId}`;
    const previous = best.get(key);
    if (!previous || compareRecords(record, previous) < 0) best.set(key, record);
  }
  return MODIFIER_IDS.flatMap((rule) => [...best.values()].filter((r) => r.result.modifier === rule).sort(compareRecords).slice(0, 10));
}
function makeSnapshot(records, updatedAt = (/* @__PURE__ */ new Date()).toISOString()) {
  return { version: LEADERBOARD_VERSION, updatedAt: new Date(updatedAt).toISOString(), records: mergeRecords(records) };
}
function parseSnapshot(value) {
  const v = object(value);
  if (!v || v.version !== LEADERBOARD_VERSION || !date(v.updatedAt) || !Array.isArray(v.records) || v.records.length > 1e4) return null;
  return makeSnapshot(v.records.map(validateRecord).filter((r) => !!r), v.updatedAt);
}

// src/leaderboard.ts
var LEADERBOARD_CONFIG = {
  topic: "starhop-v2-bb44ce0019a44e73a212d732ced64e5b",
  baseUrl: "https://ntfy.sh",
  snapshotUrl: "https://raw.githubusercontent.com/le3334515-tech/starhop-expedition/main/leaderboard/v2.json"
};

// tools/archive-leaderboard.ts
function collectMessages(text) {
  const events = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      throw new Error("Malformed leaderboard event response");
    }
    if (!event || typeof event !== "object" || Array.isArray(event)) throw new Error("Invalid leaderboard event");
    if (event.event === "open" || event.event === "keepalive") continue;
    if (event.event !== "message") throw new Error("Unexpected leaderboard event response");
    if (typeof event.id !== "string" || !/^[A-Za-z0-9_-]{1,100}$/.test(event.id) || typeof event.time !== "number" || !Number.isSafeInteger(event.time) || event.time < 0) {
      throw new Error("Invalid leaderboard event cursor");
    }
    let record = null;
    if (typeof event.message === "string" && event.message.length <= 4096) {
      try {
        record = validateRecord(JSON.parse(event.message));
      } catch {
      }
    }
    events.push({ id: event.id, time: event.time, record });
  }
  return events;
}
function parseCursor(value) {
  if (!value || typeof value !== "object") return null;
  const cursor = value;
  return cursor.version === LEADERBOARD_VERSION && typeof cursor.lastEventId === "string" && /^[A-Za-z0-9_-]{1,100}$/.test(cursor.lastEventId) && typeof cursor.lastEventTime === "number" && Number.isSafeInteger(cursor.lastEventTime) && cursor.lastEventTime >= 0 ? cursor : null;
}
async function optionalJson(file) {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return void 0;
    throw new Error(`Cannot read ${path.basename(file)}: ${error.message}`);
  }
}
async function writeJson(file, value) {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}
`, "utf8");
  await rename(temporary, file);
}
async function archiveLeaderboard(options = {}) {
  const root = path.resolve(options.root ?? process.cwd());
  const topic = options.topic ?? LEADERBOARD_CONFIG.topic;
  if (!/^[A-Za-z0-9_-]+$/.test(topic)) throw new Error("Invalid leaderboard topic");
  const baseUrl = (options.baseUrl ?? LEADERBOARD_CONFIG.baseUrl).replace(/\/$/, "");
  const fetcher = options.fetch ?? fetch;
  const snapshotFile = path.join(root, "leaderboard", "v2.json");
  const cursorFile = path.join(root, "leaderboard", "cursor.json");
  const rawSnapshot = await optionalJson(snapshotFile);
  const previous = rawSnapshot === void 0 ? null : parseSnapshot(rawSnapshot);
  if (rawSnapshot !== void 0 && !previous) throw new Error("Existing leaderboard snapshot is invalid");
  if (rawSnapshot !== void 0 && !rawSnapshot.records.every((record) => validateRecord(record))) {
    throw new Error("Existing leaderboard snapshot contains invalid records");
  }
  const rawCursor = await optionalJson(cursorFile);
  const cursor = rawCursor === void 0 ? null : parseCursor(rawCursor);
  if (rawCursor !== void 0 && !cursor) throw new Error("Existing leaderboard cursor is invalid");
  const poll = async (since) => {
    const url = new URL(`${baseUrl}/${topic}/json`);
    url.searchParams.set("poll", "1");
    url.searchParams.set("since", since);
    const response = await fetcher(url.toString(), { headers: { Accept: "application/x-ndjson" }, signal: AbortSignal.timeout(3e4) });
    if (!response.ok) throw new Error(`Leaderboard feed returned HTTP ${response.status}`);
    if (response.headers.get("X-Messages-Truncated") === "1") throw new Error("Leaderboard replay was truncated; cursor was not advanced");
    const body = await response.text();
    if (body.length > 12e6) throw new Error("Leaderboard replay exceeds archive size limit");
    return collectMessages(body);
  };
  let events;
  if (!cursor) events = await poll("all");
  else {
    const overlap = String(Math.max(0, cursor.lastEventTime - 120));
    try {
      events = await poll(cursor.lastEventId);
    } catch (error) {
      if (!/HTTP 400|HTTP 404/.test(error.message)) throw error;
      events = [];
    }
    events.push(...await poll(overlap));
  }
  const unique = [...new Map(events.map((event) => [event.id, event])).values()].sort((a, b) => a.time - b.time || a.id.localeCompare(b.id));
  const records = mergeRecords(previous?.records ?? [], unique.flatMap((event) => event.record ? [event.record] : []));
  const recordsChanged = !previous || JSON.stringify(records) !== JSON.stringify(previous.records);
  if (recordsChanged) await writeJson(snapshotFile, makeSnapshot(records, (options.now?.() ?? /* @__PURE__ */ new Date()).toISOString()));
  const last = unique.at(-1);
  const nextCursor = last && (!cursor || last.time >= cursor.lastEventTime) ? {
    version: LEADERBOARD_VERSION,
    lastEventId: last.id,
    lastEventTime: last.time
  } : cursor;
  const cursorChanged = nextCursor !== null && JSON.stringify(nextCursor) !== JSON.stringify(cursor);
  if (cursorChanged) await writeJson(cursorFile, nextCursor);
  return { records: records.length, received: unique.length, recordsChanged, cursorChanged };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  archiveLeaderboard({ root: process.argv[2] }).then((result) => console.log(JSON.stringify(result)), (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
export {
  archiveLeaderboard,
  collectMessages,
  parseCursor
};
