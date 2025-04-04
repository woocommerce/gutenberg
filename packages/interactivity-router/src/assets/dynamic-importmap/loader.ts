/**
 * External dependencies
 */
import * as lexer from 'es-module-lexer';

/**
 * Internal dependencies
 */
import { fetchModule } from './fetch';
import { resolve } from './resolver';

export interface ModuleLoad {
	u?: string; // original URL
	r?: string; // response url
	f?: Promise< ModuleLoad >; // fetch promise
	S?: string; // source code
	L?: Promise< void >; // link-promise (dependency fetch)
	a?: ReturnType< typeof lexer.parse >; // analysis ([ imports, exports, ... ])
	d?: ModuleLoad[]; // deps
	b?: string; // blobUrl
	s?: string; // shellUrl for circular references
	n?: boolean; // needsShim
	t?: string; // type (unused)
	m?: { url: string; resolve?: undefined }; // meta
}

export const initPromise = lexer.init;

const edge =
	! ( 'userAgentData' in window.navigator ) &&
	!! window.navigator.userAgent.match( /Edge\/\d+\.\d+/ );

const skip = ( id ) =>
	Object.keys(
		JSON.parse(
			document.querySelector< HTMLScriptElement >(
				'script#wp-importmap[type=importmap]'
			).text
		).imports
	).includes( id );

const supports = window.HTMLScriptElement.supports;
const supportsImportMaps =
	supports && supports.name === 'supports' && supports( 'importmap' );
const importMapSrcOrLazy = false;

const fetchCache = {};
export const registry = {};

async function loadAll( load: ModuleLoad, seen: Record< string, any > ) {
	if ( load.b || seen[ load.u ] ) {
		return;
	}
	seen[ load.u ] = 1;
	await load.L;
	await Promise.all( load.d.map( ( dep ) => loadAll( dep, seen ) ) );
	if ( ! load.n ) {
		load.n = load.d.some( ( dep ) => dep.n );
	}
}

function urlJsString( url: string ) {
	return `'${ url.replace( /'/g, "\\'" ) }'`;
}

const createBlob = ( source: string, type = 'text/javascript' ) =>
	URL.createObjectURL( new Blob( [ source ], { type } ) );

let lastLoad;
function resolveDeps( load: ModuleLoad, seen: Record< string, any > ) {
	if ( load.b || ! seen[ load.u ] ) {
		return;
	}
	seen[ load.u ] = 0;

	for ( const dep of load.d ) {
		resolveDeps( dep, seen );
	}

	const [ imports, exports ] = load.a;
	const source = load.S;

	// Edge fix: ensure sibling ordering
	let resolvedSource = edge && lastLoad ? `import '${ lastLoad }';` : '';

	if ( ! imports.length ) {
		resolvedSource += source;
	} else {
		let lastIndex = 0;
		let depIndex = 0;
		const dynamicImportEndStack = [];

		function pushStringTo( originalIndex: number ) {
			while (
				dynamicImportEndStack.length &&
				dynamicImportEndStack[ dynamicImportEndStack.length - 1 ] <
					originalIndex
			) {
				const dynamicImportEnd = dynamicImportEndStack.pop();
				resolvedSource += `${ source.slice(
					lastIndex,
					dynamicImportEnd
				) }, ${ urlJsString( load.r ) }`;
				lastIndex = dynamicImportEnd;
			}
			resolvedSource += source.slice( lastIndex, originalIndex );
			lastIndex = originalIndex;
		}

		for ( const {
			s: start,
			ss: statementStart,
			se: statementEnd,
			d: dynamicImportIndex,
		} of imports ) {
			// static import
			if ( dynamicImportIndex === -1 ) {
				const depLoad = load.d[ depIndex++ ];
				let blobUrl = depLoad.b;
				const cycleShell = ! blobUrl;
				if ( cycleShell ) {
					// Circular shell creation
					if ( ! ( blobUrl = depLoad.s ) ) {
						blobUrl = depLoad.s = createBlob(
							`export function u$_(m){${ depLoad.a[ 1 ]
								.map( ( { s, e }, i ) => {
									const q =
										depLoad.S[ s ] === '"' ||
										depLoad.S[ s ] === "'";
									return `e$_${ i }=m${
										q ? `[` : '.'
									}${ depLoad.S.slice( s, e ) }${
										q ? `]` : ''
									}`;
								} )
								.join( ',' ) }}${
								depLoad.a[ 1 ].length
									? `let ${ depLoad.a[ 1 ]
											.map( ( _, i ) => `e$_${ i }` )
											.join( ',' ) };`
									: ''
							}export {${ depLoad.a[ 1 ]
								.map(
									( { s, e }, i ) =>
										`e$_${ i } as ${ depLoad.S.slice(
											s,
											e
										) }`
								)
								.join( ',' ) }}\n//# sourceURL=${
								depLoad.r
							}?cycle`
						);
					}
				}

				pushStringTo( start - 1 );
				resolvedSource += `/*${ source.slice(
					start - 1,
					statementEnd
				) }*/${ urlJsString( blobUrl ) }`;

				// circular shell execution
				if ( ! cycleShell && depLoad.s ) {
					resolvedSource += `;import*as m$_${ depIndex } from'${ depLoad.b }';import{u$_ as u$_${ depIndex }}from'${ depLoad.s }';u$_${ depIndex }(m$_${ depIndex })`;
					depLoad.s = undefined;
				}
				lastIndex = statementEnd;
			}
			// import.meta
			else if ( dynamicImportIndex === -2 ) {
				load.m = { url: load.r };
				pushStringTo( start );
				resolvedSource += `importShim._r[${ urlJsString( load.u ) }].m`;
				lastIndex = statementEnd;
			}
			// dynamic import
			else {
				pushStringTo( statementStart + 6 );
				resolvedSource += `Shim(`;
				dynamicImportEndStack.push( statementEnd - 1 );
				lastIndex = start;
			}
		}

		// progressive cycle binding updates
		if ( load.s ) {
			resolvedSource += `\n;import{u$_}from'${
				load.s
			}';try{u$_({${ exports
				.filter( ( e ) => e.ln )
				.map( ( { s, e, ln } ) => `${ source.slice( s, e ) }:${ ln }` )
				.join( ',' ) }})}catch(_){};\n`;
		}

		pushStringTo( source.length );
	}

	// ensure we have a proper sourceURL
	let hasSourceURL = false;
	resolvedSource = resolvedSource.replace(
		sourceMapURLRegEx,
		( match, isMapping, url ) => {
			hasSourceURL = ! isMapping;
			return match.replace( url, () =>
				new URL( url, load.r ).toString()
			);
		}
	);
	if ( ! hasSourceURL ) {
		resolvedSource += '\n//# sourceURL=' + load.r;
	}

	load.b = lastLoad = createBlob( resolvedSource );
	load.S = undefined; // free memory
}

