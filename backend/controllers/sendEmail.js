
// const nodemailer = require("nodemailer");

// // Create a transporter object using the default SMTP transport
// const transporter = nodemailer.createTransport({
//     host: process.env.EMAIL_HOST,
//     port: process.env.EMAIL_PORT,
//     secure: process.env.SECURE === 'true', // true for 465, false for other ports
//     auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//     },
// });

// // Function to send email
// const sendEmail = (to, subject, text) => {
//     const mailOptions = {
//         from: `"MERN Travels" <${process.env.EMAIL_USER}>`, // Sender name and address
//         to: to, // list of receivers
//         subject: subject, // Subject line
//         text: text, // plain text body
//     };

//     return transporter.sendMail(mailOptions);
// };

// module.exports = sendEmail;
