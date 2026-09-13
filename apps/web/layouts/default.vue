<template>
  <div class="flex min-h-svh flex-col bg-surface">
    <LayoutAppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
