module.exports = {
  extends: ["next/core-web-vitals"],
  overrides: [
    {
      files: ["lib/stellar/**/*.{js,jsx,ts,tsx}"],
      rules: {
        "no-console": [
          "error",
          {
            allow: ["warn", "error"],
          },
        ],
      },
    },
    {
      files: ["lib/stellar/actions/**/*.{js,jsx,ts,tsx}"],
      rules: {
        "no-restricted-syntax": [
          "warn",
          {
            selector: "CallExpression[callee.name='setTimeout']",
            message:
              "Avoid setTimeout in escrow action files; prefer transaction-driven flow or explicit polling helpers.",
          },
        ],
      },
    },
  ],
};
