const path = require('path')
const fs = require('fs')
const forEach = require('../utils/forEach')

const rootApi = path.resolve(__dirname, './api/')

const Pool = require('./Pool')

const NAME_MODEL = 'model.js'
const NAME_CONTROLLER = 'controller.js'
const NAME_ROUTER = 'route.js'

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

module.exports = function (fastify, log, config) {

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
        let url = `${config.root}/${config.prefix}${api}`
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
}