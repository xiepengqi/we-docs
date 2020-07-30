const config = require("./config")
const server = require('server');
const { get, post } = server.router;

let serverInfo = { port: config.serverPort }

server(serverInfo,[
    get('/', ctx => 'Hello world!'),
    get('/menus', require("./action/getMenus"))
]);

console.log("started", JSON.stringify(serverInfo))
console.log(`http://localhost:${serverInfo.port}`)
