const express = require("express");
const socketIo = require("socket.io");
const http = require("http");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, "public")));
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const messages = {
  "sala-geral": [],
  "sala-tecnologia": [],
  "sala-jogos": [],
  "sala-musica": [],
};

io.on("connection", (socket) => {
  // Entrar na sala
  socket.on("join-room", (data) => {
    const { room, username } = data;

    // Sair de todas as salas anteriores
    socket.rooms.forEach((room) => {
      if (room !== socket.id) socket.leave(room);
    });

    socket.join(room);
    socket.currentRoom = room;
    socket.username = username;

    socket.to(room).emit("user-joined", {
      message: `${username} entrou na sala`,
      time: new Date().toLocaleTimeString(),
    });

    socket.emit("room-joined", {
      room: room,
      message: `Você entrou na sala: ${room}`,
      time: new Date().toLocaleTimeString(),
    });

    socket.emit("chat-history", {
      room: room,
      messages: messages[room] || [],
    });
  });

  // Envio de mensagem
  socket.on("chat-message", (data) => {
    if (socket.currentRoom) {
      messages[socket.currentRoom].push({
        user: data.user,
        message: data.message,
        time: data.time,
      });

      io.to(socket.currentRoom).emit("chat-message", {
        user: data.user,
        message: data.message,
        time: data.time,
        room: socket.currentRoom,
      });
    } else {
      socket.emit("error-message", {
        message: "Você precisa entrar em uma sala primeiro!",
        time: new Date().toLocaleTimeString(),
      });
    }
  });

  socket.on("disconnect", () => {
    if (socket.currentRoom && socket.username) {
      socket.to(socket.currentRoom).emit("user left", {
        message: `${socket.username} saiu da sala`,
        time: new Date().toLocaleTimeString(),
      });
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor rodando na porta 3000");
});
