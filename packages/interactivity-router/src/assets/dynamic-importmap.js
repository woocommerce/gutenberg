/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

/**
 * External dependencies
 */
import * as lexer from 'es-module-lexer';

const noop = () => {};
const metaHook = noop;

const edge =
	! window.navigator.userAgentData &&
	!! window.navigator.userAgent.match( /Edge\/\d+\.\d+/ );

let importMap = { imports: {}, scopes: {} };

const backslashRegEx = /\\/g;

function isURL( url ) {
	if ( url.indexOf( ':' ) === -1 ) {
		return false;
	}
	try {
		new URL( url );
		return true;
	} catch ( _ ) {
		return false;
	}
}

function resolveIfNotPlainOrUrl( relUrl, parentUrl ) {
	const hIdx = parentUrl.indexOf( '#' ),
		qIdx = parentUrl.indexOf( '?' );
	if ( hIdx + qIdx > -2 ) {
		parentUrl = parentUrl.slice(
			0,
			hIdx === -1 ? qIdx : qIdx === -1 || qIdx > hIdx ? hIdx : qIdx
		);
	}
	if ( relUrl.indexOf( '\\' ) !== -1 ) {
		relUrl = relUrl.replace( backslashRegEx, '/' );
	}
	// protocol-relative
	if ( relUrl[ 0 ] === '/' && relUrl[ 1 ] === '/' ) {
		return parentUrl.slice( 0, parentUrl.indexOf( ':' ) + 1 ) + relUrl;
	}
	// relative-url
	else if (
		( relUrl[ 0 ] === '.' &&
			( relUrl[ 1 ] === '/' ||
				( relUrl[ 1 ] === '.' &&
					( relUrl[ 2 ] === '/' ||
						( relUrl.length === 2 && ( relUrl += '/' ) ) ) ) ||
				( relUrl.length === 1 && ( relUrl += '/' ) ) ) ) ||
		relUrl[ 0 ] === '/'
	) {
		const parentProtocol = parentUrl.slice(
			0,
			parentUrl.indexOf( ':' ) + 1
		);
		// Disabled, but these cases will give inconsistent results for deep backtracking
		//if (parentUrl[parentProtocol.length] !== '/')
		//  throw new Error('Cannot resolve');
		// read pathname from parent URL
		// pathname taken to be part after leading "/"
		let pathname;
		if ( parentUrl[ parentProtocol.length + 1 ] === '/' ) {
			// resolving to a :// so we need to read out the auth and host
			if ( parentProtocol !== 'file:' ) {
				pathname = parentUrl.slice( parentProtocol.length + 2 );
				pathname = pathname.slice( pathname.indexOf( '/' ) + 1 );
			} else {
				pathname = parentUrl.slice( 8 );
			}
		} else {
			// resolving to :/ so pathname is the /... part
			pathname = parentUrl.slice(
				parentProtocol.length +
					( parentUrl[ parentProtocol.length ] === '/' )
			);
		}

		if ( relUrl[ 0 ] === '/' ) {
			return (
				parentUrl.slice( 0, parentUrl.length - pathname.length - 1 ) +
				relUrl
			);
		}

		// join together and split for removal of .. and . segments
		// looping the string instead of anything fancy for perf reasons
		// '../../../../../z' resolved to 'x/y' is just 'z'
		const segmented =
			pathname.slice( 0, pathname.lastIndexOf( '/' ) + 1 ) + relUrl;

		const output = [];
		let segmentIndex = -1;
		for ( let i = 0; i < segmented.length; i++ ) {
			// busy reading a segment - only terminate on '/'
			if ( segmentIndex !== -1 ) {
				if ( segmented[ i ] === '/' ) {
					output.push( segmented.slice( segmentIndex, i + 1 ) );
					segmentIndex = -1;
				}
				continue;
			}
			// new segment - check if it is relative
			else if ( segmented[ i ] === '.' ) {
				// ../ segment
				if (
					segmented[ i + 1 ] === '.' &&
					( segmented[ i + 2 ] === '/' || i + 2 === segmented.length )
				) {
					output.pop();
					i += 2;
					continue;
				}
				// ./ segment
				else if (
					segmented[ i + 1 ] === '/' ||
					i + 1 === segmented.length
				) {
					i += 1;
					continue;
				}
			}
			// it is the start of a new segment
			while ( segmented[ i ] === '/' ) {
				i++;
			}
			segmentIndex = i;
		}
		// finish reading out the last segment
		if ( segmentIndex !== -1 ) {
			output.push( segmented.slice( segmentIndex ) );
		}
		return (
			parentUrl.slice( 0, parentUrl.length - pathname.length ) +
			output.join( '' )
		);
	}
}

