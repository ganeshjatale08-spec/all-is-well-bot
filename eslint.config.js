const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions run on Deno (npm: specifiers, global Deno), a
    // different runtime/toolchain from the RN/Metro project this config
    // targets — they're linted via `deno lint` at deploy time instead.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
