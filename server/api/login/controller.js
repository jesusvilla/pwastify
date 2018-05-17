module.exports = class Login {
    Ingresar () {
        const {token, knex, info, request, response} = this
        const {user, password} = this.params
        const login = this.models.login
        login.generarToken({user, password}).then(function(token){
            // const fs = require('fs')
            // const stream = fs.createReadStream('some-file', 'utf8')
            // response.send(stream) // Sólo con custom error
            // response.sendFile('some-file')
            response.send({
                colcod: info.colcod,
                token
            })
        }).catch(function (e) {
            response.error(e, 'Hubo un error')
        })
    }
}