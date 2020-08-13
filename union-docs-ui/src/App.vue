<template>
  <el-container
    id="app"
    v-loading.fullscreen.lock="Object.keys(menus).length <= 0"
    element-loading-text="拼命加载中"
    element-loading-spinner="el-icon-loading"
    element-loading-background="rgba(0, 0, 0, 0.8)"
  >
    <el-aside>
      <left-nav :menus="menus" />
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
      menus: {}
    }
  },
  computed: {
    htmlDoc() {
      return marked(this.buildMd(this.$store.state.content))
    }
  },
  mounted() {
    this.$http.get('/data').then(resp => {
      this.menus = this.buildMenus(resp.data)
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
    buildMatchStr(...strs) {
      const x = ''
      if (!strs) {
        return x
      }
      return strs.map(item => item ? item.trim() : '')
        .filter(item => item).join(' ')
    },
    buildMenus(data) {
      const text = location.href.split('?', 2)[1] || ''
      const strs = text.split('/')
      this.filterData(data, strs[0])
      for (const module of Object.values(data)) {
        this.filterData(module, strs[1])
        for (const clazz of Object.values(module)) {
          this.filterData(clazz, strs[2])
        }
      }

      return data
    },
    filterData(data, str) {
      if ((typeof data) !== 'object') {
        return
      }
      if (str) {
        for (const del of Object.keys(data).filter(item => {
          if (item.startsWith('$')) {
            return false
          }
          const matchStr = this.buildMatchStr(item, data[item].$label, data[item].$name, data[item].$desc)
          for (const k of str.split('\s+')) {
            if (matchStr.toUpperCase().indexOf(k.toUpperCase()) === -1) {
              return true
            }
          }
          return false
        })) {
          delete data[del]
        }
      }
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
      const params = !json.$params ? '' : `
#### Params
\`\`\`
${JSON.stringify(json.$params, null, 2)}
\`\`\`
`
      const result = !json.$result ? '' : `
#### Result
\`\`\`
${JSON.stringify(json.$result, null, 2)}
\`\`\`
`
      return `
### ${json.$title}
${httpInfo}
${desc}
${repoInfo}
${params}
${result}
`
    }
  }
}
</script>

<style scoped lang="scss">
  #app {

  }
</style>
