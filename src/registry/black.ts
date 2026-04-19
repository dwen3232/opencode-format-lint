import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".py"],
    def: {
      args: [],
      markers: ["pyproject.toml", "setup.cfg", ".black"],
      require_markers: false,
    },
  },
};

export default entry;
