const { io } = require("socket.io-client");

const INTERVIEWER_TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZjQ5ZDQzZC1kOTlmLTQzMDItOWQ0My1lNGE4ZDk1NWQ2MTUiLCJvcmdJZCI6Ijk5NGI4NDM5LTI5YWEtNDI5Ny1iNWEyLTRjMjYwMTFiZTAyNSIsInJvbGUiOiJpbnRlcnZpZXdlciIsInRva2VuVmVyc2lvbiI6MCwiaWF0IjoxNzg5OTI4NDI4LCJleHAiOjE3ODk5MzIwMjh9.sdg5r-gT_xW7sd0KG8Loc13l6iSkEiHDt5GczvjE5QI";
const INTERVIEW_ID = "0d8960cf-36d5-4cfa-b77a-1dd5993b5dcc";
const CANDIDATE_ID = "d446302f-35a1-4966-98eb-be9e5eef4873";

const socket = io("http://localhost:5000", {
  auth: { token: INTERVIEWER_TOKEN },
});

socket.on("connect", () => {
  console.log("✅ Connected, socket id:", socket.id);

  setTimeout(() => {
    console.log("📤 Asking copilot...");
    socket.emit("copilot:ask", {
      interviewId: INTERVIEW_ID,
      candidateId: CANDIDATE_ID,
      question: "candidate ne React Context explain kiya but cleanup ka mention nahi kiya, give me a follow-up question",
    });
  }, 1000);
});

socket.on("copilot:response", (data) => {
  console.log("🤖 Copilot response:", data.answer);
});

socket.on("error", (err) => {
  console.log("❌ Error:", err);
});

socket.on("connect_error", (err) => {
  console.log("❌ Connect error:", err.message);
});