<script setup lang="ts">
import { scenarios } from '../../../domain/scenarios'
const route = useRoute()
const id = computed(() => String(route.params.id))
if (!scenarios.some((s) => s.id === id.value))
  throw createError({ statusCode: 404, statusMessage: 'Investigation not found' })
</script>
<template>
  <AppShell><InvestigationWorkspace :key="id" :scenario-id="id" /></AppShell>
</template>
