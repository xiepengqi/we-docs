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
        let time = Date.now()
        console.log("begin load data " + new Date())
        process().then(() => {
            console.log("done " + ((Date.now() - time)/1000) + 's')
        })
    } catch (e) {
        console.log(JSON.stringify(e))
    }
    setTimeout(doProcess, (config.refreshSec || 60) * 1000)
}

function process() {
    return e(`echo ~`)
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
        .then(() => e(`mkdir ${workDir}; rm -rf ${workDir}/* `))
        .then(() => {
            return initWorkPj()
        })
        .then(() => e(`find ${workDir} -name '*.java'`))
        .then((item)=> {
            item.split("\n").map(item => item)
                .filter(item => item && item.match(/\.java$/))
                .map(item => {
                    item = trim(item)
                    let [module, className] = parsePath(item)
                    pathMap[reget(item, new RegExp('/src/main/java/(.+)\.java')).replace(/\//g, '.')] = item
                    pathMap[className] = item
                    return item
                })
                .forEach(item => eachJavaFile(item))
        })
}

function eachJavaFile(path) {
    let text = String(fs.readFileSync(path))
    let [module, className] = parsePath(path)

    if (text.match(/(?:@RestController|@Controller)/)) {
        register(module, className)
        let classInfo = config.data[module][className]
        classInfo.$desc = getClassDesc(text, className)
        classInfo.$package = getPackage(text)

        classInfo.$path = reget(classInfo.$desc, /@RequestMapping\(\"(.*)\"\)/)
        if (classInfo.$path) {
            classInfo.$path = "/" + classInfo.$path.split("/").filter(item => item).join("/")
        }
        getHttpMethods(text).forEach(item => {
            register(module, className, item)
            classInfo[item].$desc = getMethodDesc(text, item)
            classInfo[item].$package = getPackage(text)
            classInfo[item].$path = reget(classInfo[item].$desc, /@\w+Mapping\(\"(.*)\"\)/)
            if (classInfo[item].$path) {
                classInfo[item].$path = "/" + classInfo[item].$path.split("/").filter(item => item).join("/")
            }
            classInfo[item].$requestMethod = reget(classInfo[item].$desc, /@(\w+)Mapping/)
            classInfo[item].$url = classInfo.$path + classInfo[item].$path
            enrichCommonMethodInfo(text, classInfo[item])
        })
    }
    if (text.indexOf('org.apache.dubbo.config.annotation.Service') !== -1 &&
        text.indexOf('@Service') !== -1) {
        register(module, className)

        let classInfo = config.data[module][className]
        let [implClass, implPath] = getImpl(text)

        let implText = implPath ? String(fs.readFileSync(implPath)):""

        classInfo.$label = implClass || className
        classInfo.$desc = getClassDesc(implText, implClass) ||  getClassDesc(text, className)
        classInfo.$package = getPackage(text)

        getDubboMethods(text).forEach(item => {
            register(module, className, item)

            classInfo[item].$desc = getMethodDesc(implText, item) || getMethodDesc(text, item)
            classInfo[item].$package = getPackage(text)
            enrichCommonMethodInfo(implText || text, classInfo[item])
        })
    }
}

function enrichCommonMethodInfo(text, info) {
    let reg = new RegExp('[\\{\\};][^;\\}\\{]+\\s+((?:public)?\\s+(\\S+)\\s+'+info.$name+'\\s*\\(([^\\{\\};]*)\\))')
    let r = reg.exec(text)

    info.$profile = trim(r[1])
    info.$result = {
        $type: r[2]
    }
    enrichDomainInfo(info.$result, getFullClass(info.$result.$type.replace(/<.*>/g, ''), text))

    info.$params = {}
    let paramsStr = r[3].replace(/@[\S]+/g, '')
    reg = new RegExp('\\s*([A-Z][a-zA-Z_0-9<>,\s]+[^\s,])\\s+(\\S+)\\s*,?', 'g')
    let nr = reg.exec(paramsStr)
    while (nr) {
        let x = {
            $type: nr[1]
        }
        info.$params[nr[2]] = x
        enrichDomainInfo(x, getFullClass(x.$type.replace(/<.*>/g, ''), text))

        nr = reg.exec(paramsStr)
    }
}

function enrichDomainInfo(result, fullClass) {
    let path = pathMap[fullClass] || ''

    let text
    if (path) {
        text = String(fs.readFileSync(path));
    } else {
        if (result.$type.indexOf('<') !== -1) {
            text = `
            private T item;
            `
        } else {
            return;
        }
    }

    let [module, className] = parsePath(path)

    if (! result.$desc) {
        result.$desc = getClassDesc(text, className)
    }
    text = text.replace(/ return.*;/g, '')
    let reg = /\n\s+(?:private|public|protected)?\s+([^\n\-\(\)\=\+;\*@]+)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*;/g
    let r = reg.exec(text)
    while (r) {
        result[r[2]] = {
            $type: r[1].match(/(<[A-Z]>|^[A-Z]$)/) ? r[1].replace(/(<[A-Z]>|^[A-Z]$)/, (trim(reget(result.$type, /[^<>]+<(.+)>/)) || "Object")) : r[1],
            $desc: getFieldDesc(text, r[2])
        }

        enrichDomainInfo(result[r[2]],
            getFullClass(result[r[2]].$type.replace(/<.*>/g, '')),
            text)
        r = reg.exec(text)
    }

    let [implClass, implPath ] = getImpl(text)
    if (implClass) {
        let temp = result.$type
        result.$type = implClass
        enrichDomainInfo(result, getFullClass(implClass.replace(/<.*>/g, ''), text))
        result.$type = temp
    }
    return result
}

function getHttpMethods(text) {
    let reg = /[\{;][^\{;]+@.+Mapping\([^;]+public\s+\S+\s+([\w\d]+)\s*\(/g

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
    if (!path) {
        return ['', '']
    }
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
        config.data[module] = Object.assign({
            $name: module,
            $label: module,
            $type: 'module'
        }, config.data[module] || {})
    }

    if (className && !config.data[module][className]) {
        config.data[module][className] = Object.assign({
            $name: className,
            $module: module,
            $label: className,
            $type: 'class'
        }, config.data[module][className] || {})
    }

    if (methodName && !config.data[module][className][methodName]) {
        config.data[module][className][methodName] = Object.assign({
            $name: methodName,
            $module: module,
            $class: className,
            $label: methodName,
            $type: 'method'
        },methodName && !config.data[module][className][methodName] || {},info || {})
    }
}

function getImpl(text) {
    let interfaceName = reget(text, /public\s+class\s+\S+\s+(?:implements|extends)\s+(\S+)/)

    return Object.values({
        implClass: interfaceName,
        implPath: pathMap[reget(text, new RegExp(`import\\s+(.+${interfaceName});`))]
    })
}

function getFullClass(className, text) {
    return  reget(text, new RegExp(`import\\s+(.+${className});`)) || className
}

function getPackage(text) {
    return reget(text, new RegExp(`package\\s+(.+);`))
}

function getClassDesc(text, className) {
    let reg = new RegExp('[;]([^;]+)public\\s+(?:class|interface|abstract class)\\s+'+className+'\\s*')

    let r = reg.exec(text)
    return r ? trim(r[1]): ""
}

function getMethodDesc(text, methodName) {
    text = text.replace(/public\s+(?:class|interface|abstract class)[^\{]+{/, ";")
    let reg = new RegExp('[\\{\\};]\\s*\n\\s*([/@][^;]+)\\s+(?:public)?\\s+\\S+\\s+'+methodName+'\\s*\\(')

    let r = reg.exec(text)
    return r ? trim(r[1]): ""
}

function getFieldDesc(text, fieldName) {
    text = text.replace(/public\s+(?:class|interface|abstract class)[^\{]+{/, ";")
    let reg = new RegExp('[\\{\\};]\\s*\n\\s*([/@][^;]+)(?:private|public|protected).*'+fieldName+'\\s*;')

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
        exec(`${cmd}`, {
                maxBuffer: 2000 * 1024 //quick fix
            },
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