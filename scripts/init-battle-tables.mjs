import dns from "node:dns";
import { createClient } from "@libsql/client";

const resolver = new dns.promises.Resolver();
resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

const origLookup = dns.lookup;
dns.lookup = function (hostname, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }

  origLookup(hostname, options, async (err, address, family) => {
    if (err && hostname.includes("turso.io")) {
      try {
        const addresses = await resolver.resolve4(hostname);
        if (addresses && addresses.length > 0) {
          if (options && options.all) {
            return callback(null, addresses.map(a => ({ address: a, family: 4 })));
          }
          return callback(null, addresses[0], 4);
        }
      } catch (resErr) {
        try {
          const cnames = await resolver.resolveCname(hostname);
          if (cnames && cnames.length > 0) {
            const cnameAddrs = await resolver.resolve4(cnames[0]);
            if (cnameAddrs && cnameAddrs.length > 0) {
              if (options && options.all) {
                return callback(null, cnameAddrs.map(a => ({ address: a, family: 4 })));
              }
              return callback(null, cnameAddrs[0], 4);
            }
          }
        } catch {}
      }
    }
    return callback(err, address, family);
  });
};

const TURSO_URL = process.env.TURSO_DATABASE_URL || "libsql://syllaboss-db-kunle.aws-us-east-2.turso.io";
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

const turso = createClient({
  url: TURSO_URL,
  authToken: TURSO_AUTH_TOKEN,
});

async function main() {
  console.log("Creating study_battles and battle_participants tables in Turso...");

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS study_battles (
      id TEXT PRIMARY KEY,
      group_id TEXT NOT NULL,
      host_id TEXT NOT NULL,
      host_name TEXT NOT NULL,
      title TEXT NOT NULL,
      mode TEXT NOT NULL,
      source_summary TEXT,
      time_per_question INTEGER,
      question_count INTEGER NOT NULL DEFAULT 5,
      questions_json TEXT NOT NULL,
      stake_amount INTEGER NOT NULL DEFAULT 0,
      total_pot INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'lobby',
      winner_ids_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );
  `);

  await turso.execute(`
    CREATE TABLE IF NOT EXISTS battle_participants (
      id TEXT PRIMARY KEY,
      battle_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      avatar_url TEXT,
      role TEXT NOT NULL DEFAULT 'fighter',
      status TEXT NOT NULL DEFAULT 'invited',
      stake_paid INTEGER NOT NULL DEFAULT 0,
      sponsored_by TEXT,
      score INTEGER NOT NULL DEFAULT 0,
      answers_json TEXT,
      submitted_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  console.log("Successfully created study_battles and battle_participants tables in Turso!");
}

main().catch(console.error);
