import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".lua"],
    def: {
      args: [],
      markers: [".stylua.toml", "stylua.toml"],
      require_markers: false,
    },
  },
};

export default entry;
