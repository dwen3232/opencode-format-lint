import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
    def: {
      args: ["format", "--write"],
      markers: ["biome.json", "biome.jsonc"],
      require_markers: true,
    },
  },
  linter: {
    extensions: [".js", ".ts", ".jsx", ".tsx", ".json"],
    def: {
      args: ["check"],
      markers: ["biome.json", "biome.jsonc"],
      require_markers: true,
    },
  },
};

export default entry;
