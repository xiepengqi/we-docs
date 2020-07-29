<template>
  <el-submenu v-if="data.child && data.child.length >0" :index="data.name">
    <template slot="title">{{ data.name }}</template>
    <menu-item :data="data.child" />
  </el-submenu>
  <el-menu-item v-else :index="data.name">{{data.name}}</el-menu-item>
</template>

<script>
export default {
  props: {
    // {name: "name", child: []}
    data: {
      type: Object,
      default: () => {}
    }
  }
}
</script>

<style>

</style>
