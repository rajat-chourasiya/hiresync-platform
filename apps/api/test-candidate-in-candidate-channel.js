const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "Type" } });

socket.on("connect", () => {
  console.log("✅ [Candidate] Connected");
  socket.emit("chat:join", { interviewId: "Type", channel: "candidate" });

  setTimeout(() => {
    socket.emit("chat:send", { message: "Hi, I'm ready for the interview!" });
  }, 4000);
});

socket.on("chat:message", (msg) => console.log("📩 [Candidate] received:", msg.message, "from", msg.senderId));
socket.on("error", (err) => console.log("❌ [Candidate] Error:", err));