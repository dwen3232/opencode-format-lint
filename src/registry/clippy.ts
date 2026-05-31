import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".rs"],
    def: {
      cmd: "cargo",
      args: ["clippy", "--message-format", "short"],
      markers: ["Cargo.toml"],
      require_markers: true,
      append_path: false,
    },
  },
};

export default entry;
