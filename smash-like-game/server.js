const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = __dirname;
const port = process.env.PORT || 3000;
const publicUrlFile = path.join(root, "public-url.json");
const rooms = new Map();

const ROOM_TTL_MS = 1000 * 60 * 30;
const MAX_COMMAND_HISTORY = 180;
const INPUT_KEYS = ["left", "right", "jump", "fall", "dash", "shield"];
const VALID_CHARACTER_KEYS = new Set(["fighter", "swordsman", "gunner"]);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8"
};

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload));
}

function sendError(response, statusCode, message) {
  sendJson(response, statusCode, { ok: false, error: message });
}

function sendFile(filePath, response) {
  fs.readFile(filePath, (error, data) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }

    const extension = path.extname(filePath).toLowerCase();
    response.writeHead(200, {
      "Content-Type": mimeTypes[extension] || "application/octet-stream"
    });
    response.end(data);
  });
}

function readPublicUrl() {
  if (process.env.PUBLIC_SHARE_URL) {
    return process.env.PUBLIC_SHARE_URL;
  }

  try {
    const raw = fs.readFileSync(publicUrlFile, "utf8");
    const parsed = JSON.parse(raw);
    return typeof parsed.url === "string" ? parsed.url : null;
  } catch (error) {
    return null;
  }
}

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        request.destroy();
      }
    });

    request.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });

    request.on("error", reject);
  });
}

function normalizeRoomCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 6);
}

function randomId(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString("hex").slice(0, length);
}

function sanitizeCharacterKey(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase();
  return VALID_CHARACTER_KEYS.has(key) ? key : null;
}

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return code;
}

function createEmptyInput() {
  return { left: false, right: false, jump: false, fall: false, dash: false, shield: false };
}

function sanitizeInput(input) {
  const next = createEmptyInput();
  if (!input || typeof input !== "object") {
    return next;
  }

  for (const key of INPUT_KEYS) {
    next[key] = Boolean(input[key]);
  }

  return next;
}

function sanitizeCommand(command) {
  if (!command || typeof command !== "object") {
    return null;
  }

  const type = String(command.type || "");
  if (!["attack", "special", "grab", "rematch"].includes(type)) {
    return null;
  }

  const next = { type };
  if (typeof command.moveKey === "string") {
    next.moveKey = command.moveKey;
  }
  return next;
}

