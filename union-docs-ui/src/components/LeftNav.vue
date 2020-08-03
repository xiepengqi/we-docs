<template>
  <div class="left-nav">
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        unique-opened
        @open="handleOpen"
        @close="handleClose"
      >
        <menu-elem v-for="(menu, index) in Object.values(menus)" :key="menu.$label" :index="String(index)" :data="menu" @click="setContent(menu)" />
      </el-menu>
    </el-scrollbar>
  </div>

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
  .left-nav {
    transition: width 0.28s;
    height: 100%;
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 1001;
    overflow: hidden;
  }

  .scrollbar-wrapper {
    overflow-x: hidden !important;
  }

  .el-scrollbar__bar.is-vertical {
    right: 0;
  }

  .el-scrollbar {
    height: 100%;
  }

</style>
