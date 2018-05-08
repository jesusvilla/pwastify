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
            response.send({
                colcod: info.colcod,
                token
            })
        })
    }
}
module.exports = Login