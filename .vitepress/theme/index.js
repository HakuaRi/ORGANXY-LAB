import DefaultTheme from 'vitepress/theme'
import { h, computed } from 'vue'
import { useRoute } from 'vitepress'
import LayoutSwitch from './components/LayoutSwitch.vue'
import MusicInfo from './components/MusicInfo.vue'
import EventWidget from './components/EventWidget.vue'
import HueWindRose from './components/HueWindRose.vue'
import BgParallax from './components/BgParallax.vue'
import './style.css'

export default {
  ...DefaultTheme,
  Layout() {
    const route = useRoute()
    const isHome = computed(() => route.path === '/')

    return h('div', [
      isHome.value ? h(BgParallax) : null,
      h(DefaultTheme.Layout, null, {
        // 把按钮塞到导航栏右侧
        'nav-bar-content-after': () => h(LayoutSwitch),
        'layout-bottom': () => h(EventWidget)
      })
    ])
  },
  enhanceApp({ app }) {
    // 注册全局组件
    app.component('MusicInfo', MusicInfo)
    app.component('BgParallax', BgParallax)
  }
}
