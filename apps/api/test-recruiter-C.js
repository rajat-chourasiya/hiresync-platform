const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "Type" } });

socket.on("connect", () => {
  console.log("✅ [C-Recruiter] Connected");
  socket.emit("chat:join", { interviewId: "Type", channel: "interviewer" });

  setTimeout(() => {
    socket.emit("chat:send", { message: "Message from Recruiter C" });
  }, 6000); 
});

socket.on("chat:message", (msg) => console.log("📩 [C-Recruiter] received:", msg.message, "from", msg.senderId));
socket.on("error", (err) => console.log("❌ [C-Recruiter] Error:", err));