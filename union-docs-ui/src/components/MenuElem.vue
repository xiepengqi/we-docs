<template>
  <el-submenu v-if="data.$type !== 'method'" :index="index">
    <template slot="title">
      <el-tooltip class="item" effect="dark" placement="right">
        <div slot="content" style="white-space: pre-line;">{{ data.$desc || '暂无描述' }}</div>
        <span>{{ data.$name }}</span>
      </el-tooltip>
    </template>
    <menu-elem v-for="(menu, i) in child" :key="menu.$name" :data="menu" :index="index + i" />
  </el-submenu>

  <el-tooltip v-else class="item" effect="dark" placement="right">
    <div slot="content" style="white-space: pre-line;">{{ data.$desc || "暂无描述" }}</div>
    <el-menu-item>{{ data.$name }}</el-menu-item>
  </el-tooltip>

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
    }
  }
}
</script>

<style>

</style>
