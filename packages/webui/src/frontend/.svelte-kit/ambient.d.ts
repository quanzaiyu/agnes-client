
// this file is generated — do not edit it


/// <reference types="@sveltejs/kit" />

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module only includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/private';
 * 
 * console.log(ENVIRONMENT); // => "production"
 * console.log(PUBLIC_BASE_URL); // => throws error during build
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/private' {
	export const COMPUTERNAME: string;
	export const APPLICATIONINSIGHTS_CONFIGURATION_CONTENT: string;
	export const FPS_BROWSER_USER_PROFILE_STRING: string;
	export const ANTHROPIC_BASE_URL: string;
	export const ACSetupSvcPort: string;
	export const NODE_ENV: string;
	export const AZURE_CLI_PATH: string;
	export const ALLUSERSPROFILE: string;
	export const AI_AGENT: string;
	export const CLAUDE_AGENT_SDK_VERSION: string;
	export const EFC_10608_1262719628: string;
	export const CLAUDE_CODE_EXECPATH: string;
	export const APPDATA: string;
	export const VSCODE_L10N_BUNDLE_LOCATION: string;
	export const ANTHROPIC_AUTH_TOKEN: string;
	export const VoLTA_FEATURE_PNPM: string;
	export const PLINK_PROTOCOL: string;
	export const GIT_INSTALL_ROOT: string;
	export const EXEPATH: string;
	export const CLAUDE_CODE_ENABLE_TASKS: string;
	export const PGDATA: string;
	export const API_TIMEOUT_MS: string;
	export const PNPM_SCRIPT_SRC_DIR: string;
	export const CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: string;
	export const APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL: string;
	export const CLAUDE_CODE_CHILD_SESSION: string;
	export const COPILOT_OTEL_FILE_EXPORTER_PATH: string;
	export const APPLICATION_INSIGHTS_NO_STATSBEAT: string;
	export const npm_config_node_gyp: string;
	export const CHROME_CRASHPAD_PIPE_NAME: string;
	export const AzureCLIPath: string;
	export const GIT_CONFIG_VALUE_0: string;
	export const chocolateyinstall: string;
	export const INIT_CWD: string;
	export const VSCODE_CWD: string;
	export const CLAUDECODE: string;
	export const CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
	export const CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
	export const COPILOT_OTEL_ENABLED: string;
	export const CLAUDE_CODE_ENTRYPOINT: string;
	export const SCROLLVIEW_PATH: string;
	export const GIT_EDITOR: string;
	export const CLAUDE_CODE_GIT_BASH_PATH: string;
	export const CLAUDE_CODE_SESSION_ID: string;
	export const CLAUDE_EFFORT: string;
	export const LOGONSERVER: string;
	export const COMMONPROGRAMFILES: string;
	export const CommonProgramW6432: string;
	export const COMSPEC: string;
	export const DriverData: string;
	export const COPILOT_OTEL_EXPORTER_TYPE: string;
	export const COREPACK_ENABLE_AUTO_PIN: string;
	export const EFC_10608_1592913036: string;
	export const NoDefaultCurrentDirectoryInExePath: string;
	export const EFC_10608_2283032206: string;
	export const NODE: string;
	export const EFC_10608_2397410445: string;
	export const EFC_10608_3789132940: string;
	export const LOCALAPPDATA: string;
	export const EFC_10608_4126798990: string;
	export const FPS_BROWSER_APP_PROFILE_STRING: string;
	export const ELECTRON_RUN_AS_NODE: string;
	export const GIT_CONFIG_COUNT: string;
	export const JAVA_HOME: string;
	export const GIT_CONFIG_KEY_0: string;
	export const HOME: string;
	export const HOMEDRIVE: string;
	export const HOMEPATH: string;
	export const NGINX_HOME: string;
	export const MCP_CONNECTION_NONBLOCKING: string;
	export const MSYSTEM: string;
	export const NODE_PATH: string;
	export const NODE_UNC_HOST_ALLOWLIST: string;
	export const npm_command: string;
	export const npm_config_auto_install_peers: string;
	export const npm_config_disturl: string;
	export const npm_config_frozen_lockfile: string;
	export const npm_config_globalconfig: string;
	export const npm_config_loglevel: string;
	export const npm_config_msvs_version: string;
	export const npm_config_npm_globalconfig: string;
	export const VOLTA_HOME: string;
	export const PATHEXT: string;
	export const npm_config_registry: string;
	export const npm_config_strict_peer_dependencies: string;
	export const _: string;
	export const npm_config_strict_ssl: string;
	export const npm_config_user_agent: string;
	export const npm_config_verify_deps_before_run: string;
	export const npm_config__jsr_registry: string;
	export const npm_config__saber_registry: string;
	export const npm_execpath: string;
	export const npm_lifecycle_event: string;
	export const npm_lifecycle_script: string;
	export const npm_node_execpath: string;
	export const WINDIR: string;
	export const npm_package_json: string;
	export const npm_package_name: string;
	export const npm_package_version: string;
	export const NUMBER_OF_PROCESSORS: string;
	export const OLDPWD: string;
	export const OneDrive: string;
	export const OS: string;
	export const PATH: string;
	export const PG_INCLUDE_DIR: string;
	export const PG_LIB_DIR: string;
	export const pnpm_config_verify_deps_before_run: string;
	export const PROCESSOR_ARCHITECTURE: string;
	export const PROCESSOR_IDENTIFIER: string;
	export const PROCESSOR_LEVEL: string;
	export const PROCESSOR_REVISION: string;
	export const ProgramData: string;
	export const PROGRAMFILES: string;
	export const TERM: string;
	export const ProgramW6432: string;
	export const PROMPT: string;
	export const PSModulePath: string;
	export const PUBLIC: string;
	export const PWD: string;
	export const RlsSvcPort: string;
	export const SESSIONNAME: string;
	export const SHELL: string;
	export const SHLVL: string;
	export const SYSTEMDRIVE: string;
	export const SYSTEMROOT: string;
	export const TEMP: string;
	export const USERNAME: string;
	export const TESSDATA_PREFIX: string;
	export const TMP: string;
	export const USERDOMAIN: string;
	export const USERDOMAIN_ROAMINGPROFILE: string;
	export const USERPROFILE: string;
	export const VSCODE_CODE_CACHE_PATH: string;
	export const VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
	export const VSCODE_ESM_ENTRYPOINT: string;
	export const VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
	export const VSCODE_IPC_HOOK: string;
	export const VSCODE_NLS_CONFIG: string;
	export const VSCODE_PID: string;
	export const _VOLTA_TOOL_RECURSION: string;
	export const SVELTEKIT_FORK: string;
}

