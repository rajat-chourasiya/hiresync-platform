const { io } = require("socket.io-client");

const socket = io("http://localhost:5000", { auth: { token: "Type" } });

socket.on("connect", () => {
  console.log("✅ [Interviewer 2] Connected");
  socket.emit("chat:join", { interviewId: "Type", channel: "candidate" });

  setTimeout(() => {
    socket.emit("chat:send", { message: "This is Interviewer 2 joining the discussion" });
  }, 8000);
});

socket.on("chat:message", (msg) => console.log("📩 [Interviewer 2] received:", msg.message, "from", msg.senderId));