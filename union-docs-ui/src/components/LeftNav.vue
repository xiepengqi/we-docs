<template>
  <el-menu
    unique-opened
    @open="handleOpen"
    @close="handleClose"
  >
    <menu-elem v-for="(menu, index) in Object.values(menus)" :key="menu.$label" :index="String(index)" :data="menu" @click="setContent(menu)" />
  </el-menu>
</template>

<script>
import MenuElem from './MenuElem'
export default {
  components: {
    MenuElem
  },
  props: {
    menus: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {

    }
  },
  methods: {
    handleOpen(key, keyPath) {
    },
    handleClose(key, keyPath) {
    }

  }
}
</script>

<style lang="scss">

</style>
