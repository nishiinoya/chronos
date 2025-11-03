import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
    {
        files: ["**/*.{js,mjs,cjs,jsx}"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
            parserOptions: { ecmaFeatures: { jsx: true } }
        },
        rules: {
            // Allman braces
            "brace-style": ["error", "allman", { allowSingleLine: false }],

            // Proper indentation (4 spaces, can change to 2 if you prefer)
            "indent": ["error", 4, { "SwitchCase": 1 }]
        }
    }
]);
