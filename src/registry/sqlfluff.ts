import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".sql"],
    def: {
      args: ["fix", "--force"],
      markers: [".sqlfluff", "pyproject.toml"],
      require_markers: false,
    },
  },
  linter: {
    extensions: [".sql"],
    def: {
      args: ["lint"],
      markers: [".sqlfluff", "pyproject.toml"],
      require_markers: false,
    },
  },
};

export default entry;
