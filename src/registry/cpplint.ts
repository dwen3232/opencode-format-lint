import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx"],
    def: {
      args: [],
      markers: [],
      require_markers: false,
    },
  },
};

export default entry;
