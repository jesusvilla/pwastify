const config = require('./server.json')
const fs = require('fs')
const path = require('path')
const isProduction = process.env.NODE_ENV !== 'development'
const estado = isProduction?'producción':'desarrollo'
const archivoLog = `logs/node`

//MultiStream
const multistream = require('pino-multi-stream').multistream
const configStream = {'flags': 'a'}
const streams = [
  //{stream: fs.createWriteStream('info.server.out')},
  {stream: fs.createWriteStream(`${archivoLog}.log`, configStream)},
  {level: 'fatal', stream: fs.createWriteStream(`${archivoLog}.fatal`, configStream)}
]

let log = null
if (isProduction) {
  log = require('pino')(config.log, multistream(streams))
} else {
  log = require('pino')(config.log)
}
console.log('estado', estado)
const fastify = require('fastify')({logger: false})

// Ruta inicial
const rutaBase = '/:ini/api'
const prefijo = 'Hyo'
fastify.get(rutaBase + '/*', function (request, reply) {
  const archivo = request.params.ini
  reply.send({archivo})
  log.info('Ya se respondió')
})

// test: http://localhost:3000/bpastor/api/HyoLogin/ingresar?user=jesus&password=jajaja
fastify.get(rutaBase + '/' + prefijo + 'Login/ingresar', function (request, reply) {
  const LoginModel = require('./api/login/model')
  const loginM = new LoginModel({
    token: null,
    knex: {},
    info: {}
  })
  const LoginController = require('./api/login/controller')
  const loginC = new LoginController({
    all: {token: null, knex: {}, info: {}},
    params: request.query,
    http: {request, response: reply},
    models: {
      login: loginM
    }
  })
  loginC.ingresar()
})

// Run the server!
fastify.listen(config.port)
.then(function(){
  log.info(`Servidor ${estado} en ${config.port}`)
})
.catch(function (e) {
  log.error(e)
  process.exit(1)
})