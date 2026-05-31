import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".php", ".phtml"],
    def: {
      args: [],
      markers: ["phpcs.xml", "phpcs.xml.dist", ".phpcs.xml", ".phpcs.xml.dist", "composer.json"],
      require_markers: false,
    },
  },
};

export default entry;
