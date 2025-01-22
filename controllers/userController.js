const { db, query } = require('../database')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const nodemailer = require('../helpers/nodemailer')
const DOMAIN_USED = `http://localhost:${process.env.FRONTEND_PORT}`

module.exports = {
    registerUser: async (req, res) => {
        console.log(req.body);
        const { username, email, password } = req.body

        const getEmailQuery = `SELECT * FROM users WHERE email=${db.escape(email)}`
        let isEmailExist = await query(getEmailQuery)
        if (isEmailExist.length > 0) {
            return res.status(200).send({ message: 'Email has been used' })
        }

        const salt = await bcrypt.genSalt(10)
        const hashPassword = await bcrypt.hash(password, salt)

        const addUserQuery = `
        INSERT INTO users 
        VALUES (
            null, 
            ${db.escape(username)}, 
            ${db.escape(email)}, 
            ${db.escape(hashPassword)}, 
            "Default Name", 
            null, 
            null, 
            null,
            0
            )`;
        let addUserResult = await query(addUserQuery);

        let payload = { id: addUserResult.insertId };
        const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn: '4h' });

        const mail = {
            from: `Admin`,
            to: `${email}`,
            subject: `Verfied your account`,
            html: `
            <div>
            <p>Your registration is received, just one more step, verify your account by clicking the link below,</p>
            <a href="${DOMAIN_USED}/users/verification/${token}">Click Here</a>
            </div>
            `,
        };
        let response = await nodemailer.sendMail(mail);
        console.log(response);


        return res.status(200).send({ data: addUserResult, message: 'User registration received' });

    },
    loginUser: async (req, res) => {
        try {
            const { email, username, password } = req.body;
            let isAccountExist = false;
            let invalidMessageType = 'Email';
            console.log(email);
            if (email) {
                isAccountExist = await query(`
                    SELECT * 
                    FROM users 
                    WHERE email=${db.escape(email)}
                `);
                invalidMessageType = 'Email';
            } else {
                isAccountExist = await query(`
                    SELECT * 
                    FROM users 
                    WHERE username=${db.escape(username)}
                `);
                invalidMessageType = 'Username';
            }
            if (isAccountExist.length == 0) {
                return res.status(200).send({ message: `${invalidMessageType} or Password is Invalid`, success: false });
            }

            const isValid = await bcrypt.compare(password, isAccountExist[0].password);

            if (!isValid) {
                return res.status(200).send({ message: `${invalidMessageType} or Password is incorrect`, success: false });
            }


            let payload = { id: isAccountExist[0].id, email: isAccountExist[0].email };

            const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn: '1h' });
            console.log(isAccountExist[0]);
            return res.status(200).send({
                message: 'Login Success', token,
                data: {
                    id: isAccountExist[0].id,
                    username: isAccountExist[0].username,
                    email: isAccountExist[0].email,
                    fullname: isAccountExist[0].fullname,
                    bio: isAccountExist[0].bio,
                    profile_picture_url: isAccountExist[0].profile_picture_url,
                    is_verified: isAccountExist[0].is_verified,
                }, success: true
            });

        } catch (error) {
            res.status(error.status || 500).send(error);
        }


    },
    fetchUser: async (req, res) => {
        try {
            const idParams = parseInt(req.params.id);
            // if (req.user.id !== idParams) {
            //     return res.status(400).send('BAD REQUEST');
            // }
            const users = await query(`
                SELECT * 
                FROM users 
                WHERE id = ${db.escape(idParams)}
            `);
            return res.status(200).send(users);

        } catch (error) {
            res.status(error.status || 500).send(error);
        }
    },
    editUserInfo: async (req, res) => {
        try {
            const userIdToEdit = req.params.id;
            const { username, fullname, bio } = req.body;
            const profile_picture_url = req.file ? '/' + req.file.filename : null;
            console.log(profile_picture_url);
            console.log(userIdToEdit);
            console.log(req.body.data);
            console.log(bio);
            if (username) {
                const usernameIsUnique = await query(`
                SELECT id
                FROM users
                WHERE username = ${db.escape(username)}
                `);
                console.log('usernameUnique = ' + usernameIsUnique.length);
                if (usernameIsUnique.length != 0) {
                    res.status(200).send({
                        code: 200,
                        message: 'profile update canceled. username used must be unique'
                    })
                }
            }

            const profileEditQuery = `
            UPDATE users
            SET
            ${username ? 'username = ' + db.escape(username) : ''}
            ${fullname && username ? ',' : ''}
            ${fullname ? 'fullname = ' + db.escape(fullname) : ''}
            ${bio && fullname ? ',' : ''}
            ${bio ? 'bio = ' + db.escape(bio) : ''}
            ${profile_picture_url && bio ? ',' : ''}
            ${profile_picture_url ? 'profile_picture_url = ' + db.escape(profile_picture_url) : ''}
            WHERE id = ${db.escape(userIdToEdit)}
            `;
            console.log(profileEditQuery);
            const profileEditResult = await query(profileEditQuery);
            res.status(200).send({
                code: 200,
                message: 'profile is updated',
                result: profileEditResult
            })
        } catch (error) {
            res.status(error.status || 500).send(error);
        }
    },
    resetPasswordRequest: async (req, res) => {
        const { email } = req.body;
        const getEmailQuery = `SELECT * FROM users WHERE email=${db.escape(email)}`
        let isEmailExist = await query(getEmailQuery)
        if (isEmailExist.length <= 0) {
            return res.status(200).send({ message: 'Email is not registered' });
        }
        let payload = { id: isEmailExist[0].id };
        const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn: '4h' });
        const mail = {
            from: `Admin`,
            to: `${email}`,
            subject: `Reset Password Link`,
            html: `
            <div>
            <p>Your reset password request is received, if you're the one who made this request, please click on the link below,</p>
            <a href="${DOMAIN_USED}/users/reset-password/${token}">Click Here</a>
            </div>
            `,
        };
        let response = await nodemailer.sendMail(mail);
        console.log(response);
        const storeToken = await query(`
        UPDATE users
        SET
        ${token ? 'forgot_password_token = ' + db.escape(token) : ''}
        WHERE id = ${db.escape(isEmailExist[0].id)}
        `);
        console.log(storeToken);
        return res.status(200).send({ data: response, message: 'User registration received' });

    },
    resetPasswordRequestVerification: async (req, res) => {
        try {
            const id = req.user.id;
            const token = req.token
            const checkTokenValidity = await query(`
                SELECT *
                FROM users
                WHERE forgot_password_token = ${db.escape(token)}
            `)
            console.log(checkTokenValidity);
            if (checkTokenValidity.length <= 0) {
                res.status(401).send({
                    code: 401,
                    message: 'TOKEN INVALID'
                })
            }
            res.status(200).send({
                code: 200,
                success: true,
                message: 'token is valid'
            });
        } catch (error) {
            res.status(500).send(error);
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { password } = req.body
            const userId = req.user.id;
            const getEmailQuery = `SELECT * FROM users WHERE id=${db.escape(userId)}`
            let isUserExist = await query(getEmailQuery)
            if (isUserExist.length <= 0) {
                return res.status(200).send({
                    code: 200,
                    message: 'no email registered'
                })
            }
            const salt = await bcrypt.genSalt(10)
            const hashPassword = await bcrypt.hash(password, salt)
            const passwordResetQuery = `
                UPDATE users
                SET
                ${hashPassword ? 'password = ' + db.escape(hashPassword) : ''}
                WHERE id = ${db.escape(isUserExist[0].id)}
                `;
            const passwordResetResult = await query(passwordResetQuery);
            if (passwordResetResult) {
                const removeToken = await query(`
                UPDATE users
                SET
                forgot_password_token = null
                WHERE id = ${db.escape(userId)}
                `);
                console.log(removeToken);
            }
            res.status(202).send({
                code: 202,
                message: 'password successfuly resetted',
                success: true,
                result: passwordResetResult
            })
        } catch (error) {
            res.status(500).send(error);
        }
    },
    checkUsernameUnique: async (req, res) => {
        try {
            const usernameToBeChecked = req.params.usernameToBeChecked;
            console.log(usernameToBeChecked);
            const isUnique = await query(`
                SELECT id
                FROM users
                WHERE username = ${db.escape(usernameToBeChecked)}
            `);
            console.log(isUnique.length);
            res.status(200).send({
                code: 200,
                message: `username is ${isUnique == 0 ? 'unique' : 'not unique'}`,
                isUnique: isUnique == 0 ? true : false
            });
        } catch (error) {
            res.status(500).send(error);
        }
    },
    checkLogin: async (req, res) => {
        try {
            const users = await query(`
                SELECT * 
                FROM users 
                WHERE id = ${db.escape(req.user.id)}
            `);
            return res.status(200).send({
                data: {
                    id: users[0].id,
                    username: users[0].username,
                    email: users[0].email,
                    fullname: users[0].fullname,
                    bio: users[0].bio,
                    profile_picture_url: users[0].profile_picture_url,
                    is_verified: users[0].is_verified,
                }
            });

        } catch (error) {
            res.status(error.status || 500).send(error);
        }
    },
    verification: async (req, res) => {
        try {
            const id = req.user.id;
            let updateIsActiveQuery = `
                UPDATE users 
                SET is_verified = true 
                WHERE id = ${db.escape(id)}
            `;
            await query(updateIsActiveQuery);
            res.status(200).send({ success: true, message: 'Account is verified' });
        } catch (error) {
            res.status(500).send(error);
        }
    },
    resendVerification: async (req, res) => {
        try {
            const { id, email } = req.body
            console.log(req.body);
            console.log(id);
            console.log(email);
            let payload = { id: id };
            const token = jwt.sign(payload, process.env.TOKEN_SECRET_KEY, { expiresIn: '4h' });
            console.log(token);


            const mail = {
                from: `Admin`,
                to: `${email}`,
                subject: `Verfied your account`,
                html: `
                <div>
                <p>Your registration is received, just one more step, verify your account by clicking the link below,</p>
                <a href="${DOMAIN_USED}/users/verification/${token}">Click Here</a>
                </div>
                `,
            };
            let response = await nodemailer.sendMail(mail);
            console.log(response);
            res.status(200).send({
                code: 200,
                message: 'new token has been sent',
                result: response
            });
        } catch (error) {
            res.status(500).send(error);
        }
    }

}