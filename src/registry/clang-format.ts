import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".c", ".cc", ".cpp", ".cxx", ".h", ".hh", ".hpp", ".hxx", ".m", ".mm"],
    def: {
      args: ["-i"],
      markers: [".clang-format", "_clang-format"],
      require_markers: false,
    },
  },
};

export default entry;
