<template>
  <el-menu
    @open="handleOpen"
    @close="handleClose"
  >
    <menu-elem v-for="(menu, index) in menus" :key="menu.name" :index="index" :data="menu" />
  </el-menu>

</template>

<script>
import MenuElem from './MenuElem'
export default {
  components: {
    MenuElem

  },
  props: {
    // [{name: "name", child: []}]
    menus: {
      type: Array,
      default: () => []
    }
  },
  data() {
    return {

    }
  },
  methods: {
    handleOpen(key, keyPath) {
      console.log(key, keyPath)
    },
    handleClose(key, keyPath) {
      console.log(key, keyPath)
    }
  }
}
</script>

<style>

</style>
