import Vue from 'vue'
import App from './App.vue'

import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './util/index'
import store from './store'
import hljs from 'highlight.js'
import 'highlight.js/styles/default.css'

Vue.directive('highlight', (el) => {
  const blocks = el.querySelectorAll('pre code')
  blocks.forEach((block) => {
    hljs.highlightBlock(block)
  })
})

Vue.use(Element)

Vue.config.productionTip = false
Vue.prototype.$content = ''

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')

