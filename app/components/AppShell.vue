<script setup lang="ts">
const config = useRuntimeConfig()
</script>
<template>
  <div class="site-shell">
    <a class="skip-link" href="#main">Skip to content</a>
    <header class="site-header">
      <NuxtLink to="/" class="brand" aria-label="Engineering Evidence Explorer home"
        ><span class="brand-symbol"><AppIcon name="branch" :size="22" /></span
        ><span>Evidence<span class="brand-second"> / Explorer</span></span></NuxtLink
      >
      <nav aria-label="Site navigation" class="top-nav">
        <NuxtLink to="/" class="ask-nav"
          >Ask the evidence <AppIcon name="arrow" :size="14" /></NuxtLink
        ><NuxtLink to="/investigations/authentication">Investigations</NuxtLink
        ><NuxtLink to="/team">The team</NuxtLink><NuxtLink to="/architecture">How it works</NuxtLink
        ><a
          v-if="config.public.sourceUrl"
          :href="String(config.public.sourceUrl)"
          target="_blank"
          rel="noopener"
          class="source-link"
          ><AppIcon name="code" /> View source <AppIcon name="external" :size="14" /></a
        ><NuxtLink v-else to="/architecture#source" class="source-link"
          ><AppIcon name="code" /> About the source</NuxtLink
        >
      </nav>
    </header>
    <slot />
    <footer class="site-footer">
      <span
        >A portfolio experiment by <a href="https://www.jarrodsavard.com/">Jarrod Savard</a></span
      ><span
        >Fictional team. Real engineering. <span class="copyright">© 2026</span> ·
        <a :href="`${config.app.baseURL}third-party-notices.txt`">Third-party notices</a></span
      >
    </footer>
  </div>
</template>
