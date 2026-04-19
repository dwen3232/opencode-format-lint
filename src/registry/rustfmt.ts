import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".rs"],
    def: {
      args: [],
      markers: ["Cargo.toml"],
      require_markers: false,
    },
  },
};

export default entry;
