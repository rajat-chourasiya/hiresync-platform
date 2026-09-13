const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "Type" } });

socket.on("connect", () => {
  console.log("✅ [Interviewer] Connected");
  socket.emit("room:join", { roomId: "Type", interviewId: "Type" }); 
});

socket.on("code:updated", (data) => {
  console.log("📝 [Interviewer sees]:", data.code, "| typed by:", data.editorName);
});

socket.on("presence:joined", (data) => console.log("👤 Joined:", data));
socket.on("error", (err) => console.log("❌ [Interviewer] Error:", err));