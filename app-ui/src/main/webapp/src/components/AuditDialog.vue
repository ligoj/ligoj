<template>
  <div v-if="modelValue" class="vmodal" @click.self="close">
    <div class="vmodal-box">
      <header class="vmodal-head">
        <span class="vmodal-orb"><v-icon color="#fff">mdi-clock-outline</v-icon></span>
        <h2>{{ t('common.auditTitle') || 'Données d\'audit' }}</h2>
        <button class="x" :title="t('common.close') || 'Fermer'" @click="close"><v-icon>mdi-close</v-icon></button>
      </header>
      <div class="vmodal-body">
        <div class="aud-row">
          <span class="aud-k"><v-icon size="16">mdi-calendar-plus</v-icon>{{ t('common.createdDate') || 'Créé le' }}</span>
          <span class="aud-v">{{ fmt(target?.createdDate) || '—' }}</span>
        </div>
        <div class="aud-row">
          <span class="aud-k"><v-icon size="16">mdi-account-plus</v-icon>{{ t('common.createdBy') || 'Créé par' }}</span>
          <span class="aud-v">{{ who(target?.createdBy) || '—' }}</span>
        </div>
        <div class="aud-row">
          <span class="aud-k"><v-icon size="16">mdi-calendar-edit</v-icon>{{ t('common.lastModifiedDate') || 'Modifié le' }}</span>
          <span class="aud-v">{{ fmt(target?.lastModifiedDate) || '—' }}</span>
        </div>
        <div class="aud-row">
          <span class="aud-k"><v-icon size="16">mdi-account-edit</v-icon>{{ t('common.lastModifiedBy') || 'Modifié par' }}</span>
          <span class="aud-v">{{ who(target?.lastModifiedBy) || '—' }}</span>
        </div>
      </div>
      <footer class="vmodal-foot">
        <button class="vbtn" @click="close">{{ t('common.close') || 'Fermer' }}</button>
      </footer>
    </div>
  </div>
</template>

<script setup>
import { useI18nStore } from '@ligoj/host'

defineProps({
  modelValue: { type: Boolean, default: false },
  // Any object that implements org.ligoj.bootstrap.core.model.Auditable :
  // createdDate, createdBy, lastModifiedDate, lastModifiedBy.
  target: { type: Object, default: null },
})
const emit = defineEmits(['update:modelValue'])
const { t } = useI18nStore()

function close() { emit('update:modelValue', false) }
// createdBy / lastModifiedBy may be a raw login string or a SimpleUser object
// ({ firstName, lastName, id }) depending on the endpoint — normalize both.
function who(v) {
  if (!v) return ''
  if (typeof v === 'string') return v
  const name = [v.firstName, v.lastName].filter(Boolean).join(' ')
  return name || v.id || v.login || ''
}
function fmt(d) {
  if (!d) return ''
  const date = typeof d === 'number' ? new Date(d) : new Date(String(d))
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })
}
</script>

<style scoped>
.vmodal { position: fixed; inset: 0; background: rgba(0,0,0,.45); display: grid; place-items: center; z-index: 80; padding: 16px; }
.vmodal-box { width: 100%; max-width: 460px; background: rgb(var(--v-theme-surface)); border-radius: 18px; border: 1px solid rgba(var(--v-theme-on-surface), .12); box-shadow: 0 28px 60px -16px rgba(0,0,0,.55); overflow: hidden; }
.vmodal-head { display: flex; align-items: center; gap: 12px; padding: 16px 18px; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .08); }
.vmodal-orb { width: 38px; height: 38px; border-radius: 12px; flex: none; display: grid; place-items: center; background: linear-gradient(135deg, #8b5cf6, #5b21b6); box-shadow: 0 8px 18px -8px rgba(139, 92, 246, .55); }
.vmodal-head h2 { font-family: var(--v26-font, "Bricolage Grotesque", system-ui, sans-serif); font-weight: 800; font-size: 17px; letter-spacing: -.02em; flex: 1; margin: 0; color: rgb(var(--v-theme-on-surface)); }
.vmodal-head .x { width: 32px; height: 32px; border: 0; background: transparent; border-radius: 9px; cursor: pointer; display: grid; place-items: center; color: rgba(var(--v-theme-on-surface), .6); }
.vmodal-head .x:hover { background: rgba(var(--v-theme-on-surface), .07); color: rgb(var(--v-theme-on-surface)); }

.vmodal-body { padding: 14px 18px 4px; display: flex; flex-direction: column; gap: 10px; }
.aud-row { display: flex; align-items: center; justify-content: space-between; gap: 14px; padding: 10px 0; border-bottom: 1px solid rgba(var(--v-theme-on-surface), .07); }
.aud-row:last-child { border-bottom: 0; }
.aud-k { display: inline-flex; align-items: center; gap: 6px; font-family: var(--v26-font); font-weight: 700; font-size: 12.5px; color: rgba(var(--v-theme-on-surface), .65); text-transform: uppercase; letter-spacing: .03em; }
.aud-v { font-family: var(--v26-mono, "JetBrains Mono", ui-monospace, monospace); font-size: 13px; color: rgb(var(--v-theme-on-surface)); text-align: right; }

.vmodal-foot { display: flex; justify-content: flex-end; padding: 12px 18px 18px; }
.vbtn { font-family: var(--v26-font); font-weight: 700; font-size: 13.5px; padding: 9px 18px; border-radius: 11px; cursor: pointer; border: 0; color: rgb(var(--v-theme-on-surface)); background: rgba(var(--v-theme-on-surface), .07); transition: background .14s; }
.vbtn:hover { background: rgba(var(--v-theme-on-surface), .12); }
</style>
