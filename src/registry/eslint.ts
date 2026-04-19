import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".js", ".ts", ".jsx", ".tsx"],
    def: {
      args: ["--format", "json"],
      markers: [
        ".eslintrc",
        ".eslintrc.json",
        ".eslintrc.js",
        ".eslintrc.cjs",
        "eslint.config.js",
        "eslint.config.ts",
      ],
      require_markers: true,
    },
  },
};

export default entry;