const sourceMapURLRegEx =
	/\n\/\/# source(Mapping)?URL=([^\n]+)\s*((;|\/\/[^#][^\n]*)\s*)*$/;

function getOrCreateLoad(
	url: string,
	fetchOpts: RequestInit,
	parent: string
): ModuleLoad {
	let load: ModuleLoad = registry[ url ];
	if ( load ) {
		return load;
	}

	load = {
		u: url,
		r: undefined,
		f: undefined,
		S: undefined,
		L: undefined,
		a: undefined,
		d: undefined,
		b: undefined,
		s: undefined,
		n: false,
		t: null,
		m: null,
	};

	if ( registry[ url ] ) {
		// If there's a naming conflict, keep incrementing until unique
		let i = 0;
		while ( registry[ load.u + ++i ] ) {
			/* no-op */
		}
		load.u += i;
	}
	registry[ load.u ] = load;

	load.f = ( async () => {
		let source;
		( { r: load.r, s: source } = await ( fetchCache[ url ] ||
			fetchModule( url, fetchOpts, parent ) ) );
		try {
			load.a = lexer.parse( source, load.u );
		} catch ( e ) {
			// eslint-disable-next-line no-console
			console.error( e );
			load.a = [ [], [], false, false ];
		}
		load.S = source;
		return load;
	} )();

	load.L = load.f.then( async () => {
		let childFetchOpts = fetchOpts;
		load.d = (
			await Promise.all(
				load.a[ 0 ].map( async ( { n, d } ) => {
					if ( d !== -1 || ! n ) {
						return undefined;
					}
					const { r, b } = await resolve( n, load.r || load.u );
					if ( b && ( ! supportsImportMaps || importMapSrcOrLazy ) ) {
						load.n = true;
					}
					if ( d !== -1 ) {
						return undefined;
					}
					if ( skip && skip( r ) ) {
						return { b: r } as ModuleLoad;
					}
					// remove integrity for child fetches
					if ( childFetchOpts.integrity ) {
						childFetchOpts = {
							...childFetchOpts,
							integrity: undefined,
						};
					}
					return getOrCreateLoad( r, childFetchOpts, load.r ).f;
				} )
			)
		).filter( ( l ) => l );
	} );

	return load;
}

const dynamicImport = ( u: string ) => import( /* webpackIgnore: true */ u );

/**
 * Resolve the passed module URL and fetch the corresponding module
 * and their dependencies, returning a `ModuleLoad` object once all
 * of them have been fetched.
 *
 * @param url       Module URL.
 * @param fetchOpts Fetch options.
 * @return A promise with a `ModuleLoad` instance.
 */
export async function preloadModule(
	url: string,
	fetchOpts?: RequestInit
): Promise< ModuleLoad > {
	await initPromise;
	const load = getOrCreateLoad( url, fetchOpts, null );
	const seen = {};
	await loadAll( load, seen );
	lastLoad = undefined;
	resolveDeps( load, seen );
	// microtask scheduling – can help ensure Blob is fully ready
	await Promise.resolve();
	return load;
}

/**
 * Import the module represented by the passed `ModuleLoad` instance.
 *
 * @param load The `ModuleLoad` instance representing the module.
 * @return A promise with the imported module.
 */
export async function importPreloadedModule< Module = unknown >(
	load: ModuleLoad
): Promise< Module > {
	const module = await dynamicImport( load.b );
	// if the preloaded module ended up with a shell (circular refs), finalize it
	if ( load.s ) {
		( await dynamicImport( load.s ) ).u$_( module );
	}
	return module;
}

/**
 * Import the module represented by the passed module URL.
 *
 * The module URL and all its dependencies are resolved using the
 * current status of the internal dynamic import map.
 *
 * @param url       Module URL.
 * @param fetchOpts Fetch options.
 * @return A promise with the imported module.
 */
export async function topLevelLoad< Module = unknown >(
	url: string,
	fetchOpts?: RequestInit
): Promise< Module > {
	const load = await preloadModule( url, fetchOpts );
	return importPreloadedModule< Module >( load );
}
