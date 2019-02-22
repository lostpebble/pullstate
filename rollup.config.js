import typescript from "rollup-plugin-typescript2";

import pkg from "./package.json";

export default {
  input: "./src/index.ts",
  plugins: [
    typescript({
      typescript: require("typescript"),
    }),
  ],
  output: [
    {
      file: pkg.main,
      format: "cjs",
    },
    {
      file: pkg.module,
      format: "es",
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
  compact: true,
};
