import ScmGitPlugin from './ScmGitPlugin.vue'

export default {
  id: 'service:scm:git',
  label: 'Git',
  component: ScmGitPlugin,
  install() {},
  meta: { icon: 'mdi-git', color: 'orange-darken-2' },
}
