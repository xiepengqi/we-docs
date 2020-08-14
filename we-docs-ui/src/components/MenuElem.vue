<template>
  <div v-if="!data.$hidden">
    <el-submenu v-if="data.$type !== 'method'" :index="index">
      <template slot="title">
        <span @click="setContent">{{ data.$label }}</span>
      </template>
      <menu-elem v-for="(menu, i) in child" :key="menu.$name" :data="menu" :index="index + i" />
    </el-submenu>

    <el-menu-item v-else @click="setContent">{{ data.$label }}</el-menu-item>
  </div>

</template>

<script>
export default {
  name: 'MenuElem',
  props: {
    index: {
      type: String,
      default: () => 0
    },
    data: {
      type: Object,
      default: () => {}
    }
  },
  data() {
    return {
      child: this.getChild(this.data)
    }
  },
  methods: {
    getChild(data) {
      return Object.keys(data).filter(item => !item.startsWith('$'))
        .map(item => data[item])
    },
    setContent() {
      this.$store.state.content = this.data
    }
  }
}
</script>

<style>

</style>
