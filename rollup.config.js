import typescript from "rollup-plugin-typescript2";
import { terser } from "rollup-plugin-terser";
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import pkg from "./package.json";
// import typescript from "@rollup/plugin-typescript";

export default [{
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
      // dir: "dist"
    },
    {
      file: pkg.module,
      format: "es",
      compact: true,
      // dist: "dist"
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})],
}, {
  input: "./src/index.ts",
  plugins: [
    typescript({
      typescript: require("typescript"),
    }),
    nodeResolve(),
    commonjs(),
  ],
  output: [
    {
      file: pkg["main:umd"],
      format: "umd",
      name: "pullstate",
      globals: {
        "react": "React",
        "immer": "immer",
      },
    },
    {
      file: pkg["main:umd:min"],
      format: "umd",
      name: "pullstate",
      globals: {
        "react": "React",
        "immer": "immer",
      },
      plugins: [terser()],
    },
  ],
  external: [...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.peerDependencies || {})].filter(dep => dep !== "fast-deep-equal"),
}];
