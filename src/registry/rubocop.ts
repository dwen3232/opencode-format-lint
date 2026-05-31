import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  linter: {
    extensions: [".rb", ".rake", ".gemspec", "Gemfile", "Rakefile"],
    def: {
      args: ["--format", "simple"],
      markers: [".rubocop.yml", "Gemfile"],
      require_markers: false,
    },
  },
};

export default entry;
