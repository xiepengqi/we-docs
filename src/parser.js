let fs = require('fs')
const config = require("./config")
let exec = require('child_process').exec;

let homeDir
let sourceDir = trim(config.sourceDir).replace(/\/+/g, '/').replace(/\/$/, '')
let workDir = trim(config.workDir).replace(/\/+/g, '/').replace(/\/$/, '')

let pathMap = {}
config.data = {}

doProcess()

function doProcess(){
    try {
        process()
    } catch (e) {
        console.log(JSON.stringify(e))
    }
    setTimeout(doProcess, (config.refreshSec || 60) * 1000)
}

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
            item.split("\n").map(item => item)
                .filter(item => item && item.match(/\.java$/))
                .map(item => {
                    item = trim(item)
                    let [module, className] = parsePath(item)
                    pathMap[reget(item, new RegExp('/src/main/java/(.+).java')).replace(/\//g, '.')] = item
                    return item
                })
                .forEach(item => eachJavaFile(item))
        })
        .then(() => {
            console.log("refreshed.....")
        })
}

function eachJavaFile(path) {
    let text = String(fs.readFileSync(path))
    let [module, className] = parsePath(path)

    if (text.match(/(?:@RestController|@Controller)/)) {
        register(module, className)
        config.data[module][className].$desc = getClassDesc(text, className)
        getHttpMethods(text).forEach(item => {
            register(module, className, item)
            config.data[module][className][item].$desc = getMethodDesc(text, item)
        })
    }
    if (text.indexOf('org.apache.dubbo.config.annotation.Service') !== -1 &&
        text.indexOf('@Service') !== -1) {
        register(module, className)

        let classInfo = config.data[module][className]
        let [implClass, implPath] = getImpl(text)

        let implText = implPath ? String(fs.readFileSync(implPath)):""

        classInfo.$label = implClass
        classInfo.$desc = getClassDesc(implText, implClass)
        classInfo.$desc = [classInfo.$desc,  getClassDesc(text, className)].filter(item => item).join('\n')

        getDubboMethods(text).forEach(item => {
            register(module, className, item)

            classInfo[item].$desc = getMethodDesc(implText, item)
            classInfo[item].$desc =[classInfo[item].$desc, getMethodDesc(text, item)].filter(item => item).join('\n')
        })
    }
}

function getHttpMethods(text) {
    let reg = /[\{;][^\{;]+@.+Mapping\([^\{;]+public\s+\S+\s+([\w\d]+)\s*\(/g

    let result = []
    let r = reg.exec(text)
    while (r) {
        result.push(r[1])
        r = reg.exec(text)
    }

    return result
}
function getDubboMethods(text) {
    let reg = /[\{;][^\{;]+@Override[^\{;]+public\s+\S+\s+([\w\d]+)\s*\(/g

    let result = []
    let r = reg.exec(text)
    while (r) {
        result.push(r[1])
        r = reg.exec(text)
    }

    return result
}
function parsePath(path) {
    let strs = path.replace(workDir, '').split('/').filter(item => item)
    return Object.values({
        module: reget(path, /.*\/([^/]+)\/src\/main\/java.*/),
        className: strs[strs.length - 1].replace('.java', '')
    })
}

function reget(str, reg) {
    let r = reg.exec(str)
    return r ? trim(r[1]): ""
}

function register(module, className, methodName, info) {
    if (module && !config.data[module]) {
        config.data[module] = {
            $name: module,
            $label: module,
            $type: 'module'
        }
    }

    if (className && !config.data[module][className]) {
        config.data[module][className] = {
            $name: className,
            $label: className,
            $type: 'class'
        }
    }

    if (methodName && !config.data[module][className][methodName]) {
        config.data[module][className][methodName] = info || {}
        config.data[module][className][methodName].$name = methodName
        config.data[module][className][methodName].$label = methodName
        config.data[module][className][methodName].$type = 'method'
    }
}

function getImpl(text) {
    let interfaceName = reget(text, /public class \S+ implements (\S+) {/)

    return Object.values({
        implClass: interfaceName,
        implPath: pathMap[reget(text, new RegExp(`import\\s+(.+${interfaceName});`))]
    })
}

function getClassDesc(text, className) {
    let reg = new RegExp('[;]([^;]+)public\\s+(?:`class|interface)\\s+'+className+'\\s*')

    let r = reg.exec(text)
    return r ? trim(r[1]): ""
}

function getMethodDesc(text, methodName) {
    let reg = new RegExp('[\\{\\};]([^;\\}\\{]+)\\s+\\S+\\s+\\S+\\s+'+methodName+'\\s*\\(')

    let r = reg.exec(text)
    return r ? trim(r[1]): ""
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
//                 console.log(`-------------${cmd}----------------
// stdout: ${trim(stdout)}
// stderr: ${trim(stderr)}
// `)
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