const config = require('./server.json')
const fs = require('fs')
const path = require('path')
const isProduction = process.env.NODE_ENV !== 'development'
const estado = isProduction?'producción':'desarrollo'
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

// Ruta inicial
const rutaBase = '/:ini/api'
const prefijo = 'Hyo'
fastify.get(rutaBase + '/*', function (request, reply) {
  const archivo = request.params.ini
  reply.send({archivo})
  log.info('Ya se respondió')
})

const forEach = (obj, fn) => {
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      fn(obj[i], i, i)
    }
  } else if (obj && typeof obj === 'object') {
    const arrProps = Object.keys(obj)
    for (let i = 0; i < arrProps.length; i++) {
      const prop = arrProps[i]
      fn(obj[prop], prop, i)
    }
  }
}

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
        info: {}
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
    info: obj.info
  })
  return getApiComponents('controllers', obj)
}

forEach(fs.readdirSync(rootApi), api => {
  classAll.models[api] = require(path.resolve(rootApi, api, 'model'))
  classAll.controllers[api] = require(path.resolve(rootApi, api, 'controller'))

  const RouterFile = require(path.resolve(rootApi, api, 'router'))

  forEach(RouterFile, (configRouter, remoteMethod) => {
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
      handler (request, reply) {
        const controllers = getControllers({
          token: null,
          knex: {},
          info: {},
          params: request.query,
          request,
          response: reply
        })
        controllers[nameController][nameMethod]()
      }
    }
    fastify.route(definitionRouter)
  })
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

fastify.decorateReply('error', function (error, message) {
  // Uso: response.error(e, 'Hubo un error') ó response.error({error:'Un error'})
  log.error(error)
  this.code(500)
  if (message) {
    this.send(crearError(message))
  } else {
    this.send(crearError(error))
  }
})

const readFile = (pathFile) => {
  return new Promise((resolve, reject) => {
    fs.access(pathFile, fs.constants.R_OK, err => {
      if (err) {
        reject(err)
      } else {
        resolve(pathFile)
      }
    })
  })
}

const MESSAGE_ERROR_FILE = 'No se encuentra el archivo'
/**
 * reply.sendFile('ruta/archivo.js', {message: 'No hay archivo'})
 * @param {string} pathFile - Ruta del archivo
 * @param {string} [config.messageError]=No se encuentra el archivo - Mensaje de error
 * @param {string} [config.pathFileError] - Ruta de archivo en caso de error
 * @param {string} [config.charset]=utf8 - Juego de caracteres
 */
fastify.decorateReply('sendFile', function (pathFile, config) {
  const newConfig = {
    messageError: MESSAGE_ERROR_FILE,
    charset: 'utf8'
  }
  Object.assign(newConfig, config)
  readFile(pathFile)
  .catch(err => {
    if (newConfig.pathFileError) {
      return readFile(newConfig.pathFileError)
    }
    return Promise.reject(err)
  })
  .then(newPath => {
    this.send(fs.createReadStream(newPath, newConfig.charset))
  })
  .catch(err => {
    this.error(err, newConfig.messageError)
  })
})

// Error personalizado
fastify.setErrorHandler(function (error, request, reply) {
  // Sólo cuando se envía una instancia de Error en reply.send(new Error('Hubo un error')) 
  if (error && error.code === 'ENOENT') {// Necesario cuando se usa reply.send(stream)
    log.error(error)
    error.message = MESSAGE_ERROR_FILE
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