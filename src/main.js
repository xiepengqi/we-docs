let {trim, e} = require('xpq-js-lib')
let fs = require("fs")
let path = require("path")
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
        get('/repos', ctx => ({
            repos: listSnapshots()
        })),
        get('/diff', ctx => {
            const query = (ctx.req && ctx.req.query) || {}
            const repo = query.repo
            const base = query.base
            const target = query.target
            if (!repo || !base || !target) {
                return {
                    $title: 'Invalid Diff Query',
                    $desc: 'require query params: repo, base, target',
                    $type: 'diff'
                }
            }
            const baseSnapshot = readSnapshot(repo, base) || readSnapshot(repo, sanitizeBranchName(base))
            const targetSnapshot = readSnapshot(repo, target) || readSnapshot(repo, sanitizeBranchName(target))
            if (!baseSnapshot || !targetSnapshot) {
                return {
                    $title: 'Snapshot Not Found',
                    $desc: `repo=${repo} base=${base} target=${target} not found`,
                    $type: 'diff'
                }
            }
            return diffSnapshots(baseSnapshot, targetSnapshot)
        }),
        get('/data', ctx => {
            const query = (ctx.req && ctx.req.query) || {}
            if (query.repo && query.branch) {
                const snapshot = readSnapshot(query.repo, query.branch)
                if (snapshot) {
                    return snapshot
                }
                return {
                    $title: 'Snapshot Not Found',
                    $desc: `repo=${query.repo} branch=${query.branch} not found`,
                    $type: 'snapshot'
                }
            }
            return config.data
        }),
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

function getSnapshotDir() {
    return config.snapshotDir || path.join(__dirname, '..', 'snapshots')
}

function listSnapshots() {
    const snapshotDir = getSnapshotDir()
    if (!fs.existsSync(snapshotDir)) {
        return {}
    }
    const repos = {}
    fs.readdirSync(snapshotDir).forEach(repoName => {
        const repoPath = path.join(snapshotDir, repoName)
        if (!fs.statSync(repoPath).isDirectory()) {
            return
        }
        const branches = fs.readdirSync(repoPath).filter(branchName => {
            const branchPath = path.join(repoPath, branchName)
            return fs.statSync(branchPath).isDirectory()
        })
        repos[repoName] = branches
    })
    return repos
}

function readSnapshot(repoName, branchName) {
    const snapshotDir = getSnapshotDir()
    if (!snapshotDir) {
        return null
    }
    const snapshotPath = path.join(snapshotDir, repoName, branchName, 'latest.json')
    if (!fs.existsSync(snapshotPath)) {
        return null
    }
    return JSON.parse(fs.readFileSync(snapshotPath))
}

function sanitizeBranchName(branchName) {
    return (branchName || 'UNKNOWN').replace(/[^a-zA-Z0-9_.-]+/g, '__')
}

function buildIndices(snapshot) {
    const http = {}
    const dubbo = {}
    const enums = {}
    if (!snapshot || typeof snapshot !== 'object') {
        return { http, dubbo, enums }
    }
    Object.keys(snapshot).filter(key => !key.startsWith('$')).forEach(moduleKey => {
        const moduleInfo = snapshot[moduleKey]
        if (!moduleInfo || typeof moduleInfo !== 'object') {
            return
        }
        Object.keys(moduleInfo).filter(key => !key.startsWith('$')).forEach(classKey => {
            const classInfo = moduleInfo[classKey]
            if (!classInfo || typeof classInfo !== 'object') {
                return
            }
            if (classKey === 'enum') {
                Object.keys(classInfo).filter(key => !key.startsWith('$')).forEach(enumKey => {
                    const enumInfo = classInfo[enumKey]
                    if (!enumInfo || typeof enumInfo !== 'object') {
                        return
                    }
                    const key = buildEnumKey(moduleKey, enumKey)
                    if (!enums[key]) {
                        enums[key] = {
                            key,
                            module: moduleKey,
                            clazz: 'enum',
                            name: enumKey,
                            title: enumInfo.$title || (moduleKey + '/enum/' + enumKey),
                            data: enumInfo
                        }
                    }
                })
                return
            }
            Object.keys(classInfo).filter(key => !key.startsWith('$')).forEach(methodKey => {
                const methodInfo = classInfo[methodKey]
                if (!methodInfo || typeof methodInfo !== 'object') {
                    return
                }
                if (methodInfo.$type !== 'method') {
                    return
                }
                const key = buildMethodKey(methodInfo)
                const info = {
                    key,
                    module: methodInfo.$module || moduleKey,
                    clazz: methodInfo.$class || classKey,
                    name: methodInfo.$name || methodKey,
                    title: methodInfo.$title,
                    url: methodInfo.$url,
                    requestMethod: methodInfo.$requestMethod,
                    profile: methodInfo.$profile,
                    data: methodInfo
                }
                if (methodInfo.$url || methodInfo.$requestMethod) {
                    if (!http[key]) {
                        http[key] = info
                    }
                } else {
                    if (!dubbo[key]) {
                        dubbo[key] = info
                    }
                }
            })
        })
    })
    return { http, dubbo, enums }
}

