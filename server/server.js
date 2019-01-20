const config = require('./server.json')
const fs = require('fs')
const path = require('path')
const isProduction = process.env.NODE_ENV !== 'development'
const estado = isProduction ? 'producción': 'desarrollo'

let log = null
if (isProduction) {
  //MultiStream
  const multistream = require('pino-multi-stream').multistream
  const configStream = {'flags': 'a'}
  const streams = [
    //{stream: fs.createWriteStream('info.server.out')},
    {stream: fs.createWriteStream(`${config.log.path}.log`, configStream)},
    {level: 'fatal', stream: fs.createWriteStream(`${config.log.path}.fatal`, configStream)}
  ]
  log = require('pino')(config.log, multistream(streams))
} else {
  log = require('pino')(config.log)
}

console.log('ESTADO:', estado)

const fastify = require('fastify')({logger: false})

// Register HELMET
fastify.register(require('fastify-helmet'), {
  hidePoweredBy: { setTo: 'PHP 3.2.0'},
  xssFilter: { setOnOldIE: true }
})

// Register Cookie
fastify.register(require('fastify-cookie'), (err) => {
  if (err) throw err
})

// Path root
fastify.get(config.root + '/*', function (request, reply) {
  const archivo = request.params.ini
  reply.send({archivo})
  log.info('Ya se respondió')
})

const load = require('./load')
load(fastify, log, config)

console.log('TEST:', `http://localhost:${config.port}${config.root}/${config.prefix}login/Ingresar?user=jesus&password=jajaja`)

const decorate = require('./decorate')
decorate(fastify, log, {})

// Run the server!
fastify.listen(config.port)
.then(function(){
  log.info(`Servidor ${estado} en ${config.port}`)
})
.catch(function (e) {
  log.error(e)
  process.exit(1)
})