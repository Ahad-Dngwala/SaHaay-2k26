// Load environment variables first
require("dotenv").config();

const { server } = require("./app");
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚑 Ambulance Dispatch Backend running on port ${PORT}`);
  console.log(`📡 WebSocket server initialized`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || "development"}`);
});
