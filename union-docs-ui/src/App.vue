<template>
  <el-container id="app">
    <el-header>Header</el-header>
    <el-container>
      <el-aside>
        <left-menu />
      </el-aside>
      <el-main>Main</el-main>
    </el-container>
  </el-container>
</template>

<script>
import LeftMenu from './components/LeftMenu'
export default {
  components: {
    LeftMenu
  }
}
</script>

<style scoped lang="scss">
  #app {
    .el-header{
      background-color: #B3C0D1;
      color: #333;
      text-align: center;
      line-height: 60px;
    }
    .el-aside {
      background-color: #D3DCE6;
      color: #333;
      text-align: center;
      line-height: 200px;
    }

    .el-main {
      background-color: #E9EEF3;
      color: #333;
      text-align: center;
      line-height: 160px;
    }
  }
</style>