function clone(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function cleanupRooms() {
  const now = Date.now();
  for (const [code, room] of rooms.entries()) {
    if (now - room.updatedAt > ROOM_TTL_MS) {
      rooms.delete(code);
    }
  }
}

function createRoom(lobby) {
  let code = generateRoomCode();
  while (rooms.has(code)) {
    code = generateRoomCode();
  }

  const room = {
    code,
    hostToken: randomId(24),
    guestToken: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    started: false,
    lobby: clone(lobby) || null,
    guestInput: createEmptyInput(),
    guestCommands: [],
    guestCommandRevision: 0,
    snapshot: null,
    snapshotRevision: 0
  };

  rooms.set(code, room);
  return room;
}

function getRoomOrError(roomCode) {
  const room = rooms.get(normalizeRoomCode(roomCode));
  return room || null;
}

function getRoleForToken(room, token) {
  if (!room || !token) {
    return null;
  }
  if (token === room.hostToken) {
    return "host";
  }
  if (token === room.guestToken) {
    return "guest";
  }
  return null;
}

function touchRoom(room) {
  room.updatedAt = Date.now();
}

function buildStatusPayload(room, role, snapshotRevision, commandRevision) {
  const payload = {
    ok: true,
    role,
    roomCode: room.code,
    guestConnected: Boolean(room.guestToken),
    started: room.started,
    lobby: clone(room.lobby),
    snapshotRevision: room.snapshotRevision,
    commandRevision: room.guestCommandRevision
  };

  if (role === "host") {
    payload.guestInput = clone(room.guestInput);
    if (room.guestCommandRevision > commandRevision) {
      payload.commands = room.guestCommands.filter((entry) => entry.revision > commandRevision);
    } else {
      payload.commands = [];
    }
  } else if (role === "guest" && room.snapshotRevision > snapshotRevision) {
    payload.snapshot = clone(room.snapshot);
  }

  return payload;
}

async function handleApi(request, response, pathname, url) {
  if (request.method === "POST" && pathname === "/api/online/create") {
    const body = await readJson(request);
    const room = createRoom(body.lobby || null);
    sendJson(response, 200, {
      ok: true,
      role: "host",
      roomCode: room.code,
      token: room.hostToken,
      guestConnected: false
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/join") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);

    if (!room) {
      sendError(response, 404, "Room not found");
      return true;
    }
    if (room.guestToken) {
      sendError(response, 409, "Room already has two players");
      return true;
    }

    room.guestToken = randomId(24);
    touchRoom(room);

    sendJson(response, 200, {
      ok: true,
      role: "guest",
      roomCode: room.code,
      token: room.guestToken,
      started: room.started,
      lobby: clone(room.lobby)
    });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/lobby") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);
    const role = getRoleForToken(room, body.token);

    if (!room || !role) {
      sendError(response, 403, "Room access required");
      return true;
    }
    if (room.started) {
      sendError(response, 409, "Match already started");
      return true;
    }

    if (role === "host") {
      room.lobby = clone(body.lobby) || null;
      touchRoom(room);
      sendJson(response, 200, { ok: true, lobby: clone(room.lobby) });
      return true;
    }

    const guestCharacter = sanitizeCharacterKey(body.selection && body.selection.p2);
    if (!guestCharacter) {
      sendError(response, 400, "Valid guest character required");
      return true;
    }

    room.lobby = room.lobby || { config: null, selection: {} };
    room.lobby.selection = {
      ...(room.lobby.selection || {}),
      p2: guestCharacter
    };
    touchRoom(room);
    sendJson(response, 200, { ok: true, lobby: clone(room.lobby) });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/start") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);
    const role = getRoleForToken(room, body.token);

    if (!room || role !== "host") {
      sendError(response, 403, "Host room access required");
      return true;
    }

    room.started = true;
    room.lobby = clone(body.lobby) || room.lobby;
    room.guestCommands = [];
    room.guestCommandRevision = 0;
    room.snapshot = null;
    room.snapshotRevision = 0;
    room.guestInput = createEmptyInput();
    touchRoom(room);
    sendJson(response, 200, { ok: true, started: true });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/input") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);
    const role = getRoleForToken(room, body.token);

    if (!room || role !== "guest") {
      sendError(response, 403, "Guest room access required");
      return true;
    }

    room.guestInput = sanitizeInput(body.input);
    touchRoom(room);
    sendJson(response, 200, { ok: true });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/command") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);
    const role = getRoleForToken(room, body.token);
    const command = sanitizeCommand(body.command);

    if (!room || role !== "guest") {
      sendError(response, 403, "Guest room access required");
      return true;
    }
    if (!command) {
      sendError(response, 400, "Unsupported command");
      return true;
    }

    room.guestCommandRevision += 1;
    room.guestCommands.push({
      revision: room.guestCommandRevision,
      ...command
    });

    if (room.guestCommands.length > MAX_COMMAND_HISTORY) {
      room.guestCommands.splice(0, room.guestCommands.length - MAX_COMMAND_HISTORY);
    }

    touchRoom(room);
    sendJson(response, 200, { ok: true, revision: room.guestCommandRevision });
    return true;
  }

  if (request.method === "POST" && pathname === "/api/online/snapshot") {
    const body = await readJson(request);
    const room = getRoomOrError(body.roomCode);
    const role = getRoleForToken(room, body.token);

    if (!room || role !== "host") {
      sendError(response, 403, "Host room access required");
      return true;
    }

    room.snapshot = clone(body.snapshot) || null;
    room.snapshotRevision += 1;
    touchRoom(room);
    sendJson(response, 200, { ok: true, revision: room.snapshotRevision });
    return true;
  }

  if (request.method === "GET" && pathname === "/api/online/status") {
    const room = getRoomOrError(url.searchParams.get("roomCode"));
    const token = String(url.searchParams.get("token") || "");
    const snapshotRevision = Number(url.searchParams.get("snapshotRevision") || 0);
    const commandRevision = Number(url.searchParams.get("commandRevision") || 0);
    const role = getRoleForToken(room, token);

    if (!room || !role) {
      sendError(response, 404, "Room not found");
      return true;
    }

    touchRoom(room);
    sendJson(response, 200, buildStatusPayload(room, role, snapshotRevision, commandRevision));
    return true;
  }

  if (request.method === "GET" && pathname === "/api/online/public-url") {
    sendJson(response, 200, { ok: true, url: readPublicUrl() });
    return true;
  }

  return false;
}

const cleanupTimer = setInterval(cleanupRooms, 60 * 1000);
if (typeof cleanupTimer.unref === "function") {
  cleanupTimer.unref();
}

http
  .createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      const pathname = url.pathname;

      if (pathname.startsWith("/api/")) {
        const handled = await handleApi(request, response, pathname, url);
        if (!handled) {
          sendError(response, 404, "API route not found");
        }
        return;
      }

      const requestedPath = pathname === "/" ? "/index.html" : pathname;
      const safePath = path.normalize(path.join(root, requestedPath));

      if (!safePath.startsWith(root)) {
        response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
        response.end("Forbidden");
        return;
      }

      sendFile(safePath, response);
    } catch (error) {
      sendError(response, 500, error.message || "Server error");
    }
  })
  .listen(port, () => {
    console.log(`Smash Style Arena server running at http://localhost:${port}`);
  });
