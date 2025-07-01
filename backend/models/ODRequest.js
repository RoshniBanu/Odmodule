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
    eventType: {
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
      enum: [
        "pending",
        "approved_by_advisor",
        "approved_by_hod",
        "rejected",
        "forwarded_to_admin",
        "forwarded_to_hod",
      ],
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
    odLetterPath: {
      type: String, // Path to the generated OD letter PDF
      default: null,
    },
    approvedPDFPath: {
      type: String, // Path to the approved PDF (for download and email)
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
    forwardedToAdminAt: {
      type: Date,
      default: null,
    },
    forwardedToHodAt: {
      type: Date,
      default: null,
    },
    lastStatusChangeAt: {
      type: Date,
      default: Date.now,
    },
    facultyAdvisor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    facultyAdvisorComment: {
      type: String,
      default: "",
    },
    proofVerifiedAt: {
      type: Date,
    },
    proofVerifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    notifyFaculty: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
    brochure: {
      type: String, // Path to the uploaded event brochure
      default: null,
    },
    advisorApprovedAt: {
      type: Date,
      default: null,
    },
    hodApprovedAt: {
      type: Date,
      default: null,
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
