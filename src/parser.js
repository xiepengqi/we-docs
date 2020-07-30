let fs = require('fs')
const config = require("./config")
let exec = require('child_process').exec;

let homeDir
let sourceDir = trim(config.sourceDir).replace(/\/+/g, '/').replace(/\/$/, '')
let workDir = trim(config.workDir).replace(/\/+/g, '/').replace(/\/$/, '')
let javaPaths
process()

function process() {
    e(`echo ~`)
        .then(item => {
            // 确认家目录
            homeDir = item
        })
        .then(() => e(`ls -d ${sourceDir}`))
        .then(item => {
            // 校验源文件目录
            if (sourceDir !== item) {
                throw new Error(`sourceDir [${sourceDir}] 不合法`)
            }
        })
        .then(() => {
            // 初始化工作目录
            if (!workDir.startsWith(homeDir) || workDir === homeDir) {
                throw new Error(`workDir [${workDir}] 不合法，必须在家目录下`)
            }
        })
        // .then(() => e(`mkdir ${workDir}; rm -rf ${workDir}/* `))
        // .then(() => {
        //     return initWorkPj()
        // })
        .then(() => e(`find ${workDir} -name '*.java'`))
        .then((item)=> {
            javaPaths = item.split("\n").map(item => trim(item)).filter(item => item && item.match(/\.java$/))
            javaPaths.forEach(item => eachJavaFile(item))
        })
        .then(() => {
            console.log("end.....")
        })
}

function eachJavaFile(path) {
    let text = String(fs.readFileSync(path))

    if (text.match(/(?:@RestController|@Controller)/)) {
        console.log(path)
    }
}

function regHttp(path, methodName, info) {

}

function regRpc(path, methodName,info) {

}

function initWorkPj(){
    return e(`cd ${sourceDir}; ls`)
        .then(stdout => {
            return Promise.all(stdout.split("\n").filter(item => item).map(item =>{
                let path = `${sourceDir}/${item}`
                return e(`cd ${path}; pwd; git remote -v | head -1`)
            }))
        })
        .then(results => {
            let paths = []
            for (let result of results) {
                let strs = result.split("\n")
                if (strs.length > 1 && strs[1].indexOf(config.gitRemoteInclude) !== -1) {
                    paths.push(strs[0])
                }
            }
            return Promise.all(paths.map(item => {
                return e(`find ${item} -name '*.java'`)
            }))
        })
        .then(items => {
            let results = []
            for (let item of items) {
                item.split("\n").forEach(i => {
                    if (i) {
                        results.push(i)
                    }
                })
            }
            return queue(results.map(item => {
                let target = item.replace(sourceDir, workDir)
                let targetDir = target.replace(/[^/]+\.java/, '');
                return () => e(`mkdir -p ${targetDir}; cp ${item} ${target}`)
            }))
        })
}

////////////////////////////////////////////////////////////////////////////////

function e(cmd){
    return new Promise(resolve => {
        exec(`${cmd}`,
            function (err, stdout, stderr) {
                console.log(`-------------${cmd}----------------   
stdout: ${trim(stdout)}  
stderr: ${trim(stderr)}
`)
                resolve(trim(stdout))
            });
    })
}

function trim(obj) {
    return obj ? String(obj).trim():""
}

async function queue(arr) {
    let res = []
    for (let fn of arr) {
        res.push(await fn());
    }
    return await res
}