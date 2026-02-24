# we-docs

用于扫描本地 Java 工程（控制器、Dubbo 服务、枚举、POM 依赖等）并生成可查询的文档数据，启动后提供一个本地 Web 服务与静态 UI。

## 功能概览
- 定时扫描 `config.js` 中配置的源码目录
- 解析 Java 源码中的 HTTP 接口、Dubbo 服务、枚举类
- 解析 `pom.xml` 依赖信息
- 每次扫描生成分支快照（`latest.json`）
- （可选）根据仓库信息自动拉取指定分支
- 提供 `/data` 接口返回解析结果，静态页面位于 `static/ui/`
- 提供 `/repos` 查看可用仓库/分支、`/diff` 比较分支接口差异

## 运行方式
- 开发：`npm run dev`
- 后台启动：`npm start`
- 停止：`npm run stop`

## 接口说明
- `GET /repos`：返回快照目录中可用的 `repo -> branches`
- `GET /data?repo=xxx&branch=yyy`：返回指定分支的 `latest.json`
- `GET /diff?repo=xxx&base=branchA&target=branchB`：返回新增/删除/变更接口列表

## 主要配置
见 `config.js`：
- `sourceDir`：源码根目录（需要存在）
- `targetReg`：过滤仓库目录名的正则
- `serverPort`：服务端口
- `refreshSec`：扫描间隔（秒）
- `snapshotDir`：分支快照目录（默认 `snapshots/`）
- `data.$nexusBrowseUrl`：Nexus 依赖浏览地址（可选）

## 目录结构
- `src/main.js`：启动 HTTP 服务、路由、以及 Git 拉取逻辑
- `src/parser.js`：解析 Java/POM，构建数据结构
- `static/ui/`：静态页面资源
- `snapshots/`：分支快照（`{repo}/{branch}/latest.json`）

## 说明
该项目依赖本机存在 Java 项目源码目录，并且需要可访问 git 远程（如启用自动拉取）。
