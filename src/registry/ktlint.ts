import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".kt", ".kts"],
    def: {
      args: ["-F"],
      markers: ["ktlint.json", ".editorconfig"],
      require_markers: false,
    },
  },
  linter: {
    extensions: [".kt", ".kts"],
    def: {
      args: [],
      markers: ["ktlint.json", ".editorconfig"],
      require_markers: false,
    },
  },
};

export default entry;
