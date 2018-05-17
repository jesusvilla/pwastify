const jwt = require('jsonwebtoken')
module.exports = class Login {
    generarToken ({user, password}) {
        const token = jwt.sign({user, password}, 'lms');
        return Promise.resolve(token)
    }
}