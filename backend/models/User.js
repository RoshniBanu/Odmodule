const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    registerNo: {
      type: String,
      required: function () {
        return this.role === "student";
      },
      unique: function() {
        return this.role === "student";
      },
    },
    password: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["student", "faculty", "hod", "admin"],
      required: true,
    },
    department: {
      type: String,
      required: function () {
        return ["student", "faculty", "hod"].includes(this.role);
      },
    },
    year: {
      type: String,
      required: function () {
        return this.role === "student";
      },
    },
    facultyAdvisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: function () {
        return this.role === "student";
      },
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
