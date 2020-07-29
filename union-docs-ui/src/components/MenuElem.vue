<template>
  <el-submenu v-if="data.child && data.child.length >0" :index="index">
    <template slot="title">{{ data.name }}</template>
    <menu-elem v-for="menu in data.child" :key="menu.name" :data="menu" />
  </el-submenu>
  <el-menu-item v-else>{{ data.name }}</el-menu-item>
</template>

<script>
export default {
  name: 'MenuElem',
  props: {
    // {name: "name", child: []}
    index: {
      type: Number,
      default: () => 0
    },
    data: {
      type: Object,
      default: () => {}
    }
  }
}
</script>

<style>

</style>
