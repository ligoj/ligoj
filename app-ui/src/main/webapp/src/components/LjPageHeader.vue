<!--
  LjPageHeader — the 2026 page header, factored out of ~19 views that each
  hand-rolled `.ph` / `.ph-txt` / `.crumbs` / `.crumb`.

    <LjPageHeader :title="t('user.title')" :subtitle="t('user.subtitle2026')">
      <template #actions>
        <LjButton icon="mdi-plus" @click="openCreate">{{ t('user.new') }}</LjButton>
      </template>
    </LjPageHeader>

  Optional breadcrumb trail (the System* views use it):
    :crumbs="[{ icon: 'mdi-cog-outline', label: t('system.breadcrumb') },
              { label: t('system.role.title'), current: true }]"

  Title/subtitle/crumb labels are PROPS (the plugin owns its i18n keys); the
  component owns only the chrome. Reads its colours/type from the enclosing
  `.lj-surface` root.
-->
<template>
  <header class="ph">
    <div class="ph-txt">
      <nav v-if="crumbs && crumbs.length" class="crumbs">
        <template v-for="(c, i) in crumbs" :key="i">
          <span class="crumb" :class="{ cur: c.current }">
            <v-icon v-if="c.icon" size="13">{{ c.icon }}</v-icon>{{ c.label }}
          </span>
          <span v-if="i < crumbs.length - 1" class="csep">›</span>
        </template>
      </nav>
      <h1>{{ title }}</h1>
      <p v-if="subtitle || $slots.subtitle" class="sub"><slot name="subtitle">{{ subtitle }}</slot></p>
    </div>
    <div v-if="$slots.actions" class="ph-actions"><slot name="actions" /></div>
  </header>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  // [{ icon?, label, current? }]
  crumbs: { type: Array, default: null },
})
</script>

<style scoped>
.ph {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 18px;
  flex-wrap: wrap;
  margin-bottom: 18px;
}
.ph-txt { min-width: 0; }
.crumbs { display: flex; align-items: center; gap: 7px; margin-bottom: 8px; flex-wrap: wrap; }
.crumb {
  display: inline-flex; align-items: center; gap: 4px;
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-size: 11.5px; font-weight: 700;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
  background: var(--pill, rgba(var(--v-theme-on-surface), .06));
  border-radius: 999px; padding: 3px 10px;
}
.crumb.cur {
  color: var(--accent, rgb(var(--v-theme-secondary)));
  background: rgba(var(--v-theme-secondary), .12);
}
.csep { color: var(--ink-3, rgba(var(--v-theme-on-surface), .4)); font-size: 13px; }
.ph-txt h1 {
  font-family: var(--font, "Bricolage Grotesque", system-ui, sans-serif);
  font-weight: var(--bold, var(--lj-weight-bold, 800));
  letter-spacing: var(--lj-tracking, -.03em);
  font-size: 28px; margin: 0;
  color: var(--ink, rgb(var(--v-theme-on-surface)));
}
.ph-txt .sub {
  margin: 4px 0 0; font-size: 14px; font-weight: 500;
  color: var(--ink-3, rgba(var(--v-theme-on-surface), .55));
}
.ph-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
</style>
