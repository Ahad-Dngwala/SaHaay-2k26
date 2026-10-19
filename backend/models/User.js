const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  phone: {
    type: String,
    required: true,
    unique: true, // Creates index automatically
    trim: true,
  },
  role: {
    type: String,
    enum: ["user", "driver", "admin"],
    default: "user",
  },
}, {
  timestamps: true,
});

// Index for role queries (phone already indexed by unique: true)
userSchema.index({ role: 1 });

module.exports = mongoose.model("User", userSchema);
