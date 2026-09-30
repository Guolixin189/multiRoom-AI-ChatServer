const socket = io();
const typingIndicator = document.getElementById("typing-indicator");
const messageInput = document.getElementById("message_input");

let typingTimer;
const typingInterval = 1500;
let typers = [];

function showScreen(screenId) {
  ["login-screen", "lobby-screen", "chat-screen"].forEach((id) => {
    document.getElementById(id).style.display =
      id === screenId ? "block" : "none";
  });
}

function clearTypingState() {
  typers = [];
  updateTypingDisplay();
  clearTimeout(typingTimer);
  socket.emit("stop_typing");
}

function sendCurrentMessage() {
  const msg = messageInput.value.trim();
  if (!msg) return;

  socket.emit("message_to_server", { message: msg });
  messageInput.value = "";
  clearTimeout(typingTimer);
  socket.emit("stop_typing");
}

document.getElementById("enter_btn").onclick = () => {
  const name = document.getElementById("nickname_input").value.trim();
  if (!name) return;

  socket.emit("login", name);
  document.getElementById("display-username").innerText = name;
  document.getElementById("user-status-bar").style.display = "block";
  showScreen("lobby-screen");
};

document.getElementById("logout_btn").onclick = () => {
  if (confirm("Logout and return to login screen?")) {
    location.reload();
  }
};

document.getElementById("create_room_btn").onclick = () => {
  const roomName = document.getElementById("new_room_name").value.trim();
  const password = document.getElementById("room_password").value;

  if (!roomName) return;
  socket.emit("join_room", { roomName, password });
};

socket.on("join_success", (roomName) => {
  document.getElementById("current-room-title").innerText = "Room: " + roomName;
  document.getElementById("chatlog").innerHTML = "";
  clearTypingState();
  showScreen("chat-screen");
});

socket.on("update_room_list", (roomDataList) => {
  const list = document.getElementById("room-list");
  list.innerHTML = "";

  roomDataList.forEach((room) => {
    const item = document.createElement("div");
    item.className = "room-item";

    const label = document.createElement("span");
    const strong = document.createElement("b");
    strong.textContent = room.name;
    label.appendChild(strong);

    if (room.hasPassword) {
      label.appendChild(document.createTextNode(" 🔒"));
    }

    const joinBtn = document.createElement("button");
    joinBtn.textContent = "Join Room";
    joinBtn.addEventListener("click", () => {
      handleJoin(room.name, room.hasPassword);
    });

    item.appendChild(label);
    item.appendChild(joinBtn);
    list.appendChild(item);
  });
});

function handleJoin(name, hasPassword) {
  let pwd = "";
  if (hasPassword) {
    pwd = prompt(`Room "${name}" requires a password:`);
    if (pwd === null) return;
  }

  socket.emit("join_room", { roomName: name, password: pwd });
}

socket.on("update_user_list", (data) => {
  const list = document.getElementById("user-list");
  list.innerHTML = "";

  data.users.forEach((user) => {
    const li = document.createElement("li");
    const isMe = user.id === socket.id;
    const isCreator = user.id === data.creatorId;

    const label = document.createElement("span");
    let text = user.name;
    if (isCreator) text += " 👑";
    if (isMe) text += " (You)";
    label.textContent = text;
    li.appendChild(label);

    if (!isMe) {
      const dmBtn = document.createElement("button");
      dmBtn.innerText = "DM";
      dmBtn.style.marginLeft = "10px";
      dmBtn.style.backgroundColor = "#17a2b8";
      dmBtn.style.color = "white";
      dmBtn.onclick = () => {
        const msg = prompt(`Send private message to ${user.name}:`);
        const cleanMsg = msg ? msg.trim() : "";
        if (cleanMsg) {
          socket.emit("private_message", {
            targetId: user.id,
            message: cleanMsg,
          });
        }
      };
      li.appendChild(dmBtn);
    }

    if (socket.id === data.creatorId && !isMe) {
      const kBtn = document.createElement("button");
      kBtn.innerText = "Kick";
      kBtn.style.marginLeft = "5px";
      kBtn.onclick = () => socket.emit("kick_user", user.id);

      const bBtn = document.createElement("button");
      bBtn.innerText = "Ban";
      bBtn.style.marginLeft = "5px";
      bBtn.onclick = () => socket.emit("ban_user", user.id);

      li.appendChild(kBtn);
      li.appendChild(bBtn);
    }

    list.appendChild(li);
  });
});

document.getElementById("send_btn").onclick = sendCurrentMessage;

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    sendCurrentMessage();
  }
});

socket.on("message_to_client", (data) => {
  const log = document.getElementById("chatlog");
  const div = document.createElement("div");
  div.className = "message";

  if (data.name === "System") {
    div.classList.add("system-msg");
  } else if (data.name === "AI Agent") {
    div.classList.add("agent-msg");
  }

  const namePart = document.createElement("b");
  namePart.textContent = `${data.name}: `;
  div.appendChild(namePart);
  div.appendChild(document.createTextNode(data.message));

  log.appendChild(div);
  log.scrollTop = log.scrollHeight;
});

document.getElementById("leave_btn").onclick = () => {
  socket.emit("leave_room");
  clearTypingState();
  showScreen("lobby-screen");
};

socket.on("error_msg", (msg) => alert(msg));

socket.on("kicked_out", (reason) => {
  alert(reason || "You were kicked!");
  clearTypingState();
  showScreen("lobby-screen");
});

messageInput.addEventListener("input", () => {
  const msg = messageInput.value.trim();

  if (msg !== "") {
    socket.emit("typing");
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => {
      socket.emit("stop_typing");
    }, typingInterval);
  } else {
    socket.emit("stop_typing");
  }
});

socket.on("user_typing", (name) => {
  if (!typers.includes(name)) {
    typers.push(name);
    updateTypingDisplay();
  }
});

socket.on("user_stop_typing", (name) => {
  typers = typers.filter((u) => u !== name);
  updateTypingDisplay();
});

function updateTypingDisplay() {
  if (typers.length === 0) {
    typingIndicator.innerText = "";
  } else if (typers.length === 1) {
    typingIndicator.innerText = `${typers[0]} is typing...`;
  } else {
    typingIndicator.innerText = "Several people are typing...";
  }
}