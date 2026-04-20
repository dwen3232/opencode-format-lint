import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".css", ".html", ".json", ".md", ".yaml", ".yml"],
    def: {
      args: ["--write"],
      markers: [
        ".prettierrc",
        ".prettierrc.json",
        ".prettierrc.js",
        ".prettierrc.cjs",
        ".prettierrc.mjs",
        ".prettierrc.yaml",
        ".prettierrc.yml",
        "prettier.config.js",
        "prettier.config.cjs",
        "prettier.config.mjs",
        "prettier.config.ts",
      ],
      require_markers: false,
    },
  },
};

export default entry;
