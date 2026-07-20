// ─────────────────────────────────────────────────────────────────
//  ESLint — guard de errores de RUNTIME, no de estilo.
//
//  Nace de un bug real: el 13-jul se desplegó un `<ReferralPreview />`
//  cuya función se llamaba `ReferralSystemPreview`. Vite compila eso sin
//  chistar (un componente JSX indefinido es válido sintácticamente) y
//  solo revienta cuando el usuario abre esa pantalla — en ese caso,
//  Configuración: "ReferralPreview is not defined".
//
//  Por eso el set de reglas es DELIBERADAMENTE mínimo: solo lo que
//  produce una pantalla rota en producción. Nada de comillas, sangría ni
//  orden de imports: si el lint grita por estilo, se ignora, y entonces
//  deja de servir para lo que importa.
//
//  Corre en `npm run build` (script prebuild) y en `npm run lint`.
// ─────────────────────────────────────────────────────────────────

import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.{js,jsx}'],
    // El código trae `eslint-disable-next-line react-hooks/exhaustive-deps`
    // de antes; con esa regla apagada ESLint los reportaría como directivas
    // sobrantes. Son inofensivos y sirven de documentación.
    linterOptions: { reportUnusedDisableDirectives: 'off' },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: 'detect' } },
    rules: {
      // El bug que originó esto: componente JSX usado y nunca definido.
      'react/jsx-no-undef': 'error',
      // Su hermano fuera de JSX: variable/función que no existe.
      'no-undef': 'error',
      // Duplicados que hacen que una definición pise a la otra en silencio.
      'no-dupe-keys': 'error',
      'no-dupe-args': 'error',
      'no-dupe-class-members': 'error',
      'no-func-assign': 'error',
      // Uso antes de declarar. `variables: false` a propósito: en React el
      // código corre diferido (un useEffect o el JSX se evalúan después de
      // que el módulo/cuerpo terminó), así que la variante estricta marcaba
      // patrones perfectamente sanos. Se probó: 3 hallazgos, 3 falsos
      // positivos. Una regla así entrena a ignorar el linter.
      'no-use-before-define': ['error', { functions: false, classes: true, variables: false }],
      // Casos que siempre son un error de tipeo, no una decisión.
      'no-unreachable': 'error',
      'no-cond-assign': 'error',
      'no-constant-binary-expression': 'error',
      // React puntual: hooks/props mal escritos que rompen el render.
      'react/jsx-uses-vars': 'error',   // evita falsos 'no-unused-vars' en JSX
      'react/no-children-prop': 'error',
      // Hooks llamados condicionalmente o fuera de un componente: rompen el
      // render con "Rendered fewer hooks than expected".
      'react-hooks/rules-of-hooks': 'error',
      // Apagada a propósito, pero DECLARADA: el código ya tiene comentarios
      // `eslint-disable-next-line react-hooks/exhaustive-deps` y sin el
      // plugin registrado ESLint falla con "rule not found". Además es la
      // regla más ruidosa de React y no produce pantallas rotas.
      'react-hooks/exhaustive-deps': 'off',
    },
  },
  {
    // Config y scripts del build corren en Node, no en el navegador.
    files: ['*.config.js', 'scripts/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.node },
    },
    rules: { 'no-undef': 'error' },
  },
];
