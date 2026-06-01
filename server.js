import { Database } from "jsr:@db/sqlite@^0.12";
import { serveDir } from "jsr:@std/http@^1/file-server";

const db = new Database("games.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    tag TEXT NOT NULL,
    developer TEXT NOT NULL,
    platform TEXT NOT NULL,
    mode TEXT NOT NULL,
    description TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT 'blue'
  )
`);

const countRow = db.prepare("SELECT COUNT(*) FROM games").value();
if (!countRow || countRow[0] === 0) {
  const insert = db.prepare(
    "INSERT INTO games (name, tag, developer, platform, mode, description, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
  );
  insert.run("Valorant", "Tactical FPS", "Riot Games", "PC (Free)", "5v5",
    "A team-based tactical shooter where precise aim meets unique agent abilities. Every round demands strategy, communication, and clutch plays.", "purple");
  insert.run("Counter-Strike 2", "Tactical FPS", "Valve", "PC (Free)", "5v5",
    "The legendary competitive shooter, rebuilt in Source 2. Buy, plant, defuse — CS2 rewards game sense, economy management, and mechanical skill.", "blue");
  insert.run("Apex Legends", "Battle Royale", "Respawn", "PC / Console", "Squads",
    "A fast-paced battle royale with fluid movement and team-focused legend abilities. Ziplines, wall-running, and respawn beacons keep every match fresh.", "red");
}

function getAllGames() {
  return db.prepare("SELECT * FROM games ORDER BY id ASC").values().map(rowToGame);
}

function rowToGame(row) {
  return { id: Number(row[0]), name: row[1], tag: row[2], developer: row[3],
           platform: row[4], mode: row[5], description: row[6], color: row[7] };
}

function getGame(id) {
  const row = db.prepare("SELECT * FROM games WHERE id = ?").value(id);
  return row ? rowToGame(row) : null;
}

const PORT = 3000;

Deno.serve({ port: PORT }, async (req) => {
  const url = new URL(req.url);

  // GET /api/games
  if (url.pathname === "/api/games" && req.method === "GET") {
    return Response.json(getAllGames());
  }

  // POST /api/games
  if (url.pathname === "/api/games" && req.method === "POST") {
    let body;
    try { body = await req.json(); } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }
    const { name, tag, developer, platform, mode, description, color } = body;
    if (!name || !tag || !developer || !platform || !mode || !description) {
      return Response.json({ error: "All fields are required." }, { status: 400 });
    }
    db.prepare(
      "INSERT INTO games (name, tag, developer, platform, mode, description, color) VALUES (?, ?, ?, ?, ?, ?, ?)"
    ).run(name.trim(), tag.trim(), developer.trim(), platform.trim(), mode.trim(), description.trim(), color || "blue");
    const idRow = db.prepare("SELECT last_insert_rowid()").value();
    const game = getGame(Number(idRow[0]));
    return Response.json(game, { status: 201 });
  }

  // DELETE /api/games/:id
  const deleteMatch = url.pathname.match(/^\/api\/games\/(\d+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const id = Number(deleteMatch[1]);
    const game = getGame(id);
    if (!game) return Response.json({ error: "Game not found." }, { status: 404 });
    db.prepare("DELETE FROM games WHERE id = ?").run(id);
    return Response.json({ success: true });
  }

  // Serve static files
  return serveDir(req, { fsRoot: ".", quiet: true });
});

console.log(`Server running at http://localhost:${PORT}`);
