const COMMON_DEPENDENCIES_WITHOUT_SVELTE_FIELD = [
	'@lukeed/uuid',
	'@playwright/test',
	'@sveltejs/kit',
	'@sveltejs/package',
	'@sveltejs/vite-plugin-svelte',
	'autoprefixer',
	'cookie',
	'dotenv',
	'esbuild',
	'eslint',
	'jest',
	'mdsvex',
	'playwright',
	'postcss',
	'prettier',
	'svelte',
	'svelte2tsx',
	'svelte-check',
	'svelte-preprocess',
	'tslib',
	'typescript',
	'vite',
	'vitest',
	'__vite-browser-external' // see https://github.com/sveltejs/vite-plugin-svelte/issues/362
];
const COMMON_PREFIXES_WITHOUT_SVELTE_FIELD = [
	'@fontsource/',
	'@postcss-plugins/',
	'@rollup/',
	'@sveltejs/adapter-',
	'@types/',
	'@typescript-eslint/',
	'eslint-',
	'jest-',
	'postcss-plugin-',
	'prettier-plugin-',
	'rollup-plugin-',
	'vite-plugin-'
];

/**
 * Test for common dependency names that tell us it is not a package including a svelte field, eg. eslint + plugins.
 *
 * This speeds up the find process as we don't have to try and require the package.json for all of them
 *
 * @param {string} dependency
 * @returns {boolean} true if it is a dependency without a svelte field
 */
export function isCommonDepWithoutSvelteField(dependency) {
	return (
		COMMON_DEPENDENCIES_WITHOUT_SVELTE_FIELD.includes(dependency) ||
		COMMON_PREFIXES_WITHOUT_SVELTE_FIELD.some(
			(prefix) =>
				prefix.startsWith('@')
					? dependency.startsWith(prefix)
					: dependency.substring(dependency.lastIndexOf('/') + 1).startsWith(prefix) // check prefix omitting @scope/
		)
	);
}
