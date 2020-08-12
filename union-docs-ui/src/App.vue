<template>
  <el-container id="app">
    <el-aside>
      <left-nav :menus="menus" />
    </el-aside>
    <el-main>
      <div v-highlight v-html="htmlDoc" />
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
      this.menus = resp.data
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
    buildMd(json) {
      const repoInfo = `
#### Git Repo
\`\`\`
${json.$repo ? json.$repo : ''}
${json.$branch ? json.$branch : ''}
\`\`\`
`
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
### ${json.$label}
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
