import nodemailer from "nodemailer";
// Create a transporter using SMTP
export const transporter = nodemailer.createTransport({
  service: "gmail", // use STARTTLS (upgrade connection to TLS after connecting)
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});
transporter.verify((error, success) => {
  if (error) {
    console.log(error);
  } else {
    console.log("SMTP Ready");
  }
});