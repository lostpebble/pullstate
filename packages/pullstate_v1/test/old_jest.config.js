module.exports = {
  bail: false,
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  moduleDirectories: ["node_modules", "../node_modules"],
  testEnvironment: "jsdom",
  testRegex: "((test|spec)|(tests|specs))\\.(jsx?|tsx?)$",
  transform: {
    "^.+\\.tsx?$": "ts-jest",
  },
  verbose: true,
  setupFilesAfterEnv: ["./rtl.setup.ts"],
};
