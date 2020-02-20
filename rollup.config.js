import typescript from "rollup-plugin-typescript2";
import pkg from "./package.json";
// import typescript from "@rollup/plugin-typescript";

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
      compact: true,
    },
    {
      file: pkg.module,
      format: "es",
      compact: true,
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
};
