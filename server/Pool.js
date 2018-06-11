const Promise = require('bluebird')
class Connection {
    constructor (ini) {
        this.ini = ini
    }
    createConnection () {
        const Firebird = require('node-firebird-dev')
        const options = {
            host: '127.0.0.1',
            port: 3050,
            database: '',
            user: 'SYSDBA',
            password: 'masterkey'
        }
        return new Promise((resolve, reject) => {
            Firebird.attach(options, (err, db) => {
                if (err) {
                    reject(err)
                } else {
                    resolve(db)
                }
            })
        })
    }
    setKnex (ini) {

    }
    getKnex () {
        if (!this.list.hasOwnProperty(this.ini)) {
            this.list[this.ini] = {
                ini: this.ini
            }
        }
        return this.list[this.ini]
    }
}

class Colegio {
    constructor (ini) {
        this.ini = ini
        this.setKnex()
    }
    setKnex () {
        this.knex = {
            ini: this.ini
        }
    }
    getKnex () {
        return this.knex
    }
}

class Pool {
    constructor () {
        this.colegios = {}
    }
    getColegio (ini) {
        if (!this.colegios.hasOwnProperty(ini)) {
            this.colegios[ini] = new Colegio(ini)
        }
        return this.colegios[ini]
    }
}
module.exports = new Pool()