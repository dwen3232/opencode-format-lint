import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".md"],
    def: {
      args: [],
      markers: [".markdownlint.json", ".markdownlint.yaml", ".markdownlintrc"],
      require_markers: false,
    },
  },
};

export default entry;
