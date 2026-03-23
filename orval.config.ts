import { defineConfig } from "orval";

export default defineConfig({
	ark: {
		input: {
			target: "./openapi.yaml",
		},
		output: {
			mode: "tags-split",
			target: "./src/generated/api",
			schemas: "./src/generated/schemas",
			client: "react-query",
			clean: true,
			override: {
				mutator: {
					path: "./src/generated/custom-fetch.ts",
					name: "customFetch",
				},
				query: {
					useQuery: true,
				},
			},
		},
	},
});
