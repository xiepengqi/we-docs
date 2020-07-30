<template>
  <el-container id="app">
    <el-header>Header</el-header>
    <el-container>
      <el-aside>
        <left-nav :menus="menus" />
      </el-aside>
      <el-main>Main</el-main>
    </el-container>
  </el-container>
</template>

<script>
import LeftNav from './components/LeftNav'
import Vue from 'vue'
export default {
  components: {
    LeftNav
  },
  data() {
    return {
      menus: [
        {
          name: 1321,
          child: [{
            name: 34
          }]
        },
        {
          name: 423,
          child: [{
            name: 34
          }]
        },
        {
          name: 53,
          child: [{
            name: 34
          }]
        },
        {
          name: 646,
          child: [{
            name: 34
          }]
        }
      ]
    }
  },
  mounted() {
    this.$http.get('/data').then(resp => {
      Vue.prototype.$data = resp
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
