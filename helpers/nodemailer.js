const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
    service: process.env.NODEMAILER_SERVICE,
    auth: {
        user: process.env.NODEMAILER_AUTH_USER, pass: process.env.NODEMAILER_AUTH_PASS
    },
})

module.exports = transporter