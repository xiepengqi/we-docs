<template>
  <el-container id="app">
    <el-aside>
      <left-nav :menus="menus" />
    </el-aside>
    <el-main></el-main>
  </el-container>
</template>

<script>
import LeftNav from './components/LeftNav'
export default {
  components: {
    LeftNav
  },
  data() {
    return {
      menus: {}
    }
  },
  mounted() {
    this.$http.get('/data').then(resp => {
      this.menus = resp.data
    })
  }
}
</script>

<style scoped lang="scss">
  #app {
    .el-header{
      background-color: #d7dade;
      color: #333;
      line-height: 60px;
    }
    .el-aside {
      color: #333;
      line-height: 500px;
    }

    .el-main {
      background-color: #e4e9ee;
      color: #333;
      line-height: 500px;
    }
  }
</style>