function buildMethodKey(methodInfo) {
    const module = methodInfo.$module || ''
    const clazz = methodInfo.$class || ''
    const name = methodInfo.$name || ''
    const url = methodInfo.$url || ''
    const requestMethod = methodInfo.$requestMethod || ''
    const profile = methodInfo.$profile || ''
    if (url || requestMethod) {
        return [module, clazz, name, requestMethod, url].join('|')
    }
    return [module, clazz, name, profile].join('|')
}

function buildEnumKey(moduleKey, enumName) {
    return [moduleKey, 'enum', enumName].join('|')
}

function stableStringify(obj) {
    if (obj === null || obj === undefined) {
        return ''
    }
    if (typeof obj !== 'object') {
        return String(obj)
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(stableStringify).join(',') + ']'
    }
    const keys = Object.keys(obj).sort()
    return '{' + keys.map(key => JSON.stringify(key) + ':' + stableStringify(obj[key])).join(',') + '}'
}

function diffIndex(baseIndex, targetIndex, fields) {
    const baseKeys = new Set(Object.keys(baseIndex))
    const targetKeys = new Set(Object.keys(targetIndex))
    const added = []
    const removed = []
    const changed = []

    for (const key of targetKeys) {
        if (!baseKeys.has(key)) {
            added.push(targetIndex[key])
        }
    }
    for (const key of baseKeys) {
        if (!targetKeys.has(key)) {
            removed.push(baseIndex[key])
        }
    }
    for (const key of baseKeys) {
        if (!targetKeys.has(key)) {
            continue
        }
        const a = baseIndex[key].data
        const b = targetIndex[key].data
        const changes = {}
        fields.forEach(field => {
            const av = stableStringify(a[field])
            const bv = stableStringify(b[field])
            if (av !== bv) {
                changes[field] = {
                    base: a[field],
                    target: b[field]
                }
            }
        })
        if (Object.keys(changes).length > 0) {
            changed.push({
                key,
                base: baseIndex[key],
                target: targetIndex[key],
                changes
            })
        }
    }

    return { added, removed, changed }
}

function diffSnapshots(baseSnapshot, targetSnapshot) {
    const baseIndices = buildIndices(baseSnapshot)
    const targetIndices = buildIndices(targetSnapshot)

    const httpFields = [
        '$desc',
        '$profile',
        '$url',
        '$requestMethod',
        '$params',
        '$result',
        '$errorCode'
    ]
    const dubboFields = [
        '$desc',
        '$profile',
        '$params',
        '$result',
        '$errorCode'
    ]
    const enumFields = [
        '$desc',
        '$profile',
        '$label'
    ]

    const http = diffIndex(baseIndices.http, targetIndices.http, httpFields)
    const dubbo = diffIndex(baseIndices.dubbo, targetIndices.dubbo, dubboFields)
    const enums = diffIndex(baseIndices.enums, targetIndices.enums, enumFields)

    const added = [].concat(http.added, dubbo.added, enums.added)
    const removed = [].concat(http.removed, dubbo.removed, enums.removed)
    const changed = [].concat(http.changed, dubbo.changed, enums.changed)

    return {
        $type: 'diff',
        $base: baseSnapshot.$branch || (baseSnapshot.$repo || {}).$branchName,
        $target: targetSnapshot.$branch || (targetSnapshot.$repo || {}).$branchName,
        $generatedAt: new Date().toISOString(),
        http,
        dubbo,
        enum: enums,
        added,
        removed,
        changed
    }
}
