import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".go"],
    def: {
      args: ["run", "--out-format", "json"],
      markers: ["go.mod", ".golangci.yml", ".golangci.yaml"],
      require_markers: false,
    },
  },
};

export default entry;
