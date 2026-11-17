// tools/archive-leaderboard.ts
import { readFile, mkdir, writeFile, rename } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// src/game/types.ts
var EXPEDITION_ROOM_COUNT = 8;

// src/leaderboard-core.ts
var LEADERBOARD_VERSION = "starhop-v3";
var LEGACY_VERSION = "starhop-v2";
var REQUIRED_ROOMS = EXPEDITION_ROOM_COUNT;
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
function validateScore(value, version) {
  const v = object(value);
  if (!v || v.version !== version || typeof v.runId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.runId) || typeof v.playerId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.playerId) || typeof v.name !== "string" || v.name.length > 100 || !date(v.createdAt)) return null;
  const r = object(v.result);
  if (!r || r.won !== true || r.roomsCleared !== (version === LEADERBOARD_VERSION ? REQUIRED_ROOMS : 4) || !MODIFIER_IDS.includes(r.modifier) || !WEAPON_IDS.includes(r.weapon) || !number(r.seed, 0, 4294967295) || !number(r.time, 0.01, 86400, false) || !number(r.score, 0, 1e8) || !number(r.coins, 0, 1e6) || !number(r.kills, 1, 1e5) || !number(r.level, 1, 1e4) || !number(r.deaths, 0, 1e5) || !number(r.maxCombo, 0, 1e5) || !number(r.overdriveCount, 0, 1e5) || !ids(r.upgrades, 100) || !ids(r.synergies, 32)) return null;
  return {
    version,
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
      roomsCleared: r.roomsCleared,
      maxCombo: r.maxCombo,
      overdriveCount: r.overdriveCount,
      upgrades: [...r.upgrades],
      synergies: [...r.synergies]
    }
  };
}
function validateRecord(value) {
  return validateScore(value, LEADERBOARD_VERSION);
}
function validateLegacyRecord(value) {
  return validateScore(value, LEGACY_VERSION);
}
function validateProfile(value) {
  const v = object(value);
  if (!v || v.version !== LEADERBOARD_VERSION || v.type !== "profile" || typeof v.playerId !== "string" || !/^[a-zA-Z0-9_-]{8,100}$/.test(v.playerId) || typeof v.name !== "string" || v.name.length > 100 || !date(v.updatedAt)) return null;
  return { version: LEADERBOARD_VERSION, type: "profile", playerId: v.playerId, name: sanitizeName(v.name), updatedAt: new Date(v.updatedAt).toISOString() };
}
function mergeProfiles(...groups) {
  const latest = /* @__PURE__ */ new Map();
  for (const group of groups) for (const raw of group) {
    const profile = validateProfile(raw);
    if (!profile) continue;
    const previous = latest.get(profile.playerId);
    if (!previous || profile.updatedAt > previous.updatedAt || profile.updatedAt === previous.updatedAt && profile.name > previous.name) latest.set(profile.playerId, profile);
  }
  return [...latest.values()].sort((a, b) => a.playerId.localeCompare(b.playerId));
}
function applyProfiles(records, profiles) {
  const names = new Map(mergeProfiles(profiles).map((p) => [p.playerId, p.name]));
  return records.map((record) => ({ ...record, name: names.get(record.playerId) ?? record.name, result: { ...record.result, upgrades: [...record.result.upgrades], synergies: [...record.result.synergies] } }));
}
function compareRecords(a, b) {
  return a.result.time - b.result.time || a.createdAt.localeCompare(b.createdAt) || a.runId.localeCompare(b.runId);
}
function ranked(groups, version) {
  const best = /* @__PURE__ */ new Map();
  for (const group of groups) for (const raw of group) {
    const record = validateScore(raw, version);
    if (!record) continue;
    const key = `${record.result.modifier}:${record.playerId}`;
    const previous = best.get(key);
    if (!previous || compareRecords(record, previous) < 0) best.set(key, record);
  }
  return MODIFIER_IDS.flatMap((rule) => [...best.values()].filter((r) => r.result.modifier === rule).sort(compareRecords).slice(0, 10));
}
function mergeRecords(...groups) {
  return ranked(groups, LEADERBOARD_VERSION);
}
function mergeLegacyRecords(...groups) {
  return ranked(groups, LEGACY_VERSION);
}
function makeSnapshot(records, updatedAt = (/* @__PURE__ */ new Date()).toISOString(), profiles = [], legacyRecords = []) {
  const names = mergeProfiles(profiles);
  return {
    version: LEADERBOARD_VERSION,
    updatedAt: new Date(updatedAt).toISOString(),
    records: applyProfiles(mergeRecords(records), names),
    legacyRecords: applyProfiles(mergeLegacyRecords(legacyRecords), names),
    profiles: names
  };
}
function parseSnapshot(value) {
  const v = object(value);
  if (!v || ![LEADERBOARD_VERSION, LEGACY_VERSION].includes(v.version) || !date(v.updatedAt) || !Array.isArray(v.records) || v.records.length > 1e4) return null;
  if (v.version === LEGACY_VERSION) return makeSnapshot([], v.updatedAt, [], v.records.map(validateLegacyRecord).filter((r) => !!r));
  if (v.profiles !== void 0 && (!Array.isArray(v.profiles) || v.profiles.length > 1e5)) return null;
  if (v.legacyRecords !== void 0 && (!Array.isArray(v.legacyRecords) || v.legacyRecords.length > 1e4)) return null;
  return makeSnapshot(
    v.records.map(validateRecord).filter((r) => !!r),
    v.updatedAt,
    v.profiles ?? [],
    v.legacyRecords ?? []
  );
}

