try{
    require("./parser")
    const config = require("./config")
    const server = require('server');
    const { get } = server.router;

    let serverInfo = { port: config.serverPort }

    server(serverInfo,[
        get('/', ctx => 'Hello world!'),
        get('/data', ctx => config.data)
    ]);

    console.log("started", JSON.stringify(serverInfo))
    console.log(`http://localhost:${serverInfo.port}`)
}catch (e) {
    console.log(e)
}
