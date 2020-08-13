<template>
  <el-menu
    class="left-menu"
    unique-opened
    @open="handleOpen"
    @close="handleClose"
  >
    <menu-elem v-for="(menu, index) in Object.values(getMenus(menus))" :key="menu.$name" :index="String(index)" :data="menu" />
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
    getMenus(menus) {
      const temp = {}
      for (const key of Object.keys(menus)) {
        if (!key.startsWith('$')) {
          temp[key] = menus[key]
        }
      }
      return temp
    },
    handleOpen(key, keyPath) {
    },
    handleClose(key, keyPath) {
    }

  }
}
</script>

<style lang="scss" scoped>
  .left-menu {
    position: fixed;
    top: 40px;
    bottom: 0;
    left: 0;
    width: 260px;
    overflow: auto;
  }
</style>
