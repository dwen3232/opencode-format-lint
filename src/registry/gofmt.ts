import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".go"],
    def: {
      args: ["-w"],
      markers: ["go.mod"],
      require_markers: false,
    },
  },
};

export default entry;
