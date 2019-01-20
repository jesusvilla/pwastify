const config = require('./server.json')
const fs = require('fs')
const path = require('path')
const isProduction = process.env.NODE_ENV !== 'development'
const estado = isProduction ? 'producción': 'desarrollo'
const archivoLog = `logs/node`

let log = null
if (isProduction) {
  //MultiStream
  const multistream = require('pino-multi-stream').multistream
  const configStream = {'flags': 'a'}
  const streams = [
    //{stream: fs.createWriteStream('info.server.out')},
    {stream: fs.createWriteStream(`${archivoLog}.log`, configStream)},
    {level: 'fatal', stream: fs.createWriteStream(`${archivoLog}.fatal`, configStream)}
  ]
  log = require('pino')(config.log, multistream(streams))
} else {
  log = require('pino')(config.log)
}
console.log('estado', estado)
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

// Ruta inicial
const rutaBase = '/:ini/api'
const prefijo = 'Hyo'
fastify.get(rutaBase + '/*', function (request, reply) {
  const archivo = request.params.ini
  reply.send({archivo})
  log.info('Ya se respondió')
})

const forEach = require('../utils/forEach')

// test: http://localhost:3000/bpastor/api/Hyologin/Ingresar?user=jesus&password=jajaja
const rootApi = path.resolve(__dirname, './api/')
const classAll = {
  models: {},
  controllers: {}
}

const getApiComponents = (type, obj) => {
  const components = {}
  forEach(classAll[type], (ComponentClass, component) => {
    components[component] = new ComponentClass()
    forEach(obj, (val, prop) => {
      components[component][prop] = val
    })
    components[component][type] = components
  })
  return components
}

const getModels = (obj) => {
  /**
   * {
        token: null,
        knex: {},
        info: {},
        ini: 'colegio'
     }
   */
  return getApiComponents('models', obj)
}

const getControllers = (obj) => {
  /**
   * {
      token,
      knex,
      info,
      ini,
      params: request.query,
      request,
      response,
      models: {
        [api]: model
      }
     }
   */
  obj.models = getModels({
    token: obj.token,
    knex: obj.knex,
    info: obj.info,
    ini: obj.ini
  })
  return getApiComponents('controllers', obj)
}

const Pool = require('./Pool')

/**
 * 
 * @param {string} api - Nombre de la carpeta de la API
 * @param {Object} configRouter - Valor de definición del route
 * @param {string} remoteMethod - Nombre del controlador: [controlador.]Metodo que se va a ejecutar
 */
const createRoute = (api, configRouter, remoteMethod) => {
  const auxMethod = remoteMethod.split('.')
  let nameController, nameMethod
  if (auxMethod.length === 1) {
    nameController = api
    nameMethod = auxMethod[0]
  } else {
    nameController = auxMethod[0]
    nameMethod = auxMethod[1]
  }
  let url = `${rutaBase}/${prefijo}${api}`
  if (configRouter.url) {
    url += `/${configRouter.url}`
  } else {
    url += `/${nameMethod}`
  }

  const definitionRouter = {
    method: configRouter.method,
    url,
    schema: configRouter.schema,
    handler (request, reply) {
      const ini = request.params.ini
      const colegio = Pool.getColegio(ini)
      const controllers = getControllers({
        token: null,
        knex: colegio.getKnex(),
        info: {},
        ini,
        params: Object.assign({}, request.query, request.body, request.params, request.headers),
        request,
        response: reply
      })
      controllers[nameController][nameMethod]()
    }
  }
  // Object que define el route a crear, verlo en https://www.fastify.io/docs/latest/Routes/
  fastify.route(definitionRouter)
}

/**
 * 
 * @param {string} api - Nombre de la carpeta 
 */
const NAME_MODEL = 'model.js'
const NAME_CONTROLLER = 'controller.js'
const NAME_ROUTER = 'route.js'

const createApi = (api) => {
  // Por cada cada carpeta (api) se crea o agrega los controladores, modelos y definiciones de rutas
  const nameFolder = path.resolve(rootApi, api)
  forEach(fs.readdirSync(nameFolder), apiFile => {
    if (apiFile === NAME_MODEL) {
      return classAll.models[api] = require(path.resolve(nameFolder, NAME_MODEL))
    }
    if (apiFile === NAME_CONTROLLER) {
      return classAll.controllers[api] = require(path.resolve(nameFolder, NAME_CONTROLLER))
    }
    if (apiFile === NAME_ROUTER) {
      const RouterFile = require(path.resolve(nameFolder, NAME_ROUTER))
      forEach(RouterFile, (configRouter, remoteMethod) => {
        createRoute(api, configRouter, remoteMethod)
      })
    }
  })
}

forEach(fs.readdirSync(rootApi), api => {
  // Se recorre por todas las carpetas dentro de server/api
  createApi(api)
})

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