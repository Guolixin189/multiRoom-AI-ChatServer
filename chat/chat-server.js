import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";
import "dotenv/config";

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};
const users = {};

io.on("connection", (socket) => {
  console.log("New connection:", socket.id);

  socket.on("login", (nickname) => {
    users[socket.id] = {
      nickname,
      currentRoom: null,
    };
    socket.emit("update_room_list", getRoomList());
  });

  socket.on("join_room", ({ roomName, password }) => {
    const user = users[socket.id];
    if (!user) return;

    const nickname = user.nickname;

    if (
      rooms[roomName] &&
      rooms[roomName].bannedNicknames.includes(nickname)
    ) {
      return socket.emit("error_msg", "You are banned from this room!");
    }

    if (
      rooms[roomName] &&
      rooms[roomName].password &&
      rooms[roomName].password !== password
    ) {
      return socket.emit("error_msg", "Wrong password!");
    }

    if (!rooms[roomName]) {
      rooms[roomName] = {
        password,
        creator: socket.id,
        bannedNicknames: [],
        history: [],
      };
    }

    const oldRoom = user.currentRoom;
    if (oldRoom) {
      socket.leave(oldRoom);
      user.currentRoom = null;
      updateUserList(oldRoom);
    }

    socket.join(roomName);
    user.currentRoom = roomName;

    socket.emit("join_success", roomName);

    // Send existing room history only to the user who just joined
    if (rooms[roomName].history.length > 0) {
      rooms[roomName].history.forEach((msg) => {
        socket.emit("message_to_client", msg);
      });
    }

    const joinMessage = {
      name: "System",
      message: `${nickname} joined the room.`,
    };

    io.to(roomName).emit("message_to_client", joinMessage);
    addToRoomHistory(roomName, joinMessage.name, joinMessage.message);

    updateUserList(roomName);
    io.emit("update_room_list", getRoomList());
  });

  socket.on("message_to_server", async (data) => {
    const user = users[socket.id];
    if (!user || !user.currentRoom) return;

    const room = user.currentRoom;
    const nickname = user.nickname;
    const text = data.message;

    io.to(room).emit("message_to_client", {
      name: nickname,
      message: text,
    });
    addToRoomHistory(room, nickname, text);

    if (text.startsWith("/agent")) {
      try {
        const promptText = text.replace("/agent", "").trim();
        if (!promptText) return;

        io.to(room).emit("user_typing", "AI Agent");

        if (!process.env.OPENROUTER_API_KEY) {
          console.error("AI Error: OPENROUTER_API_KEY is not set");
          socket.emit(
            "error_msg",
            "AI Error: missing API key — set OPENROUTER_API_KEY in the Render dashboard.",
          );
          return;
        }

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
            },
            body: JSON.stringify({
              model: process.env.OPENROUTER_MODEL || "qwen/qwen3.8-27b:free",
              messages: [{ role: "user", content: promptText }],
            }),
          },
        );

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          console.error(
            `AI Error: OpenRouter ${response.status} ${errBody.slice(0, 300)}`,
          );
          throw new Error(`AI_HTTP_${response.status}`);
        }

        const result = await response.json();
        const aiText = result.choices?.[0]?.message?.content?.trim();
        if (!aiText) {
          throw new Error("AI No Response");
        }

        io.to(room).emit("user_stop_typing", "AI Agent");

        io.to(room).emit("message_to_client", {
          name: "AI Agent",
          message: aiText,
        });
        addToRoomHistory(room, "AI Agent", aiText);
      } catch (err) {
        console.error("AI Error:", err);
        io.to(room).emit("user_stop_typing", "AI Agent");
        const m = /^AI_HTTP_(\d+)$/.exec(err.message);
        socket.emit(
          "error_msg",
          m
            ? `AI Error: AI service unavailable (OpenRouter ${m[1]}).`
            : "AI Error: AI service unavailable.",
        );
      }
    }
  });

  socket.on("private_message", ({ targetId, message }) => {
    const sender = users[socket.id];
    const target = users[targetId];

    if (sender && target && sender.currentRoom === target.currentRoom) {
      socket.to(targetId).emit("message_to_client", {
        name: `[Private from ${sender.nickname}]`,
        message,
      });

      socket.emit("message_to_client", {
        name: `[Private to ${target.nickname}]`,
        message,
      });
    } else {
      socket.emit(
        "error_msg",
        "Cannot send private message. User might have left.",
      );
    }
  });

  socket.on("kick_user", (targetId) => {
    const sender = users[socket.id];
    if (!sender || !sender.currentRoom) return;

    const room = sender.currentRoom;
    if (!rooms[room] || rooms[room].creator !== socket.id) return;

    const targetSocket = io.sockets.sockets.get(targetId);
    const targetUser = users[targetId];

    if (
      targetSocket &&
      targetUser &&
      targetUser.currentRoom === room &&
      targetId !== socket.id
    ) {
      targetSocket.leave(room);
      targetUser.currentRoom = null;
      targetSocket.emit("kicked_out", "You were kicked out of the room.");
      updateUserList(room);
      io.emit("update_room_list", getRoomList());
    }
  });

  socket.on("ban_user", (targetId) => {
    const sender = users[socket.id];
    if (!sender || !sender.currentRoom) return;

    const room = sender.currentRoom;
    if (!rooms[room] || rooms[room].creator !== socket.id) return;

    const targetUser = users[targetId];
    const targetSocket = io.sockets.sockets.get(targetId);

    if (
      targetUser &&
      targetUser.currentRoom === room &&
      targetId !== socket.id
    ) {
      if (!rooms[room].bannedNicknames.includes(targetUser.nickname)) {
        rooms[room].bannedNicknames.push(targetUser.nickname);
      }

      if (targetSocket) {
        targetSocket.leave(room);
        targetUser.currentRoom = null;
        targetSocket.emit("kicked_out", "You are permanently banned.");
      }

      updateUserList(room);
      io.emit("update_room_list", getRoomList());
    }
  });

  socket.on("leave_room", () => {
    const user = users[socket.id];
    if (!user || !user.currentRoom) return;

    const room = user.currentRoom;
    const nickname = user.nickname;

    socket.leave(room);
    user.currentRoom = null;

    const leaveMessage = {
      name: "System",
      message: `${nickname} left the room.`,
    };

    io.to(room).emit("message_to_client", leaveMessage);
    addToRoomHistory(room, leaveMessage.name, leaveMessage.message);

    updateUserList(room);
    io.emit("update_room_list", getRoomList());
  });

  socket.on("typing", () => {
    const user = users[socket.id];
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit("user_typing", user.nickname);
    }
  });

  socket.on("stop_typing", () => {
    const user = users[socket.id];
    if (user && user.currentRoom) {
      socket.to(user.currentRoom).emit("user_stop_typing", user.nickname);
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (!user) return;

    const room = user.currentRoom;
    const nickname = user.nickname;

    delete users[socket.id];

    if (room) {
      const disconnectMessage = {
        name: "System",
        message: `${nickname} disconnected.`,
      };

      io.to(room).emit("message_to_client", disconnectMessage);
      addToRoomHistory(room, disconnectMessage.name, disconnectMessage.message);

      updateUserList(room);
      io.emit("update_room_list", getRoomList());
    }
  });
});

function addToRoomHistory(roomName, name, message) {
  if (!rooms[roomName]) return;

  rooms[roomName].history.push({ name, message });

  if (rooms[roomName].history.length > 20) {
    rooms[roomName].history.shift();
  }
}

function updateUserList(roomName) {
  const clients = io.sockets.adapter.rooms.get(roomName);
  const userList = [];

  if (clients) {
    clients.forEach((id) => {
      if (users[id]) {
        userList.push({ id, name: users[id].nickname });
      }
    });
  }

  io.to(roomName).emit("update_user_list", {
    users: userList,
    creatorId: rooms[roomName] ? rooms[roomName].creator : null,
  });
}

function getRoomList() {
  return Object.keys(rooms).map((roomName) => {
    return {
      name: roomName,
      hasPassword: !!rooms[roomName].password,
    };
  });
}

const PORT = process.env.PORT || 3457;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));