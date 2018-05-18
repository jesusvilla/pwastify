var production = process.env.NODE_ENV === 'production'
if (!production) {
  var chokidar = require('chokidar')
  var watcher = chokidar.watch('./dist')
  watcher.on('ready', function() {
    watcher.on('all', function() {
      console.log("Clearing /dist/ module cache from server")
      Object.keys(require.cache).forEach(function(id) {
        if (/[\/\\]dist[\/\\]/.test(id)) delete require.cache[id]
      })
    })
  })
}