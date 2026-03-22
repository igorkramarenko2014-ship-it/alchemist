/** @type { import("eslint").Linter.Config } */
module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parser: "@typescript-eslint/parser",
  parserOptions: { ecmaVersion: "latest", sourceType: "module" },
  ignorePatterns: ["node_modules", "dist", ".next", ".expo", "build"],
};
