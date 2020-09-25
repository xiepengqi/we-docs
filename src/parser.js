let fs = require('fs')
const config = require("../config")
let {trim, e, reget, regEach} = require('xpq-js-lib')

let homeDir
let sourceDir = trim(config.sourceDir).replace(/\/+/g, '/').replace(/\/$/, '')

let pathMap = {}
let repoMap = {}

Object.keys(config.data).filter(item => !item.startsWith("$")).forEach(item => {
    delete config.data[item]
})

doProcess()

function doProcess(){
    let time = Date.now()
    console.log("begin load data " + new Date())
    process().then(() => {
        console.log("done " + ((Date.now() - time)/1000) + 's')
        setTimeout(doProcess, (config.refreshSec || 60) * 1000)
    }).catch(e => {
        console.error(e)
        console.log("done " + ((Date.now() - time)/1000) + 's')
        setTimeout(doProcess, (config.refreshSec || 60) * 1000)
    })
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
            return e(`cd ${sourceDir}; ls`)
        })
        .then(stdout => {
            return Promise.all(stdout.split("\n").filter(item => item)
                .filter(item => new RegExp(config.targetReg).test(item))
                .map(item =>{
                    let path = `${sourceDir}/${item}`
                    return e(`cd ${path}; pwd; git remote -v | head -1; git status | head -1`)
                }))
        })
        .then(results => {
            let paths = []
            for (let result of results) {
                let strs = result.split("\n").filter(item => item)
                if (strs.length > 1 && strs[1].indexOf(config.gitRemoteInclude) !== -1) {
                    paths.push(strs[0])
                    let workPath = strs[0]
                    if (!repoMap[workPath]) {
                        repoMap[workPath] = {}
                    }
                    repoMap[workPath].$branch = strs[2]
                    repoMap[workPath].$repo = strs[1]
                }
            }
            return Promise.all(paths.map(item => {
                return e(`find ${item} -name '*.java' -o -name '*.xml'`)
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
            results.filter(item => item)
                .map(item => {
                    item = trim(item)
                    let [module, className] = parsePath(item)
                    if (item.endsWith('.java')) {
                        pathMap[reget(item, new RegExp('/src/main/java/(.+)\.java')).replace(/\//g, '.')] = item
                        pathMap[className] = item
                    }
                    return item
                })
                .forEach(item => eachJavaFile(item))
        })
}

function eachJavaFile(path) {
    let text = prepareJavaText(String(fs.readFileSync(path)))
    let [module, className] = parsePath(path)

    if (path.endsWith('.java')) {
        processHttp(text, path, module, className);
        processRpc(text, path, module, className);
        processErrorCode(text, path, module, className);
    }
    if (path.endsWith('/pom.xml')) {
        processPom(text, path, module)
    }
}

function processPom(text, path, module) {
    register(path, module, "-pom", "deps")
    let classInfo = config.data[module]['-pom']
    classInfo.$label = "POM"
    let info = config.data[module]['-pom'].deps
    info.$label = "依赖"
    info.$deps = Object.assign({}, info.$deps || {})
    regEach(text, /<dependency>([\s\S]*?)<\/dependency>/g, r => {
        let groupId = trim(reget(r[1], /<groupId>(.*?)<\/groupId>/))
        let artifactId = trim(reget(r[1], /<artifactId>(.*?)<\/artifactId>/))
        info.$deps[groupId + '.' + artifactId] = {
            groupId,
            artifactId,
            version: reget(r[1], /<version>(.*?)<\/version>/).replace(/\s+/g, '')
        }
    })
    if (!info.$version) {
        info.$version = reget(text, /\n(?:    |\t)<version>(.*?)<\/version>/)
    }
    info.$repo.$properties = Object.assign({}, info.$repo.$properties || {})
    regEach(text, /<properties>([\s\S]*?)<\/properties>/g, r => {
        let ps = trim(r[0])
        if(!ps) {
            return
        }

        regEach(ps, /<(.*?)>(.*?)<\/.*?>/g, r=> {
            info.$repo.$properties[trim(r[1])] = trim(r[2]).replace(/\s+/g, '')
        })
    })
}

function processErrorCode(text, path, module, className) {
    if (!text.match(/public enum\s+/)) {
        return;
    }

    register(path, module, "enum", className)

    let classInfo = config.data[module].enum
    classInfo.$label = "枚举类"

    let item = config.data[module].enum[className]

    item.$desc = getClassDesc(text, className)
    item.$package = getPackage(text)
    item.$label = getCnLabel(item.$desc) || item.$label
    item.$profile = reget(text, /(public\s+enum\s+[^\{]+){/) + "\n\n"
        + reget(text, /public enum\s+[^{]+\{([^;]+;)/)
            .replace(/\n\s*/g, '\n')
}

function processHttp(text, path, module, className){
    if (!text.match(/(?:@RestController|@Controller)/)) {
        return;
    }

    register(path, module, className)
    let classInfo = config.data[module][className]
    classInfo.$desc = getClassDesc(text, className)
    classInfo.$package = getPackage(text)
    classInfo.$label = getCnLabel(classInfo.$desc) || classInfo.$label
    classInfo.$profile = reget(text, /(public\s+(?:class|interface|abstract class)[^\{]+){/)

    classInfo.$path = reget(classInfo.$desc, /@RequestMapping\(\"(.*)\"\)/)
    if (classInfo.$path) {
        classInfo.$path = "/" + classInfo.$path.split("/").filter(item => item).join("/")
    }
    getHttpMethods(text).forEach(item => {
        register(path, module, className, item)
        classInfo[item].$desc = getMethodDesc(text, item)
        classInfo[item].$label = getCnLabel(classInfo[item].$desc) || classInfo[item].$label
        classInfo[item].$package = classInfo.$package
        classInfo[item].$path = reget(classInfo[item].$desc, /@\w+Mapping\(\"(.*)\"\)/)
        if (classInfo[item].$path) {
            classInfo[item].$path = "/" + classInfo[item].$path.split("/").filter(item => item).join("/")
        }
        classInfo[item].$requestMethod = reget(classInfo[item].$desc, /@(\w+)Mapping/)
        classInfo[item].$url = getModulePath(module) + classInfo.$path + classInfo[item].$path
        enrichCommonMethodInfo(text, classInfo[item])
        enrichExceptionCode(classInfo[item])
    })
}

function getModulePath(module) {
    if (!config.modulePath || !trim(config.modulePath[module])) {
        return ''
    }
    return '/' + trim(config.modulePath[module]).split("/").filter(item => item).join("/")
}

function processRpc(text, path, module, className){
    if (!(text.indexOf('org.apache.dubbo.config.annotation.Service') !== -1 &&
        text.indexOf('@Service') !== -1)) {
        return;
    }
    register(path, module, className)

    let classInfo = config.data[module][className]
    let [implClass, implPath] = getImpl(text)

    let implText = implPath ? prepareJavaText(String(fs.readFileSync(implPath))):""

    classInfo.$desc = getClassDesc(implText, implClass) ||  getClassDesc(text, className)
    classInfo.$label = getCnLabel(classInfo.$desc) || implClass || className
    classInfo.$title = module + '/' + (implClass || className)
    classInfo.$package = getPackage(implText || text)
    classInfo.$profile = reget(implText || text, /(public\s+(?:class|interface|abstract class)[^\{]+){/)

    getDubboMethods(text).forEach(item => {
        register(path, module, className, item)

        classInfo[item].$desc = getMethodDesc(implText, item) || getMethodDesc(text, item)
        classInfo[item].$label = getCnLabel(classInfo[item].$desc) || classInfo[item].$label
        classInfo[item].$title = classInfo.$title + '.' + classInfo[item].$name
        classInfo[item].$package = classInfo.$package
        enrichCommonMethodInfo(implText || text, classInfo[item])
        enrichExceptionCode(classInfo[item])
    })
}

function enrichExceptionCode(data) {
    if (!data.$desc) {
        return
    }
    data.$errorCode = {}
    const reg = /@(?:exception|errorCode)\S* (.*)/ig
    let nr = reg.exec(data.$desc)
    while (nr) {
        let str = trim(nr[1])
        if (str) {
            str = str.replace(/\s*:\s*/, ':').replace(/:+/g, ':')
            for (let pair of str.split(/\s+/)) {
                let pairs = pair.split(":")
                if (trim(pairs[0]) && trim(pairs[1])) {
                    data.$errorCode[trim(pairs[0])] = trim(pairs[1])
                }
            }
        }
        nr = reg.exec(data.$desc)
    }
}

function getCnLabel(str) {
    str = str + '\n'
    return reget(str, /"([^"]*?[\u4e00-\u9fa5][^"]*)"/) ||
        reget(str, /@Description([^:：@\*\n\/]*?[\u4e00-\u9fa5][^:：@\*\n\/]*)/i) ||
        reget(str, /\/([^:：@\*\n\/]*?[\u4e00-\u9fa5][^:：@\*\n\/]*)/) ||
        reget(str, /\*([^:：@\*\n\/]*?[\u4e00-\u9fa5][^:：@\*\n\/]*)/)
}

function enrichCommonMethodInfo(text, info) {
    let reg = new RegExp('[\\{\\};][^;\\}\\{]+\\s+((?:public)?\\s+(\\S+)\\s+'+info.$name+'\\s*\\(([^\\{\\};]*)\\))')
    let r = reg.exec(text)

    info.$profile = trim(r[1])
    info.$result = {
        $type: r[2]
    }
    enrichDomainInfo(info.$result, getFullClass(info.$result.$type.replace(/<.*>/g, ''), text), text)

    info.$params = {}
    let paramsStr = (r[3] + ",")
        .replace(/\([^()]*\)/g, word => {
            return word.replace(/,/g, '#@#').replace(/\s+/g, '')
        })
        .replace(/(<.*?>)/g, word => {
            return word.replace(/,/g, '@')
        })
        .replace(/(\w)\s*\.\.\./g, '$1[]')
    reg = new RegExp('([^,]+\\s+)?([A-Z][a-zA-Z_0-9<>\\[\\]@\\s]+[^\\s,])\\s+([^\\s,]+)\\s*,?', 'g')
    let nr = reg.exec(paramsStr)
    while (nr) {
        let x = {
            $desc: trim(nr[1]).replace('#@#', ',').replace('@', '\n@').trim(),
            $type: nr[2].replace(/@/g, ',')
        }
        info.$params[nr[3]] = x
        enrichDomainInfo(x, getFullClass(x.$type.replace(/<.*>/g, ''), text), text)

        nr = reg.exec(paramsStr)
    }
}

function enrichDomainInfo(result, fullClass, allText) {
    let path = fullClass.map(item => pathMap[item]).filter(item => item)[0]

    let text
    if (path) {
        text = prepareJavaText(String(fs.readFileSync(path)))
        if (allText.indexOf(text) !== -1) {
            return;
        }
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

    result.$desc = result.$desc + '\n' + getClassDesc(text, className)

    let reg = /\n\s+(?:private|public|protected)?\s+([^\s\n\-\(\)\=\+;\*@]+)\s+([a-zA-Z][a-zA-Z0-9_]*)\s*[;=]/g
    let r = reg.exec(text)
    while (r) {
        result[r[2]] = {
            $type: getRealType(r[1], result.$type),
            $desc: getFieldDesc(text, r[2])
        }
        enrichDomainInfo(result[r[2]],
            getFullClass(result[r[2]].$type.replace(/<.*>/g, ''), allText+'\n'+text), allText+'\n'+text)
        r = reg.exec(text)
    }

    let [implClass, implPath ] = getImpl(text)
    if (implClass) {
        let temp = result.$type
        result.$type = implClass
        enrichDomainInfo(result, getFullClass(implClass.replace(/<.*>/g, ''), allText+'\n'+text), allText+'\n'+text)
        result.$type = temp
    }
    return result
}

function prepareJavaText(text) {
    return text.replace(/return[^\n]*;/g, ';')
        .replace(/ *, */g, ',')
        .replace(/< */g, '<')
        .replace(/ *>/g, '>')
        .replace(/\n\s*\/\*[^\n]*/g, x => x.replace(/;/g, ''))
        .replace(/\n\s*\*[^\n]*/g, x => x.replace(/;/g, ''))
        .replace(/\n\s*@[^\n]*/g, x => x.replace(/;/g, ''))
}

function getRealType(fieldType, classType){
    if (fieldType.match(/<[A-Z]>/)) {
        return fieldType.replace(/<[A-Z]>/, `<${(trim(reget(classType, /[^<>]+<(.+)>/)) || "Object")}>`)
    }
    if (fieldType.match(/^[A-Z]$/)) {
        return fieldType.replace(/^[A-Z]$/, `${(trim(reget(classType, /[^<>]+<(.+)>/)) || "Object")}`)
    }

    return fieldType
}

function getHttpMethods(text) {
    let reg = /@\w+?Mapping\([^;]+?public\s+\S+\s+([\w\d]+)\s*\(/g

    let result = []
    let r = reg.exec(text)
    while (r) {
        result.push(r[1])
        r = reg.exec(text)
    }

    return result
}
function getDubboMethods(text) {
    let reg = /@Override[^;]+?public\s+\S+\s+([\w\d]+)\s*\(/g

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
    let strs = path.replace(sourceDir, '').split('/').filter(item => item)
    return Object.values({
        module: (reget(path, /.*\/([^/]+)\/src\/main\/java.*/) || reget(path, /.*\/([^/]+)\/.*?\.xml/)),
        className: strs[strs.length - 1].replace('.java', '')
    })
}

function getRepoInfo(path) {
    for (let key of Object.keys(repoMap)) {
        if (path.indexOf(key) !== -1) {
            return repoMap[key]
        }
    }
    return {}
}

function register(path, module, className, methodName, info) {
    const repoInfo = getRepoInfo(path)
    if (module && !config.data[module]) {
        config.data[module] = Object.assign({
            $name: module,
            $label: module,
            $title: module,
            $type: 'module',
            $hidden: false,
            $repo: repoInfo
        }, config.data[module] || {})
    }

    if (className && !config.data[module][className]) {
        config.data[module][className] = Object.assign({
            $name: className,
            $module: module,
            $label: className,
            $title: module+'/'+className,
            $type: 'class',
            $hidden: false,
            $repo: repoInfo
        }, config.data[module][className] || {})
    }

    if (methodName && !config.data[module][className][methodName]) {
        config.data[module][className][methodName] = Object.assign({
            $name: methodName,
            $module: module,
            $class: className,
            $hidden: false,
            $label: methodName,
            $title: config.data[module][className].$title + '.' + methodName,
            $type: 'method',
            $repo: repoInfo
        },methodName && !config.data[module][className][methodName] || {},info || {})
    }
}

function getImpl(text) {
    let interfaceName = reget(text, /public\s+class\s+\S+\s+(?:implements|extends)\s+(\S+)\s*/)

    return Object.values({
        implClass: interfaceName,
        implPath: pathMap[reget(text, new RegExp(`import\\s+(.+${interfaceName});`))]
    })
}

function getFullClass(className, text) {
    let fullClass = [reget(text, new RegExp(`\\s*import\\s+(\\S+\\.${className})\\s*;`))].filter(item => item)
    if (fullClass.length < 1) {
        let reg = /\s*import\s+(\S+)\.\*\s*;/g
        let r = reg.exec(text)
        while (r) {
            fullClass.push(`${r[1]}.${className}`)
            r = reg.exec(text)
        }

        let regPackage = /\s*package\s+(\S+)\s*;/g
        let r1 = regPackage.exec(text)
        while (r1) {
            fullClass.push(`${r1[1]}.${className}`)
            r1 = regPackage.exec(text)
        }
    }
    return fullClass.filter(item => item)
}

function getPackage(text) {
    return reget(text, /\s*package\s+(.+);/)
}

function getClassDesc(text, className) {
    let reg = new RegExp('[;]([^;]+)public\\s+(?:class|enum|interface|abstract class)\\s+'+className+'\\s*')

    let r = reg.exec(text)
    return r ? trim(r[1]).replace(/\n\s*/g, '\n'): ""
}

function getMethodDesc(text, methodName) {
    text = text.replace(/public\s+(?:class|interface|abstract class)[^\{]+{/, ";")
    let reg = new RegExp('[\\{\\};]\\s*\n\\s*([/@][^;]+)\\s+(?:public)?\\s+\\S+\\s+'+methodName+'\\s*\\(')

    let r = reg.exec(text)
    return r ? trim(r[1]).replace(/\n\s*/g, '\n'): ""
}

function getFieldDesc(text, fieldName) {
    text = text.replace(/public\s+(?:class|interface|abstract class)[^{]+{/, ";")
    let reg = new RegExp('[\\{\\};].*\n\\s*([/@][^;]+)?(?:private|public|protected)\\s+\\S+\\s+'+fieldName+'\\s*[;=]([^\n]*)')

    let r = reg.exec(text)
    return r ? trim(trim(r[1]) + "\n" + trim(r[2]).replace(/(.*);/, '默认: $1 \n'))
        .replace(/\n\s*/g, '\n'): ""
}


