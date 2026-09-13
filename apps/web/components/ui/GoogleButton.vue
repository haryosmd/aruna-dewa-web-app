<script setup lang="ts">
/**
 * Google sign-in button. The mark is inlined rather than pulled from an icon CDN so
 * the button renders identically offline and never blocks on a third-party request.
 */
defineProps<{ href: string; label?: string }>()
</script>

<template>
  <a
    :href="href"
    class="inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-border-strong bg-surface px-5 text-[0.9375rem] font-semibold text-ink no-underline shadow-[var(--shadow-hairline)] transition-[background-color,border-color,box-shadow] duration-200 hover:border-ink/40 hover:bg-surface-2 hover:shadow-[var(--shadow-lift)]"
  >
    <svg viewBox="0 0 18 18" class="h-[18px] w-[18px] shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2045c0-.6381-.0573-1.2518-.1636-1.8409H9v3.4814h4.8436c-.2086 1.125-.8427 2.0782-1.7959 2.7164v2.2581h2.9086c1.7018-1.5668 2.6837-3.874 2.6837-6.615z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.4673-.806 5.9564-2.1805l-2.9086-2.2581c-.8059.54-1.8368.859-3.0478.859-2.344 0-4.3282-1.5831-5.036-3.7104H.9574v2.3318C2.4382 15.9832 5.4818 18 9 18z" />
      <path fill="#FBBC05" d="M3.964 10.71c-.18-.54-.2822-1.1168-.2822-1.71s.1023-1.17.2823-1.71V4.9582H.9573A8.9965 8.9965 0 0 0 0 9c0 1.4523.3477 2.8268.9573 4.0418L3.964 10.71z" />
      <path fill="#EA4335" d="M9 3.5795c1.3214 0 2.5077.4541 3.4405 1.346l2.5813-2.5814C13.4632.8918 11.426 0 9 0 5.4818 0 2.4382 2.0168.9573 4.9582L3.964 7.29C4.6718 5.1627 6.6559 3.5795 9 3.5795z" />
    </svg>
    {{ label ?? 'Lanjutkan dengan Google' }}
  </a>
</template>
