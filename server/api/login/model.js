const jwt = require('jsonwebtoken') 
class Login {
    constructor ({token, knex, info}) {
        this.token = token
        this.knex = knex
        this.info = info
    }
    generarToken ({user, password}) {
        const token = jwt.sign({user, password}, 'lms');
        return Promise.resolve(token)
    }
}
module.exports = Login