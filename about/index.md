---
layout: page
---
<script setup>
import {
  VPTeamPage,
  VPTeamPageTitle,
  VPTeamMembers,
  VPTeamPageSection
} from 'vitepress/theme'

// 第一组
const group1 = [
  {
    avatar: '/members/Cedrene.png',
    name: 'C̸e҉d̴r̸e҉n̴e҉',
    desc: '“”'
  },
  {
    avatar: '/members/Patchoulene.png',
    name: 'Patchoulene',
    desc: '“神金”'
  },
  {
    avatar: '/members/Paclitaxel.png',
    name: 'Paclitaxel',
    desc: '“你说句话啊”'
  },
  {
    avatar: '/members/Curcumol.png',
    name: 'Curcumol',
    desc: '“唐”'
  },
  {
    avatar: '/members/Guaiol.png',
    name: 'Guaiol',
    desc: '“懒虫”'
  },
    {
    avatar: '/members/Apalutamide.png',
    name: 'Apalutamide',
    desc: '“科技哥”'
  },
    {
    avatar: '/members/Milnaclpran.png',
    name: 'Levomilnaclpran',
    desc: '“急急急急急”'
  },
]

// 第二组
const group2 = [
  {
    avatar: '/members/Eplerenone.png',
    name: 'Eplerenone',
    desc: '“可爱捏”'
  },
  {
    avatar: '/members/Quinine.png',
    name: 'Quinine',
    desc: '“傲娇是吧”'
  }
]

// 第三组
const group3 = [

  {
    avatar: '/members/Ritonavir.png',
    name: 'Ritonavir',
    desc: '“你舅宠他爸”'
  },
  {
    avatar: '/members/Oseltamivir.png',
    name: 'Oseltamivir',
    desc: '“你真的不懂吗？”'
  },
  {
    avatar: '/members/Anisodamine.png',
    name: 'Anisodamine',
    desc: '“臭猫！”'
  },
    {
    avatar: '/members/Aminopterin.png',
    name: 'Aminopterin',
    desc: '“人呢？”'
  }
]

// 第四组
const group4 = [
  {
    avatar: '/members/Mezerein.png',
    name: 'Mezerein',
    desc: '“玩游戏玩的”'
  },
  {
    avatar: '/members/Delphinine.png',
    name: 'Delphinine',
    desc: '“休息一下吧”'
  },
  {
    avatar: '/members/Spiramine A.png',
    name: 'Spiramine A',
    desc: '“这个时钟是干嘛的？”'
  },
  {
    avatar: '/members/Homoharringtonine.png',
    name: 'Homoharringtonine',
    desc: '“不是，兄弟？”'
  }
]

// 第五组
const group5 = [
  {
    avatar: '/members/Indocyanine Green.png',
    name: 'Indocyanine Green',
    desc: '“这个算闷骚吗”'
  },
  {
    avatar: '/members/Bromothymol Blue.png',
    name: 'Bromothymol Blue',
    desc: '“头脑过于简单”'
  },
  {
    avatar: '/members/Nomilin.png',
    name: 'Nomilin',
    desc: '“别种花了”'
  }
]

// 第六组
const group6 = [
    {
    avatar: '/members/Suberogorgin.png',
    name: 'Suberogorgin',
    desc: '“什么老头环”'
  },
  {
    avatar: '/members/Gadoteridol.png',
    name: 'Gadoteridol',
    desc: '“真的光环吗？能吃吗！”'
  },
  {
    avatar: '/members/Isorosmanol.png',
    name: 'Isorosmanol',
    desc: '“嘿！前面不只是向日葵”'
  }
]

//第七组
const group7 = [
    {
    avatar: '/members/Vincristine.png',
    name: 'Vincristine',
    desc: '“ctrl键在哪来着...”'
  },
  {
    avatar: '/members/Ryanodine.png',
    name: 'Ryanodine',
    desc: '“卡了”'
  },
  {
    avatar: '/members/Zoanthamine.png',
    name: 'Zoanthamine',
    desc: '“耶~，，欸？”'
  },
  {
    avatar: '/members/Ginkgolide B.png',
    name: 'Ginkgolide B',
    desc: '“你能别这样看我吗？”'
  }
]

//第八组
const group8 = [
    {
    avatar: '/members/Brevetoxin B.png',
    name: 'Brevetoxin B',
    desc: '“你那边网络是不是不太好。。？”'
  },
  {
    avatar: '/members/Verbenalin.png',
    name: 'Verbenalin',
    desc: '“主播耳朵那么长不麻烦吗？”'
  },
  {
    avatar: '/members/Xylenol Orange.png',
    name: 'Xylenol Orange',
    desc: '“也没非得让你随身带个板子啊。。。”'
  },
    {
    avatar: '/members/Kaempferol.png',
    name: 'Kaempferol',
    desc: '“我*有角，莫非你就是龙B？！”'
  },
    {
    avatar: '/members/Toosendanin.png',
    name: 'Toosendanin',
    desc: '“你打过架？什么？逃了？”'
  }
]
</script>

<VPTeamPage>
  <VPTeamPageTitle>
    <template #title>
      点进来干什么喵！？
    </template>
    <template #lead>
      想开合我们喵？！
    </template>
  </VPTeamPageTitle>

  <VPTeamPageSection>
    <template #title>a</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group1" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>b</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group2" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>c</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group3" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>d</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group4" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>e</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group5" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>f</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group6" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>g</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group7" />
    </template>
  </VPTeamPageSection>

  <VPTeamPageSection>
    <template #title>h</template>
    <template #members>
      <VPTeamMembers size="medium" :members="group8" />
    </template>
  </VPTeamPageSection>
</VPTeamPage>