function resolveUrl( relUrl, parentUrl ) {
	return (
		resolveIfNotPlainOrUrl( relUrl, parentUrl ) ||
		( isURL( relUrl )
			? relUrl
			: resolveIfNotPlainOrUrl( './' + relUrl, parentUrl ) )
	);
}

function getMatch( path, matchObj ) {
	if ( matchObj[ path ] ) {
		return path;
	}
	let sepIndex = path.length;
	do {
		const segment = path.slice( 0, sepIndex + 1 );
		if ( segment in matchObj ) {
			return segment;
		}
	} while ( ( sepIndex = path.lastIndexOf( '/', sepIndex - 1 ) ) !== -1 );
}

function applyPackages( id, packages ) {
	const pkgName = getMatch( id, packages );
	if ( pkgName ) {
		const pkg = packages[ pkgName ];
		if ( pkg === null ) {
			return;
		}
		return pkg + id.slice( pkgName.length );
	}
}

function resolveImportMap( importMap, resolvedOrPlain, parentUrl ) {
	let scopeUrl = parentUrl && getMatch( parentUrl, importMap.scopes );
	while ( scopeUrl ) {
		const packageResolution = applyPackages(
			resolvedOrPlain,
			importMap.scopes[ scopeUrl ]
		);
		if ( packageResolution ) {
			return packageResolution;
		}
		scopeUrl = getMatch(
			scopeUrl.slice( 0, scopeUrl.lastIndexOf( '/' ) ),
			importMap.scopes
		);
	}
	return (
		applyPackages( resolvedOrPlain, importMap.imports ) ||
		( resolvedOrPlain.indexOf( ':' ) !== -1 && resolvedOrPlain )
	);
}

function resolveAndComposePackages(
	packages,
	outPackages,
	baseUrl,
	parentMap
) {
	for ( const p in packages ) {
		const resolvedLhs = resolveIfNotPlainOrUrl( p, baseUrl ) || p;
		const target = packages[ p ];
		if ( typeof target !== 'string' ) {
			continue;
		}
		const mapped = resolveImportMap(
			parentMap,
			resolveIfNotPlainOrUrl( target, baseUrl ) || target,
			baseUrl
		);
		if ( mapped ) {
			outPackages[ resolvedLhs ] = mapped;
			continue;
		}
		console.warn(
			`Mapping "${ p }" -> "${ packages[ p ] }" does not resolve`
		);
	}
}

function resolveAndComposeImportMap( json, baseUrl, parentMap ) {
	const outMap = {
		imports: Object.assign( {}, parentMap.imports ),
		scopes: Object.assign( {}, parentMap.scopes ),
	};

	if ( json.imports ) {
		resolveAndComposePackages(
			json.imports,
			outMap.imports,
			baseUrl,
			parentMap,
			null
		);
	}

	if ( json.scopes ) {
		for ( const s in json.scopes ) {
			const resolvedScope = resolveUrl( s, baseUrl );
			resolveAndComposePackages(
				json.scopes[ s ],
				outMap.scopes[ resolvedScope ] ||
					( outMap.scopes[ resolvedScope ] = {} ),
				baseUrl,
				parentMap
			);
		}
	}

	return outMap;
}

// TODO(mark): what is this used for?
const baseUrl = document.baseURI;
const pageBaseUrl = baseUrl;

const createBlob = ( source, type = 'text/javascript' ) =>
	URL.createObjectURL( new Blob( [ source ], { type } ) );

const dynamicImport = ( u ) => import( /* webpackIgnore: true */ u );

const supportsDynamicImport = true;

const skip = ( id ) =>
	Object.keys(
		JSON.parse(
			document.querySelector( 'script#wp-importmap[type=importmap]' ).text
		).imports
	).includes( id );

function fromParent( parent ) {
	return parent ? ` imported from ${ parent }` : '';
}

const supports = window.HTMLScriptElement.supports;

const supportsImportMaps =
	supports && supports.name === 'supports' && supports( 'importmap' );
const supportsImportMeta = supportsDynamicImport;

const importMapSrcOrLazy = false;

async function _resolve( id, parentUrl ) {
	const urlResolved = resolveIfNotPlainOrUrl( id, parentUrl );
	return {
		r: resolveImportMap( importMap, urlResolved || id, parentUrl ) || id, // throwUnresolved( id, parentUrl ),
		// b = bare specifier
		b: ! urlResolved && ! isURL( id ),
	};
}

