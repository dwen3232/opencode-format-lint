import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: ["Dockerfile"],
    def: {
      args: ["-f", "json"],
      markers: [],
      require_markers: false,
    },
  },
};

export default entry;
