import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".sh"],
    def: {
      args: ["-w"],
      markers: [],
      require_markers: false,
    },
  },
};

export default entry;
