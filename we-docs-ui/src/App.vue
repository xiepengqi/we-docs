<template>
  <el-container
    id="app"
    v-loading.fullscreen.lock="Object.keys(menus).length <= 0"
    element-loading-text="拼命加载中"
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(0, 0, 0, 0.8)"
  >
    <el-aside>
      <el-input v-model="searchStr" placeholder="select..." class="search-input" clearable />
      <left-nav :menus="menus" class="left-nav" />
    </el-aside>
    <el-main>
      <div v-if="Object.keys(menus).length > 0" v-highlight v-html="htmlDoc" />
    </el-main>
  </el-container>
</template>

<script>
import LeftNav from './components/LeftNav'
import marked from 'marked'

export default {
  components: {
    LeftNav
  },
  data() {
    return {
      searchStr: '',
      menus: {}
    }
  },
  computed: {
    htmlDoc() {
      return marked(this.buildMd(this.$store.state.content)).replace(/&lt;br&gt;/g, '\n')
    }
  },
  watch: {
    searchStr() {
      for (const module of Object.values(this.menus)) {
        for (const clazz of Object.values(module)) {
          this.filterData(clazz, this.searchStr)
          this.checkHidden(clazz)
        }
        this.checkHidden(module)
      }
    }
  },
  mounted() {
    this.$http.get('/data').then(resp => {
      this.menus = resp.data
      this.$store.state.content = this.menus
    })
    marked.setOptions({
      renderer: new marked.Renderer(),
      gfm: true,
      tables: true,
      breaks: false,
      pedantic: false,
      smartLists: true,
      sanitize: true,
      smartypants: false
    })
  },
  methods: {
    checkHidden(data) {
      if ((typeof data) !== 'object') {
        return
      }
      let i = 0
      for (const value of Object.values(data)) {
        if ((typeof value) === 'object' && !value.$hidden) {
          i++
          break
        }
      }
      if (i <= 0) {
        data.$hidden = true
      } else {
        data.$hidden = false
      }
    },
    buildMatchStr(...strs) {
      const x = ''
      if (!strs) {
        return x
      }
      return strs.map(item => item ? item.trim() : '')
        .filter(item => item).join(' ')
    },
    filterData(data, str) {
      if ((typeof data) !== 'object') {
        return
      }
      str = str || ''
      Object.keys(data).forEach(item => {
        if ((typeof data[item]) !== 'object') {
          return
        }
        if (!str) {
          data[item].$hidden = false
          return
        }
        const matchStr = this.buildMatchStr(item, data[item].$name, data[item].$label, data[item].$title)
        let hidden = false
        for (const k of str.split(/\s+/).filter(item => item)) {
          if (matchStr.toUpperCase().indexOf(k.toUpperCase()) === -1) {
            hidden = true
            break
          }
        }
        data[item].$hidden = hidden
      })
    },
    trimDesc(str) {
      if (!str) {
        return ''
      }

      return str.replace(/[\/\*]+/g, '').trim().replace(/[\n]+/g, '<br>')
    },
    buildTable(data, title, record) {
      let str = ''
      if (title) {
        str = `#### ${title}
`
      } else {
        str = `##### - ${data.$type}
`
      }
      str += `|字段名称|类型|描述|
|---|---|---|
`
      const ext = {}
      for (const key of Object.keys(data)) {
        if (key.startsWith('$')) {
          continue
        }
        const item = data[key]
        str += `|${key}|${item.$type}|${this.trimDesc(item.$desc)}|
`
        if (Object.keys(item).filter(item => !item.startsWith('$')).length > 0) {
          ext[item.$type] = item
        }
      }
      for (const item of Object.values(ext)) {
        if (record[item.$type]) {
          continue
        }
        str += this.buildTable(item, null, record)
        record[item.$type] = item
      }
      return str
    },
    buildErrorCode(data) {
      if (!data) {
        return ''
      }
      let str = `#### Error Code
`
      str += `|错误编码|错误信息|
|---|---|
`
      for (const key of Object.keys(data)) {
        str += `|${key}|${data[key]}|
`
      }

      return str
    },
    buildMd(json) {
      const repoInfo = (json.$repo || json.$branch) ? `
#### Git Repo
\`\`\`
${json.$repo ? json.$repo : ''}
${json.$branch ? json.$branch : ''}
\`\`\`
` : ''
      const httpInfo = `
${json.$url ? `URL: ${json.$url}` : ''}

${json.$requestMethod ? `Method: ${json.$requestMethod}` : ''}
`
      const desc = `
\`\`\`
${json.$desc || ''}
${json.$profile || ''}
\`\`\`
`
      const params = !json.$params ? '' : this.buildTable(json.$params, 'Params', {})
      const result = !json.$result ? '' : this.buildTable(json.$result, 'Result', {})
      const errorCode = this.buildErrorCode(json.$errorCode)
      const mdStr = `
### ${json.$title}
${httpInfo}
${desc}
${repoInfo}
${params}
${result}
${errorCode}
`
      console.log(mdStr)
      return mdStr
    }
  }
}
</script>

<style scoped lang="scss">
  #app {
    .search-input {
      position: fixed;
      top: 5px;
      width: 250px;
      /deep/ .el-input__inner {
        border: 0;
      }
    }
  }
</style>

<style lang="scss">
  table {
    border-collapse: collapse;
    white-space: pre-line;
    border:1px solid;
    font-size: 14px;
    tr td:first-child {
      width: 200px;
    }
    tr td:nth-child(2) {
      width: 200px;
    }
    tr td:nth-child(3) {
      width: 300px;
    }
    thead {
      th
      {
        background-color: #e1dfe3;
        width: 100px;
      }
    }
    th {
      border: 1px solid #cad9ea;
      height: 30px;
    }
    td {
      border: 1px solid #cad9ea;
      height: 30px;
      padding-left: 3px;
    }
  }
</style>
