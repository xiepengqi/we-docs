import Vue from 'vue'
import App from './App.vue'

import Element from 'element-ui'
import 'element-ui/lib/theme-chalk/index.css'
import './util/index'
import store from './store'

Vue.use(Element)

Vue.config.productionTip = false
Vue.prototype.$content = ''

new Vue({
  store,
  render: h => h(App)
}).$mount('#app')

