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
      <!-- Breadcrumb intentionally NOT rendered here: the single breadcrumb now
           lives in the top app bar (App.vue), in the 2026 chip style. The
           `crumbs` prop is kept for API compatibility (views still pass it) but
           no longer paints a second, duplicated trail. -->
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
