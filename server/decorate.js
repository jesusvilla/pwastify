const MESSAGE_ERROR_FILE = 'No se encuentra el archivo'
const fs = require('fs')

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

/**
 * createError('Un error') o createError({error: 'Un error'})
 * @param {String, Object} payload
 * 
 * https://www.fastify.io/docs/latest/Reply/
 * @param {String} payload.error - the http error message
 * @param {String} payload.message - the user error message
 * @param {Number} payload.statusCode - the http status code
 */
const createError = function (payload) {
    if (payload && typeof payload === 'object') {
        payload.statusCode = 500
    }
    if (typeof payload === 'string') {
        return new Error(payload)
    } else {
        return payload
    }
}

module.exports = function (fastify, log, opts) {
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

    /**
     * reply.error(e, 'Hubo un error') o reply.error({error: 'Hubo un error'})
     */
    fastify.decorateReply('error', function (error, message) {
        // Se registra en PINO
        log.error(error)

        // Se registra el statusCode: 500
        this.code(500)

        if (message) {
            this.send(createError(message))
        } else {
            this.send(createError(error))
        }
    })
}