const resolve = _resolve;

// importShim('mod');
// importShim('mod', { opts });
// importShim('mod', { opts }, parentUrl);
// importShim('mod', parentUrl);
async function importShim( id, ...args ) {
	// parentUrl if present will be the last argument
	let parentUrl = args[ args.length - 1 ];
	if ( typeof parentUrl !== 'string' ) parentUrl = pageBaseUrl;
	// needed for shim check
	await initPromise;
	return topLevelLoad( ( await resolve( id, parentUrl ) ).r, {
		credentials: 'same-origin',
	} );
}

const resolveSync = ( id, parentUrl = pageBaseUrl ) => {
	parentUrl = `${ parentUrl }`;
	return undefined; // !!!
};

function metaResolve( id, parentUrl = this.url ) {
	return resolveSync( id, parentUrl );
}

self.importShim = importShim; // For the import.meta and dynamic import cases.

const registry = ( importShim._r = {} );

async function loadAll( load, seen ) {
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

const initPromise = Promise.resolve( lexer.init );

async function topLevelLoad(
	url,
	fetchOpts,
	source,
	nativelyLoaded,
	lastStaticLoadPromise
) {
	await initPromise;
	const load = getOrCreateLoad( url, fetchOpts, null, source );
	const seen = {};
	await loadAll( load, seen );
	lastLoad = undefined;
	resolveDeps( load, seen );
	await lastStaticLoadPromise;
	const module = await dynamicImport( load.b, { errUrl: load.u } );
	// if the top-level load is a shell, run its update function
	if ( load.s ) ( await dynamicImport( load.s ) ).u$_( module );
	// when tla is supported, this should return the tla promise as an actual handle
	// so readystate can still correspond to the sync subgraph exec completions
	return module;
}

function urlJsString( url ) {
	return `'${ url.replace( /'/g, "\\'" ) }'`;
}

let lastLoad;
function resolveDeps( load, seen ) {
	if ( load.b || ! seen[ load.u ] ) return;
	seen[ load.u ] = 0;

	for ( const dep of load.d ) resolveDeps( dep, seen );

	const [ imports, exports ] = load.a;

	// "execution"
	const source = load.S;

	// edge doesnt execute sibling in order, so we fix this up by ensuring all previous executions are explicit dependencies
	let resolvedSource = edge && lastLoad ? `import '${ lastLoad }';` : '';

	if ( ! imports.length ) {
		resolvedSource += source;
	} else {
		// once all deps have loaded we can inline the dependency resolution blobs
		// and define this blob
		let lastIndex = 0,
			depIndex = 0,
			dynamicImportEndStack = [];
		function pushStringTo( originalIndex ) {
			while (
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
			// dependency source replacements
			if ( dynamicImportIndex === -1 ) {
				let depLoad = load.d[ depIndex++ ],
					blobUrl = depLoad.b,
					cycleShell = ! blobUrl;
				if ( cycleShell ) {
					// circular shell creation
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
				load.m = { url: load.r, resolve: metaResolve };
				metaHook( load.m, load.u );
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

		// support progressive cycle binding updates (try statement avoids tdz errors)
		if ( load.s )
			resolvedSource += `\n;import{u$_}from'${
				load.s
			}';try{u$_({${ exports
				.filter( ( e ) => e.ln )
				.map( ( { s, e, ln } ) => `${ source.slice( s, e ) }:${ ln }` )
				.join( ',' ) }})}catch(_){};\n`;

		pushStringTo( source.length );
	}

	let hasSourceURL = false;
	resolvedSource = resolvedSource.replace(
		sourceMapURLRegEx,
		( match, isMapping, url ) => (
			( hasSourceURL = ! isMapping ),
			match.replace( url, () => new URL( url, load.r ) )
		)
	);
	if ( ! hasSourceURL ) resolvedSource += '\n//# sourceURL=' + load.r;

	load.b = lastLoad = createBlob( resolvedSource );
	load.S = undefined;
}

// ; and // trailer support added for Ruby on Rails 7 source maps compatibility
// https://github.com/guybedford/es-module-shims/issues/228
const sourceMapURLRegEx =
	/\n\/\/# source(Mapping)?URL=([^\n]+)\s*((;|\/\/[^#][^\n]*)\s*)*$/;

const jsContentType = /^(text|application)\/(x-)?javascript(;|$)/;
const jsonContentType = /^(text|application)\/json(;|$)/;
const cssContentType = /^(text|application)\/css(;|$)/;

const cssUrlRegEx =
	/url\(\s*(?:(["'])((?:\\.|[^\n\\"'])+)\1|((?:\\.|[^\s,"'()\\])+))\s*\)/g;

// restrict in-flight fetches to a pool of 100
let p = [];
let c = 0;
function pushFetchPool() {
	if ( ++c > 100 ) return new Promise( ( r ) => p.push( r ) );
}
function popFetchPool() {
	c--;
	if ( p.length ) p.shift()();
}

async function doFetch( url, fetchOpts, parent ) {
	const poolQueue = pushFetchPool();
	if ( poolQueue ) await poolQueue;
	try {
		var res = await fetch( url, fetchOpts );
	} catch ( e ) {
		e.message =
			`Unable to fetch ${ url }${ fromParent(
				parent
			) } - see network log for details.\n` + e.message;
		throw e;
	} finally {
		popFetchPool();
	}
	if ( ! res.ok )
		throw Error(
			`${ res.status } ${ res.statusText } ${ res.url }${ fromParent(
				parent
			) }`
		);
	return res;
}

async function fetchModule( url, fetchOpts, parent ) {
	const res = await doFetch( url, fetchOpts, parent );
	const contentType = res.headers.get( 'content-type' );
	if ( jsContentType.test( contentType ) ) {
		return { r: res.url, s: await res.text(), t: 'js' };
	}
	throw Error(
		`Unsupported Content-Type "${ contentType }" loading ${ url }${ fromParent(
			parent
		) }. Modules must be served with a valid MIME type like application/javascript.`
	);
}

function getOrCreateLoad( url, fetchOpts, parent, source ) {
	let load = registry[ url ];
	if ( load && ! source ) {
		return load;
	}

	load = {
		// url
		u: url,
		// response url
		r: source ? url : undefined,
		// fetchPromise
		f: undefined,
		// source
		S: undefined,
		// linkPromise
		L: undefined,
		// analysis
		a: undefined,
		// deps
		d: undefined,
		// blobUrl
		b: undefined,
		// shellUrl
		s: undefined,
		// needsShim
		n: false,
		// type
		t: null,
		// meta
		m: null,
	};
	if ( registry[ url ] ) {
		let i = 0;
		while ( registry[ load.u + ++i ] );
		load.u += i;
	}
	registry[ load.u ] = load;

	load.f = ( async () => {
		if ( ! source ) {
			( { r: load.r, s: source } = await ( fetchCache[ url ] ||
				fetchModule( url, fetchOpts, parent ) ) );
		}
		try {
			load.a = lexer.parse( source, load.u );
		} catch ( e ) {
			console.error( e );
			load.a = [ [], [], false ];
		}
		load.S = source;
		return load;
	} )();

	load.L = load.f.then( async () => {
		let childFetchOpts = fetchOpts;
		load.d = (
			await Promise.all(
				load.a[ 0 ].map( async ( { n, d } ) => {
					if (
						( d >= 0 && ! supportsDynamicImport ) ||
						( d === -2 && ! supportsImportMeta )
					)
						load.n = true;
					if ( d !== -1 || ! n ) return;
					const { r, b } = await resolve( n, load.r || load.u );
					if ( b && ( ! supportsImportMaps || importMapSrcOrLazy ) )
						load.n = true;
					if ( d !== -1 ) return;
					if ( skip && skip( r ) ) return { b: r };
					if ( childFetchOpts.integrity )
						childFetchOpts = Object.assign( {}, childFetchOpts, {
							integrity: undefined,
						} );
					return getOrCreateLoad( r, childFetchOpts, load.r ).f;
				} )
			)
		).filter( ( l ) => l );
	} );

	return load;
}

let domContentLoadedCnt = 1;
function domContentLoadedCheck() {
	if ( --domContentLoadedCnt === 0 ) {
		if ( self.ESMS_DEBUG )
			console.info( `es-module-shims: DOMContentLoaded refire` );
		document.dispatchEvent( new Event( 'DOMContentLoaded' ) );
	}
}
// this should always trigger because we assume es-module-shims is itself a domcontentloaded requirement
document.addEventListener( 'DOMContentLoaded', async () => {
	await initPromise;
	domContentLoadedCheck();
} );

const fetchCache = {};

export function getImportMap() {
	return JSON.parse( JSON.stringify( importMap ) );
}
export function addImportMap( importMapIn ) {
	importMap = resolveAndComposeImportMap(
		importMapIn,
		pageBaseUrl,
		importMap
	);
}

export async function importWithMap( id, importMapIn ) {
	addImportMap( importMapIn );
	return importShim( id );
}
