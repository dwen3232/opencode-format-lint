import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".html", ".htm"],
    def: {
      args: [],
      markers: [".htmlhintrc", ".htmlhintrc.json", ".htmlhintrc.js", "htmlhint.config.js"],
      require_markers: false,
    },
  },
};

export default entry;
