import type { RegistryEntry } from "../types";

const entry: RegistryEntry = {
  formatter: {
    extensions: [".scala", ".sc"],
    def: {
      args: [],
      markers: [".scalafmt.conf", "build.sbt"],
      require_markers: false,
    },
  },
};

export default entry;
