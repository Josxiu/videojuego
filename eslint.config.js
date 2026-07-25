import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'public/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      // El juego se apoya en efectos secundarios de Phaser; estas reglas dan ruido.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Avisar de variables sin usar, permitiendo el prefijo _ para las intencionales.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      // Prohibir `any` implícito y explícito: el tipado es la red de seguridad del proyecto.
      '@typescript-eslint/no-explicit-any': 'error',
      eqeqeq: ['error', 'smart'],
      'prefer-const': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Scripts de herramientas: corren en Node y manejan páginas del navegador.
    files: ['tools/**/*.mjs'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', window: 'readonly' },
    },
    rules: { 'no-console': 'off', '@typescript-eslint/no-unused-vars': 'off' },
  },
  {
    files: ['tests/**/*.ts'],
    rules: { 'no-console': 'off' },
  },
);
