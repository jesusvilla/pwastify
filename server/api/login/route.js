module.exports = {
    'Ingresar': {// Nombre del controlador: [controlador.]Metodo que se va a ejecutar
        method: 'GET',
        url: 'Ingresar', // Url de la petición. Si no se coloca es el mismo que el nombre de la propiedad
        schema: {
            //setDefault: true, // Esto es para resumir schema
            //parameters: {}, //Esto es para resumir schema
            response: {
                200: {
                    type: 'object',
                    properties: {
                        token: { type: 'string' }
                    }
                }
            },
            //body: {},//POST - PUT
            //params: {}// En url
            querystring: {//GET - DELETE
                user: { type: 'string'},//http://json-schema.org/example2.html
                password: { type: 'number' }
            }
        }
        // beforeHandler(request, response, next)
        // handler(request, response, next)
    }
}