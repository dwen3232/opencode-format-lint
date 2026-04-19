import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".sh"],
    def: {
      args: ["--format", "json"],
      markers: [],
      require_markers: false,
    },
  },
};

export default entry;
