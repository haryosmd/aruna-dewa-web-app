<script setup lang="ts">
/** Rumpun sudut. Dipasang empat kali dan dicerminkan. */
</script>

<template>
  <svg viewBox="0 0 300 300" preserveAspectRatio="xMinYMin slice" aria-hidden="true">
    <g fill="currentColor" data-mass>
      <path d="M0 0 C88 8 148 62 168 148 C104 136 46 80 0 0 Z" opacity="0.24" />
      <ellipse cx="58" cy="58" rx="34" ry="25" transform="rotate(-38 58 58)" />
      <ellipse cx="132" cy="96" rx="30" ry="22" transform="rotate(24 132 96)" />
      <ellipse cx="72" cy="150" rx="28" ry="21" transform="rotate(-20 72 150)" />
    </g>
    <g fill="currentColor" opacity="0.45" data-mass>
      <ellipse cx="146" cy="36" rx="26" ry="19" transform="rotate(34 146 36)" />
      <ellipse cx="30" cy="122" rx="24" ry="18" transform="rotate(-32 30 122)" />
      <ellipse cx="164" cy="160" rx="22" ry="16" transform="rotate(30 164 160)" />
      <circle cx="204" cy="46" r="13" /><circle cx="44" cy="204" r="13" />
      <circle cx="236" cy="22" r="8" /><circle cx="20" cy="236" r="8" />
    </g>
  </svg>
</template>
