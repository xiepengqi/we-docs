const server = require('server');
const { get, post } = server.router;

let serverInfo = { port: 8080 }

server(serverInfo,[
    get('/', ctx => 'Hello world!')
]);

console.log("started", JSON.stringify(serverInfo))
console.log(`http://localhost:${serverInfo.port}`)
