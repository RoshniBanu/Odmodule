const mongoose = require("mongoose");

const odRequestSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    classAdvisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    hod: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    department: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    eventName: {
      type: String,
      required: true,
    },
    eventDate: {
      type: Date,
      required: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    timeType: {
      type: String,
      enum: ["fullDay", "particularHours"],
      default: "fullDay",
    },
    startTime: {
      type: Date,
      required: function () {
        return this.timeType === "particularHours";
      },
    },
    endTime: {
      type: Date,
      required: function () {
        return this.timeType === "particularHours";
      },
    },
    reason: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved_by_advisor", "approved_by_hod", "rejected"],
      default: "pending",
    },
    advisorComment: {
      type: String,
      default: "",
    },
    hodComment: {
      type: String,
      default: "",
    },
    proofDocument: {
      type: String, // URL to the proof document
      default: null,
    },
    proofSubmitted: {
      type: Boolean,
      default: false,
    },
    proofVerified: {
      type: Boolean,
      default: false,
    },
    remarks: {
      type: String,
      default: "",
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

odRequestSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("ODRequest", odRequestSchema);