/**
 * This module provides access to environment variables that are injected _statically_ into your bundle at build time and are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Static environment variables are [loaded by Vite](https://vitejs.dev/guide/env-and-mode.html#env-files) from `.env` files and `process.env` at build time and then statically injected into your bundle at build time, enabling optimisations like dead code elimination.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * For example, given the following build time environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { ENVIRONMENT, PUBLIC_BASE_URL } from '$env/static/public';
 * 
 * console.log(ENVIRONMENT); // => throws error during build
 * console.log(PUBLIC_BASE_URL); // => "http://site.com"
 * ```
 * 
 * The above values will be the same _even if_ different values for `ENVIRONMENT` or `PUBLIC_BASE_URL` are set at runtime, as they are statically replaced in your code with their build time values.
 */
declare module '$env/static/public' {
	
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are limited to _private_ access.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Private_ access:**
 * 
 * - This module cannot be imported into client-side code
 * - This module includes variables that _do not_ begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) _and do_ start with [`config.kit.env.privatePrefix`](https://svelte.dev/docs/kit/configuration#env) (if configured)
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://site.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/private';
 * 
 * console.log(env.ENVIRONMENT); // => "production"
 * console.log(env.PUBLIC_BASE_URL); // => undefined
 * ```
 */
declare module '$env/dynamic/private' {
	export const env: {
		COMPUTERNAME: string;
		APPLICATIONINSIGHTS_CONFIGURATION_CONTENT: string;
		FPS_BROWSER_USER_PROFILE_STRING: string;
		ANTHROPIC_BASE_URL: string;
		ACSetupSvcPort: string;
		NODE_ENV: string;
		AZURE_CLI_PATH: string;
		ALLUSERSPROFILE: string;
		AI_AGENT: string;
		CLAUDE_AGENT_SDK_VERSION: string;
		EFC_10608_1262719628: string;
		CLAUDE_CODE_EXECPATH: string;
		APPDATA: string;
		VSCODE_L10N_BUNDLE_LOCATION: string;
		ANTHROPIC_AUTH_TOKEN: string;
		VoLTA_FEATURE_PNPM: string;
		PLINK_PROTOCOL: string;
		GIT_INSTALL_ROOT: string;
		EXEPATH: string;
		CLAUDE_CODE_ENABLE_TASKS: string;
		PGDATA: string;
		API_TIMEOUT_MS: string;
		PNPM_SCRIPT_SRC_DIR: string;
		CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS: string;
		APPLICATION_INSIGHTS_NO_DIAGNOSTIC_CHANNEL: string;
		CLAUDE_CODE_CHILD_SESSION: string;
		COPILOT_OTEL_FILE_EXPORTER_PATH: string;
		APPLICATION_INSIGHTS_NO_STATSBEAT: string;
		npm_config_node_gyp: string;
		CHROME_CRASHPAD_PIPE_NAME: string;
		AzureCLIPath: string;
		GIT_CONFIG_VALUE_0: string;
		chocolateyinstall: string;
		INIT_CWD: string;
		VSCODE_CWD: string;
		CLAUDECODE: string;
		CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC: string;
		CLAUDE_CODE_ENABLE_SDK_FILE_CHECKPOINTING: string;
		COPILOT_OTEL_ENABLED: string;
		CLAUDE_CODE_ENTRYPOINT: string;
		SCROLLVIEW_PATH: string;
		GIT_EDITOR: string;
		CLAUDE_CODE_GIT_BASH_PATH: string;
		CLAUDE_CODE_SESSION_ID: string;
		CLAUDE_EFFORT: string;
		LOGONSERVER: string;
		COMMONPROGRAMFILES: string;
		CommonProgramW6432: string;
		COMSPEC: string;
		DriverData: string;
		COPILOT_OTEL_EXPORTER_TYPE: string;
		COREPACK_ENABLE_AUTO_PIN: string;
		EFC_10608_1592913036: string;
		NoDefaultCurrentDirectoryInExePath: string;
		EFC_10608_2283032206: string;
		NODE: string;
		EFC_10608_2397410445: string;
		EFC_10608_3789132940: string;
		LOCALAPPDATA: string;
		EFC_10608_4126798990: string;
		FPS_BROWSER_APP_PROFILE_STRING: string;
		ELECTRON_RUN_AS_NODE: string;
		GIT_CONFIG_COUNT: string;
		JAVA_HOME: string;
		GIT_CONFIG_KEY_0: string;
		HOME: string;
		HOMEDRIVE: string;
		HOMEPATH: string;
		NGINX_HOME: string;
		MCP_CONNECTION_NONBLOCKING: string;
		MSYSTEM: string;
		NODE_PATH: string;
		NODE_UNC_HOST_ALLOWLIST: string;
		npm_command: string;
		npm_config_auto_install_peers: string;
		npm_config_disturl: string;
		npm_config_frozen_lockfile: string;
		npm_config_globalconfig: string;
		npm_config_loglevel: string;
		npm_config_msvs_version: string;
		npm_config_npm_globalconfig: string;
		VOLTA_HOME: string;
		PATHEXT: string;
		npm_config_registry: string;
		npm_config_strict_peer_dependencies: string;
		_: string;
		npm_config_strict_ssl: string;
		npm_config_user_agent: string;
		npm_config_verify_deps_before_run: string;
		npm_config__jsr_registry: string;
		npm_config__saber_registry: string;
		npm_execpath: string;
		npm_lifecycle_event: string;
		npm_lifecycle_script: string;
		npm_node_execpath: string;
		WINDIR: string;
		npm_package_json: string;
		npm_package_name: string;
		npm_package_version: string;
		NUMBER_OF_PROCESSORS: string;
		OLDPWD: string;
		OneDrive: string;
		OS: string;
		PATH: string;
		PG_INCLUDE_DIR: string;
		PG_LIB_DIR: string;
		pnpm_config_verify_deps_before_run: string;
		PROCESSOR_ARCHITECTURE: string;
		PROCESSOR_IDENTIFIER: string;
		PROCESSOR_LEVEL: string;
		PROCESSOR_REVISION: string;
		ProgramData: string;
		PROGRAMFILES: string;
		TERM: string;
		ProgramW6432: string;
		PROMPT: string;
		PSModulePath: string;
		PUBLIC: string;
		PWD: string;
		RlsSvcPort: string;
		SESSIONNAME: string;
		SHELL: string;
		SHLVL: string;
		SYSTEMDRIVE: string;
		SYSTEMROOT: string;
		TEMP: string;
		USERNAME: string;
		TESSDATA_PREFIX: string;
		TMP: string;
		USERDOMAIN: string;
		USERDOMAIN_ROAMINGPROFILE: string;
		USERPROFILE: string;
		VSCODE_CODE_CACHE_PATH: string;
		VSCODE_CRASH_REPORTER_PROCESS_TYPE: string;
		VSCODE_ESM_ENTRYPOINT: string;
		VSCODE_HANDLES_UNCAUGHT_ERRORS: string;
		VSCODE_IPC_HOOK: string;
		VSCODE_NLS_CONFIG: string;
		VSCODE_PID: string;
		_VOLTA_TOOL_RECURSION: string;
		SVELTEKIT_FORK: string;
		[key: `PUBLIC_${string}`]: undefined;
		[key: `${string}`]: string | undefined;
	}
}

/**
 * This module provides access to environment variables set _dynamically_ at runtime and that are _publicly_ accessible.
 * 
 * |         | Runtime                                                                    | Build time                                                               |
 * | ------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
 * | Private | [`$env/dynamic/private`](https://svelte.dev/docs/kit/$env-dynamic-private) | [`$env/static/private`](https://svelte.dev/docs/kit/$env-static-private) |
 * | Public  | [`$env/dynamic/public`](https://svelte.dev/docs/kit/$env-dynamic-public)   | [`$env/static/public`](https://svelte.dev/docs/kit/$env-static-public)   |
 * 
 * Dynamic environment variables are defined by the platform you're running on. For example if you're using [`adapter-node`](https://github.com/sveltejs/kit/tree/main/packages/adapter-node) (or running [`vite preview`](https://svelte.dev/docs/kit/cli)), this is equivalent to `process.env`.
 * 
 * **_Public_ access:**
 * 
 * - This module _can_ be imported into client-side code
 * - **Only** variables that begin with [`config.kit.env.publicPrefix`](https://svelte.dev/docs/kit/configuration#env) (which defaults to `PUBLIC_`) are included
 * 
 * > [!NOTE] In `dev`, `$env/dynamic` includes environment variables from `.env`. In `prod`, this behavior will depend on your adapter.
 * 
 * > [!NOTE] To get correct types, environment variables referenced in your code should be declared (for example in an `.env` file), even if they don't have a value until the app is deployed:
 * >
 * > ```env
 * > MY_FEATURE_FLAG=
 * > ```
 * >
 * > You can override `.env` values from the command line like so:
 * >
 * > ```sh
 * > MY_FEATURE_FLAG="enabled" npm run dev
 * > ```
 * 
 * For example, given the following runtime environment:
 * 
 * ```env
 * ENVIRONMENT=production
 * PUBLIC_BASE_URL=http://example.com
 * ```
 * 
 * With the default `publicPrefix` and `privatePrefix`:
 * 
 * ```ts
 * import { env } from '$env/dynamic/public';
 * console.log(env.ENVIRONMENT); // => undefined, not public
 * console.log(env.PUBLIC_BASE_URL); // => "http://example.com"
 * ```
 * 
 * ```
 * 
 * ```
 */
declare module '$env/dynamic/public' {
	export const env: {
		[key: `PUBLIC_${string}`]: string | undefined;
	}
}
