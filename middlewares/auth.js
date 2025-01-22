const jwt = require('jsonwebtoken')

const verifyToken = (req, res, next) => {
    let token = req.headers.authorization
    console.log(token);
    if (!token) {
        console.log('first');
        return res.status(401).send('Access Denied')
    }

    token = token.split(' ')[0]
    console.log(token);
    if (token == 'null' || !token) {
        console.log('second');
        return res.status(401).send('Access Denied')
    }

    let verifiedUser = jwt.verify(token, process.env.TOKEN_SECRET_KEY)
    if (!verifiedUser) {
        console.log('third');
        return res.status(401).send('Access Denied')
    }

    req.user = verifiedUser
    req.token = token
    next()

}

module.exports = { verifyToken }