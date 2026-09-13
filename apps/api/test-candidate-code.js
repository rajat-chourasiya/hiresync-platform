const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "CANDIDATE1_TOKEN_HERE" } });

socket.on("connect", () => {
  console.log("✅ [Candidate 1] Connected");
  socket.emit("room:join", { roomId: "ROOM_ID_HERE", interviewId: "INTERVIEW_ID_HERE" });

  setTimeout(() => {
    socket.emit("code:snapshot", { language: "python", code: "print('Candidate 1 typing')" });
  }, 2000);
});

socket.on("code:updated", (data) => {
  console.log("📝 [Candidate 1] received code update:", data.code, "| editorName:", data.editorName);
});

socket.on("error", (err) => console.log("❌ [Candidate 1] Error:", err));