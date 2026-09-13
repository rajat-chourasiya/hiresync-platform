const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "Type" } });

socket.on("connect", () => {
  console.log("✅ [Interviewer] Connected to candidate channel");
  socket.emit("chat:join", { interviewId: "Type", channel: "candidate" }); 

  setTimeout(() => {
    socket.emit("chat:send", { message: "Hi! We'll start in 2 minutes." });
  }, 6000);
});

socket.on("chat:message", (msg) => console.log("📩 [Interviewer] received:", msg.message, "from", msg.senderId));
socket.on("error", (err) => console.log("❌ [Interviewer] Error:", err));