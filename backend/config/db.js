const mongoose = require("mongoose");
const { MONGODB_URI } = require("./env");

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    console.error("💡 Tip: Ensure MongoDB is installed and running (`mongod` command)");
    console.error("💡 Tip: Check your MONGODB_URI in the .env file");
    // Don't exit immediately, let the user see the tips
    setTimeout(() => process.exit(1), 5000);
  });

mongoose.connection.on("disconnected", () => {
  console.log("⚠️  MongoDB disconnected");
});

mongoose.connection.on("error", (err) => {
  console.error("❌ MongoDB error:", err);
});

module.exports = mongoose;
