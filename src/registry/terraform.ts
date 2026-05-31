import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".tf", ".tfvars"],
    def: {
      args: ["fmt"],
      markers: [],
      require_markers: false,
    },
  },
};

export default entry;
