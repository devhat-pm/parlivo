import config from "@parlivo/config/eslint";

export default [...config, { ignores: ["src/generated/**"] }];
