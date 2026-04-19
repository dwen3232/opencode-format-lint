import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".py"],
    def: {
      args: ["check", "--output-format", "json"],
      markers: ["pyproject.toml", "ruff.toml", ".ruff.toml"],
      require_markers: false,
    },
  },
};

export default entry;
