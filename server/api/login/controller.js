class Login {
    constructor ({all, params, http, models}) {
        this.all = all
        this.params = params
        this.http = http
        this.models = models
    }
    ingresar () {
        const {token, knex, info} = this.all
        const {user, password} = this.params
        const {request, response} = this.http
        const login = this.models.login
        login.generarToken({user, password}).then(function(token){
            // const fs = require('fs')
            // const stream = fs.createReadStream('some-file', 'utf8')
            // response.send(stream) // Sólo con custom error
            response.send({
                colcod: info.colcod,
                token
            })
        }).catch(function (e) {
            response.error(e, 'Hubo un error')
        })
    }
}
module.exports = Login