// src/leaderboard.ts
var LEADERBOARD_CONFIG = {
  topic: "starhop-classic-v42-f3b7e2d96a1048bc965f7d013a82c46e",
  baseUrl: "https://ntfy.sh",
  snapshotUrl: "https://raw.githubusercontent.com/le3334515-tech/starhop-expedition/main/classic/leaderboard/v3.json",
  historicalTopic: "starhop-v3-79cd3cc8ca0b43a5a2de69ad61af31e8",
  historicalSnapshotUrl: "https://raw.githubusercontent.com/le3334515-tech/starhop-expedition/main/leaderboard/v3.json",
  legacyTopic: "starhop-v2-bb44ce0019a44e73a212d732ced64e5b",
  legacySnapshotUrl: "https://raw.githubusercontent.com/le3334515-tech/starhop-expedition/main/leaderboard/v2.json"
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
    let legacyRecord = null;
    let profile = null;
    if (typeof event.message === "string" && event.message.length <= 4096) {
      try {
        const payload = JSON.parse(event.message);
        record = validateRecord(payload);
        legacyRecord = validateLegacyRecord(payload);
        profile = validateProfile(payload);
      } catch {
      }
    }
    events.push({ id: event.id, time: event.time, record, legacyRecord, profile });
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
  const snapshotFile = path.join(root, "leaderboard", "v3.json");
  const cursorFile = path.join(root, "leaderboard", "cursor-v3.json");
  const rawSnapshot = await optionalJson(snapshotFile);
  const previous = rawSnapshot === void 0 ? null : parseSnapshot(rawSnapshot);
  if (rawSnapshot !== void 0 && !previous) throw new Error("Existing leaderboard snapshot is invalid");
  if (rawSnapshot !== void 0 && (!rawSnapshot.records.every((record) => validateRecord(record)) || !(rawSnapshot.legacyRecords ?? []).every((record) => validateLegacyRecord(record)) || !(rawSnapshot.profiles ?? []).every((profile) => validateProfile(profile)))) {
    throw new Error("Existing leaderboard snapshot contains invalid records");
  }
  const rawCursor = await optionalJson(cursorFile);
  const cursor = rawCursor === void 0 ? null : parseCursor(rawCursor);
  if (rawCursor !== void 0 && !cursor) throw new Error("Existing leaderboard cursor is invalid");
  const legacyRaw = await optionalJson(path.join(root, "leaderboard", "v2.json"));
  const legacySnapshot = legacyRaw === void 0 ? null : parseSnapshot(legacyRaw);
  if (legacyRaw !== void 0 && (!legacySnapshot || !legacyRaw.records.every((record) => validateLegacyRecord(record)))) throw new Error("Existing legacy leaderboard is invalid");
  const poll = async (since, feedTopic = topic) => {
    const url = new URL(`${baseUrl}/${feedTopic}/json`);
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
  const legacyEvents = await poll("all", options.legacyTopic ?? LEADERBOARD_CONFIG.legacyTopic);
  const legacyRecords = mergeLegacyRecords(previous?.legacyRecords ?? [], legacySnapshot?.legacyRecords ?? [], legacyEvents.flatMap((e) => e.legacyRecord ? [e.legacyRecord] : []));
  const profiles = mergeProfiles(previous?.profiles ?? [], unique.flatMap((e) => e.profile ? [e.profile] : []));
  const snapshot = makeSnapshot(records, (options.now?.() ?? /* @__PURE__ */ new Date()).toISOString(), profiles, legacyRecords);
  const recordsChanged = !previous || JSON.stringify([snapshot.records, snapshot.legacyRecords, snapshot.profiles]) !== JSON.stringify([previous.records, previous.legacyRecords, previous.profiles]);
  if (recordsChanged) await writeJson(snapshotFile, snapshot);
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
if (process.argv[1] && /archive-leaderboard\.(?:mjs|ts)$/.test(path.basename(process.argv[1])) && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const deploymentRoot = process.argv[2] ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  archiveLeaderboard({ root: deploymentRoot }).then((result) => console.log(JSON.stringify(result)), (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
export {
  archiveLeaderboard,
  collectMessages,
  parseCursor
};
