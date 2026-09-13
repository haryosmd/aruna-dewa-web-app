import tseslint from 'typescript-eslint'
import vue from 'eslint-plugin-vue'
export default tseslint.config(
  { ignores: ['**/node_modules/**', '**/.nuxt/**', '**/.output/**', '**/dist/**', '**/docs/**', '**/.codex/**', '**/coverage/**', '**/playwright-report/**', '**/test-results/**'] },
  ...tseslint.configs.recommended,
  ...vue.configs['flat/recommended'],
  { files: ['**/*.vue'], languageOptions: { parserOptions: { parser: tseslint.parser, extraFileExtensions: ['.vue'] } } },
  { rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }], 'vue/multi-word-component-names': 'off', 'vue/html-self-closing': 'off', 'vue/max-attributes-per-line': 'off', 'vue/singleline-html-element-content-newline': 'off', 'vue/html-indent': 'off' } },
)
