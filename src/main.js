let {trim, e} = require('xpq-js-lib')
let fs = require("fs")
const config = require("../config")
const server = require("server");
const { get, post } = server.router;

try{
    let serverInfo = {
        port: config.serverPort,
        public: 'static/ui/',
        security: { csrf: false }
    }

    server(serverInfo,[
        get('/', ctx => ({ public: ctx.options.public })),
        get('/data', ctx => config.data),
        post('/gitInfo', ctx => {
            checkoutGitInfo(trim(ctx.data.repoUrl), trim(ctx.data.repoName), trim(ctx.data.branch));
            return 'ok'
        })
    ]);

    console.log("started", JSON.stringify(serverInfo))
    console.log(`http://localhost:${serverInfo.port}`)

    require("./parser")
}catch (e) {
    console.log(JSON.stringify(e))
    throw e
}

async function checkoutGitInfo(repoUrl, repoName, branch) {
    if (!repoUrl && config.gitUrlPrefix && repoName) {
        repoUrl = config.gitUrlPrefix + '/' + repoName + '.git'
    }
    if (!(repoUrl && repoName && branch && config.sourceDir && fs.existsSync(config.sourceDir))) {
        console.warn('checkoutGitInfo cond absent')
        return;
    }

    console.log(`checkoutGitInfo begin: ${repoUrl} ${repoName} ${branch}`)
    let repoDir = `${config.sourceDir}/${repoName}`;
    if (!fs.existsSync(repoDir)) {
        console.log(await e(`cd ${config.sourceDir}; pwd; git clone ${repoUrl}`))
    }
    console.log(await e(`cd ${repoDir}; pwd; git checkout ${branch}; git pull -r`))

    console.log(`checkoutGitInfo done`)
}

