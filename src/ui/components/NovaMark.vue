<!-- Supplied light/dark artwork keeps a fixed box; both variants load before theme switching. -->
<template>
  <span class="nova-mark" aria-hidden="true">
    <img v-show="preferencesState.theme === 'light'" :src="brandImageUrl('light')" data-nova-brand="light" alt="" width="256" height="256" draggable="false">
    <img v-show="preferencesState.theme === 'dark'" :src="brandImageUrl('dark')" data-nova-brand="dark" alt="" width="256" height="256" draggable="false">
  </span>
</template>
<script setup lang="ts">
import { preferencesState } from '../../store/preferences'
import { brandImageUrl } from '../branding'
</script>
<style scoped>
.nova-mark { display: block; inline-size: var(--ui-brand-mark-size); block-size: var(--ui-brand-mark-size); flex: none; }
.nova-mark img { display: block; inline-size: 100%; block-size: 100%; object-fit: contain; }
</style>
