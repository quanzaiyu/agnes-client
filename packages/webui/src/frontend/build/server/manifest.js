const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.ObkQ1W2f.js",app:"_app/immutable/entry/app.BLTgxv82.js",imports:["_app/immutable/entry/start.ObkQ1W2f.js","_app/immutable/chunks/C7kHYPy4.js","_app/immutable/chunks/YlIctNZr.js","_app/immutable/chunks/B6OiEcIg.js","_app/immutable/entry/app.BLTgxv82.js","_app/immutable/chunks/C1FmrZbK.js","_app/immutable/chunks/YlIctNZr.js","_app/immutable/chunks/CLIJqD_I.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-DELUOEPh.js')),
			__memo(() => import('./chunks/1-BYrP98BN.js')),
			__memo(() => import('./chunks/2-CEf_KzLK.js')),
			__memo(() => import('./chunks/3-Hmde-gSM.js')),
			__memo(() => import('./chunks/4-DDdPFRPv.js')),
			__memo(() => import('./chunks/5-UNfwYuEV.js')),
			__memo(() => import('./chunks/6-CdTbBStX.js')),
			__memo(() => import('./chunks/7-CE8Y5fsh.js')),
			__memo(() => import('./chunks/8-BoLsA0sJ.js')),
			__memo(() => import('./chunks/9-ChX4QJhU.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 2 },
				endpoint: null
			},
			{
				id: "/image",
				pattern: /^\/image\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 3 },
				endpoint: null
			},
			{
				id: "/login",
				pattern: /^\/login\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 4 },
				endpoint: null
			},
			{
				id: "/points",
				pattern: /^\/points\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 5 },
				endpoint: null
			},
			{
				id: "/register",
				pattern: /^\/register\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 6 },
				endpoint: null
			},
			{
				id: "/settings",
				pattern: /^\/settings\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 7 },
				endpoint: null
			},
			{
				id: "/text",
				pattern: /^\/text\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 8 },
				endpoint: null
			},
			{
				id: "/video",
				pattern: /^\/video\/?$/,
				params: [],
				page: { layouts: [0,], errors: [1,], leaf: 9 },
				endpoint: null
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
