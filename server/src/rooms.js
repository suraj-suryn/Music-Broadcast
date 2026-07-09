const { v4: uuidv4 } = require('uuid');

const rooms = new Map();
const MAX_USERS = 20;

function generateCode() {
  return uuidv4().replace(/-/g, '').toUpperCase().slice(0, 6);
}

function createRoom(socket, hostName) {
  let code;
  do { code = generateCode(); } while (rooms.has(code));

  const host = { id: socket.id, name: hostName, isHost: true };
  const room = {
    code,
    originalHostName: hostName, // persists so host can be restored on rejoin
    users: [host],
    queue: [],
    currentSong: null,
    playing: false,
    repeat: false,
    queueMode: 'consume', // 'consume' = remove after play | 'cycle' = loop queue
    startedAt: null,
    playedSeconds: 0,
    voteSkips: new Set(),
    chat: [],
    history: [],   // songs played this session, most-recent last, capped at 100
    suggestions: [], // pending guest song suggestions, capped at 20
    coDjMode: false  // when true, all users can add directly to queue
  };
  rooms.set(code, room);
  return { room, user: host };
}

function joinRoom(code, socketId, name) {
  const room = rooms.get(code);
  if (!room) return { error: 'Room not found' };
  if (room.users.length >= MAX_USERS) return { error: 'Room is full' };

  // Restore original host if they rejoin with the same name (case-insensitive)
  const isRestoredHost =
    name.trim().toLowerCase() === room.originalHostName.toLowerCase();

  if (isRestoredHost) {
    // Demote whoever is currently acting as temp host
    room.users.forEach(u => { u.isHost = false; });
  }

  const user = { id: socketId, name, isHost: isRestoredHost };
  room.users.push(user);
  return { room, user, hostRestored: isRestoredHost };
}

function leaveRoom(socketId) {
  for (const [code, room] of rooms) {
    const idx = room.users.findIndex(u => u.id === socketId);
    if (idx === -1) continue;

    const wasHost = room.users[idx].isHost;
    room.users.splice(idx, 1);
    room.voteSkips.delete(socketId);

    if (room.users.length === 0) {
      rooms.delete(code);
      return { code, users: [], hostChanged: false };
    }

    if (wasHost) {
      room.users[0].isHost = true;
    }

    return { code, users: room.users, hostChanged: wasHost };
  }
  return null;
}

function getRoom(code) {
  return rooms.get(code) || null;
}

function getRoomBySocket(socketId) {
  for (const room of rooms.values()) {
    if (room.users.some(u => u.id === socketId)) return room;
  }
  return null;
}

function getCurrentTime(room) {
  if (!room.currentSong) return 0;
  if (!room.playing || !room.startedAt) return room.playedSeconds;
  return room.playedSeconds + (Date.now() - room.startedAt) / 1000;
}

function serializeRoom(room) {
  return {
    code: room.code,
    originalHostName: room.originalHostName,
    users: room.users,
    queue: room.queue,
    currentSong: room.currentSong,
    playing: room.playing,
    repeat: room.repeat,
    queueMode: room.queueMode,
    playedSeconds: room.playedSeconds,
    chat: room.chat,
    history: room.history || [],
    suggestions: room.suggestions || [],
    coDjMode: room.coDjMode || false,
    voteSkips: Array.from(room.voteSkips)
  };
}

module.exports = {
  createRoom,
  joinRoom,
  leaveRoom,
  getRoomBySocket,
  getCurrentTime,
  serializeRoom
};
