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

// test: http://localhost:3000/bpastor/api/Hyologin/Ingresar?user=jesus&password=jajaja
const loginRouter = require('./api/login/router')
const eRouter = Object.keys(loginRouter)[0]
const controladorNombre = eRouter.split('.')
let ctrlNombre = ''
let ctrlMetodoNombre = ''
if (controladorNombre.length === 1) { // Cuando sólo se coloca el método
  ctrlNombre = 'login'
  ctrlMetodoNombre = controladorNombre[0]
} else { // Cuando se coloca el Controlador.metodo
  ctrlNombre = controladorNombre[0]
  ctrlMetodoNombre = controladorNombre[1]
}
const url = `${rutaBase}/${prefijo}${ctrlNombre}/${ctrlMetodoNombre}`
fastify.get(url, function (request, reply) {
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

// Sólo manejo de errores

const crearError = function (payload) {
  if (payload && typeof payload === 'object') {
    // https://www.fastify.io/docs/latest/Reply/
    /*{
      error: String        // the http error message
      message: String      // the user error message
      statusCode: Number   // the http status code
    }*/
    payload.statusCode = 500
  }
  if (typeof payload === 'string') {
    return new Error(payload)
  } else {
    return payload
  }
}

fastify.decorateReply('error', function (error, payload) {
  // Uso: response.error(e, 'Hubo un error') ó response.error({error:'Un error'})
  log.error(error)
  this.code(500)
  if (payload) {
    this.send(crearError(payload))
  } else {
    this.send(crearError(error))
  }
})

// Error personalizado
fastify.setErrorHandler(function (error, request, reply) {
  // Sólo cuando se envía una instancia de Error en reply.send(new Error('Hubo un error')) 
  if (error && error.code === 'ENOENT') {// Necesario cuando se usa reply.send(stream)
    log.error(error)
    error.message = 'No existe el archivo'
  }
  reply.send(error)
})

/*fastify.addHook('onSend', (request, reply, payload, next) => { // Esto es para enviar log.error automáticamente
  if (reply.res.statusCode === 500) {
    console.log()
    log.error(payload)
  }
  next()
})*/

// Run the server!
fastify.listen(config.port)
.then(function(){
  log.info(`Servidor ${estado} en ${config.port}`)
})
.catch(function (e) {
  log.error(e)
  process.exit(1)
})