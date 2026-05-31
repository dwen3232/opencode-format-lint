import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".yaml", ".yml"],
    def: {
      args: ["-f", "parsable"],
      markers: [".yamllint", ".yamllint.yml", ".yamllint.yaml"],
      require_markers: false,
    },
  },
};

export default entry;
