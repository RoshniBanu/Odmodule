const nodemailer = require("nodemailer");
const path = require("path");
const fs = require("fs");
const Setting = require("../models/Setting");

// Helper to get sender email and password from DB or fallback to env
async function getSenderEmailAndPassword() {
  const emailSetting = await Setting.findOne({ key: "senderEmail" });
  const passwordSetting = await Setting.findOne({ key: "senderEmailPassword" });
  return {
    email: emailSetting?.value || process.env.EMAIL_USER,
    password: passwordSetting?.value || process.env.EMAIL_PASSWORD,
  };
}

// Helper to create transporter with dynamic sender
async function getTransporter() {
  const { email, password } = await getSenderEmailAndPassword();
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: email,
      pass: password,
    },
  });
}

// Function to send OD request notification to faculty advisor
const sendODRequestNotification = async (
  facultyEmail,
  studentDetails,
  odDetails
) => {
  try {
    const { email } = await getSenderEmailAndPassword();
    const transporter = await getTransporter();

    const mailOptions = {
      from: email,
      to: facultyEmail,
      subject: "New OD Request Submission",
      html: `
        <h2>New OD Request Submitted</h2>
        <p>A student has submitted a new OD request that requires your attention.</p>
        
        <h3>Student Details:</h3>
        <ul>
          <li><strong>Name:</strong> ${studentDetails.name}</li>
          <li><strong>Register Number:</strong> ${
            studentDetails.registerNo
          }</li>
          <li><strong>Department:</strong> ${studentDetails.department}</li>
          <li><strong>Year:</strong> ${studentDetails.year}</li>
        </ul>

        <h3>Event Details:</h3>
        <ul>
          <li><strong>Event Name:</strong> ${odDetails.eventName}</li>
          <li><strong>Event Type:</strong> ${odDetails.eventType}</li>
          <li><strong>Event Date:</strong> ${new Date(
            odDetails.eventDate
          ).toLocaleDateString()}</li>
          <li><strong>Start Date:</strong> ${new Date(
            odDetails.startDate
          ).toLocaleDateString()}</li>
          <li><strong>End Date:</strong> ${new Date(
            odDetails.endDate
          ).toLocaleDateString()}</li>
          <li><strong>Time Type:</strong> ${odDetails.timeType}</li>
          ${
            odDetails.timeType === "half-day"
              ? `
            <li><strong>Start Time:</strong> ${odDetails.startTime}</li>
            <li><strong>End Time:</strong> ${odDetails.endTime}</li>
          `
              : ""
          }
          <li><strong>Reason:</strong> ${odDetails.reason}</li>
        </ul>

        <p>Please review this request at your earliest convenience.</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("OD request notification email sent successfully");
  } catch (error) {
    console.error("Error sending OD request notification email:", error);
    throw error;
  }
};

// Function to send proof verification notification to multiple faculty members
const sendProofVerificationNotification = async (
  facultyEmails,
  studentDetails,
  odDetails,
  proofDocumentPath,
  approvedPDFPath
) => {
  if (!facultyEmails || facultyEmails.length === 0) {
    console.log("No faculty members to notify");
    return;
  }

  try {
    const { email } = await getSenderEmailAndPassword();
    const transporter = await getTransporter();

    const attachments = [];

    // Add student's proof document if it exists
    if (proofDocumentPath && fs.existsSync(path.resolve(proofDocumentPath))) {
      const proofExt = path.extname(proofDocumentPath).toLowerCase();
      attachments.push({
        filename: `student_proof${proofExt}`,
        path: path.resolve(proofDocumentPath),
      });
    }

    // Add approved PDF if it exists
    if (approvedPDFPath && fs.existsSync(path.resolve(approvedPDFPath))) {
      const approvedExt = path.extname(approvedPDFPath).toLowerCase();
      const approvedName = path.basename(approvedPDFPath, approvedExt);
      attachments.push({
        filename: `${approvedName}_approved_form${approvedExt}`,
        path: path.resolve(approvedPDFPath),
      });
    }

    const mailOptions = {
      from: email,
      to: facultyEmails.join(","),
      subject: "OD Request Proof Verification Notification",
      html: `
        <h2>OD Request Proof Verification Notification</h2>
        <p>A student's OD request proof has been verified.</p>
        
        <h3>Student Details:</h3>
        <p>Name: ${studentDetails.name}</p>
        <p>Register Number: ${studentDetails.registerNo}</p>
        <p>Department: ${studentDetails.department}</p>
        <p>Year: ${studentDetails.year}</p>
        
        <h3>Event Details:</h3>
        <p>Event Details:</p>
        <p>Event Name: ${odDetails.eventName}</p>
        <p>Event Type: ${odDetails.eventType}</p>
        <p>Event Date: ${new Date(odDetails.eventDate).toLocaleDateString()}</p>
        <p>Start Date: ${new Date(odDetails.startDate).toLocaleDateString()}</p>
        <p>End Date: ${new Date(odDetails.endDate).toLocaleDateString()}</p>
        ${
          odDetails.timeType === "particularHours"
            ? `
          <p>Start Time: ${odDetails.startTime}</p>
          <p>End Time: ${odDetails.endTime}</p>
        `
            : ""
        }
        <p>Reason: ${odDetails.reason}</p>
        
        <p>Please find attached:</p>
        <ul>
          <li>The student's submitted proof document</li>
          <li>The approved OD form with verification details</li>
        </ul>
      `,
      attachments,
    };

    await transporter.sendMail(mailOptions);
    console.log("Proof verification notification emails sent successfully");
  } catch (error) {
    console.error(
      "Error sending proof verification notification emails:",
      error
    );
    throw error;
  }
};

module.exports = {
  sendODRequestNotification,
  sendProofVerificationNotification,
};
