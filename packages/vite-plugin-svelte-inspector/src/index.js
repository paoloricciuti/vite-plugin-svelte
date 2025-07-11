import { normalizePath } from 'vite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { debug } from './debug.js';
import { defaultInspectorOptions, parseEnvironmentOptions } from './options.js';
import { cleanUrl } from './utils.js';

function getInspectorPath() {
	const pluginPath = normalizePath(path.dirname(fileURLToPath(import.meta.url)));
	return pluginPath.replace(
		/\/vite-plugin-svelte-inspector\/src$/,
		'/vite-plugin-svelte-inspector/src/runtime/'
	);
}

/**
 * @param {Partial<import('./public.d.ts').Options>} [options]
 * @returns {import('vite').Plugin}
 */
export function svelteInspector(options) {
	const inspectorPath = getInspectorPath();
	debug(`svelte inspector path: ${inspectorPath}`);

	/** @type {import('vite').ResolvedConfig} */
	let viteConfig;
	/** @type {import('./public.d.ts').Options} */
	let inspectorOptions;
	let disabled = false;

	return {
		name: 'vite-plugin-svelte-inspector',
		apply: 'serve',
		enforce: 'pre',

		applyToEnvironment(env) {
			return !disabled && env.config.consumer === 'client';
		},

		configResolved(config) {
			viteConfig = config;
			const environmentOptions = parseEnvironmentOptions(config);
			if (environmentOptions === false) {
				debug('environment options set to false, inspector disabled');
				disabled = true;
				return;
			}

			// Handle config from svelte.config.js through vite-plugin-svelte
			const vps = config.plugins.find((p) => p.name === 'vite-plugin-svelte:config');
			const configFileOptions = vps?.api?.options?.inspector;

			// vite-plugin-svelte can only pass options through it's `api` instead of `options`.
			// that means this plugin could be created but should be disabled, so we check this case here.
			if (vps && !options && !configFileOptions && !environmentOptions) {
				debug("vite-plugin-svelte didn't pass options, inspector disabled");
				disabled = true;
				return;
			}

			if (environmentOptions === true) {
				inspectorOptions = defaultInspectorOptions;
			} else {
				inspectorOptions = {
					...defaultInspectorOptions,
					...configFileOptions,
					...options,
					...(environmentOptions || {})
				};
			}

			inspectorOptions.__internal = {
				base: config.base?.replace(/\/$/, '') || ''
			};
		},
		resolveId: {
			filter: {
				id: /^virtual:svelte-inspector-/
			},
			async handler(id) {
				if (disabled) {
					return;
				}
				if (id === 'virtual:svelte-inspector-options') {
					return id;
				} else if (id.startsWith('virtual:svelte-inspector-path:')) {
					return id.replace('virtual:svelte-inspector-path:', inspectorPath);
				}
			}
		},
		load: {
			filter: {
				id: {
					include: [`${inspectorPath}/**`, /^virtual:svelte-inspector-options$/],
					exclude: [/style&lang\.css$/]
				}
			},
			async handler(id) {
				if (disabled) {
					return;
				}
				if (id === 'virtual:svelte-inspector-options') {
					return `export default ${JSON.stringify(inspectorOptions ?? {})}`;
				} else if (id.startsWith(inspectorPath)) {
					// read file ourselves to avoid getting shut out by vites fs.allow check
					const file = cleanUrl(id);
					if (fs.existsSync(id)) {
						return await fs.promises.readFile(file, 'utf-8');
					} else {
						viteConfig.logger.error(
							`[vite-plugin-svelte-inspector] failed to find svelte-inspector: ${id}`
						);
					}
				}
			}
		},
		transform: {
			filter: { id: /vite\/dist\/client\/client\.mjs(?:\?|$)/ },
			handler(code) {
				if (disabled) {
					return;
				}
				return { code: `${code}\nimport('virtual:svelte-inspector-path:load-inspector.js')` };
			}
		}
	};
}
