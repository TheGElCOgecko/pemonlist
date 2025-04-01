import pluginJs from "@eslint/js";
import stylistic from "@stylistic/eslint-plugin";
import simpleimportsort from "eslint-plugin-simple-import-sort";
import unusedimports from "eslint-plugin-unused-imports";
import globals from "globals";
import tseslint from "typescript-eslint";


/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,mjs,cjs,ts}"] },
    { ignores: ["dist/*", "dbschema/*", "www/*"] },
    { languageOptions: {
        globals: globals.browser,
        parserOptions: {
            projectService: true,
            tsconfigRootDir: import.meta.dirname,
        }
    } },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    {
        plugins: {
            "@stylistic": stylistic,
            "simple-import-sort": simpleimportsort,
            "unused-imports": unusedimports
        },
        rules: {
            "semi": "warn",
            "@typescript-eslint/no-extraneous-class": "off",
            "@typescript-eslint/no-dynamic-delete": "off",
            "@typescript-eslint/no-unused-vars": [
                "error",
                { "varsIgnorePattern": "^_" }
            ],
            "@typescript-eslint/no-non-null-assertion": "off",
            "@typescript-eslint/strict-boolean-expressions": "error",
            "@typescript-eslint/no-floating-promises": "off",
            "@typescript-eslint/require-await": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-namespace": "off",
            "@stylistic/jsx-quotes": ["error", "prefer-double"],
            "@stylistic/quotes": ["error", "double", { "avoidEscape": true }],
            "@stylistic/no-mixed-spaces-and-tabs": "error",
            "@stylistic/arrow-parens": ["error", "as-needed"],
            "@stylistic/eol-last": ["error", "always"],
            "@stylistic/no-multi-spaces": "error",
            "@stylistic/no-trailing-spaces": "error",
            "@stylistic/no-whitespace-before-property": "error",
            "@stylistic/semi": ["error", "always"],
            "@stylistic/semi-style": ["error", "last"],
            "@stylistic/space-in-parens": ["error", "never"],
            "@stylistic/block-spacing": ["error", "always"],
            "@stylistic/object-curly-spacing": ["error", "always"],
            "@stylistic/spaced-comment": ["error", "always", { "markers": ["!"] }],
            "@stylistic/no-extra-semi": "error",
            "@stylistic/func-call-spacing": ["error", "never"],
            "yoda": "error",
            "eqeqeq": ["error", "always", { "null": "ignore" }],
            "prefer-destructuring": ["error", {
                "VariableDeclarator": { "array": false, "object": true },
                "AssignmentExpression": { "array": false, "object": false }
            }],
            "operator-assignment": ["error", "always"],
            "no-useless-computed-key": "error",
            "no-unneeded-ternary": ["error", { "defaultAssignment": false }],
            "no-invalid-regexp": "error",
            "no-constant-condition": ["error", { "checkLoops": false }],
            "no-duplicate-imports": "error",
            "dot-notation": "error",
            "no-useless-escape": "error",
            "no-fallthrough": "error",
            "for-direction": "error",
            "no-async-promise-executor": "error",
            "no-cond-assign": "error",
            "no-dupe-else-if": "error",
            "no-duplicate-case": "error",
            "no-irregular-whitespace": "error",
            "no-loss-of-precision": "error",
            "no-misleading-character-class": "error",
            "no-prototype-builtins": "error",
            "no-regex-spaces": "error",
            "no-shadow-restricted-names": "error",
            "no-unexpected-multiline": "error",
            "no-unsafe-optional-chaining": "error",
            "no-useless-backreference": "error",
            "use-isnan": "error",
            "prefer-const": "error",
            "prefer-spread": "error",
            "simple-import-sort/imports": "error",
            "simple-import-sort/exports": "error",
            "unused-imports/no-unused-imports": "error"
        }
    }
];
