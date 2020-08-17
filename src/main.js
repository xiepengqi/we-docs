try{
    const config = require("../config")
    const server = require('server');
    const { get } = server.router;

    let serverInfo = {
        port: config.serverPort,
        public: 'we-docs-ui/dist/'
    }

    server(serverInfo,[
        get('/', ctx => ({ public: ctx.options.public })),
        get('/data', ctx => config.data)
    ]);

    console.log("started", JSON.stringify(serverInfo))
    console.log(`http://localhost:${serverInfo.port}`)

    require("./parser")
}catch (e) {
    console.log(JSON.stringify(e))
    throw e
}
