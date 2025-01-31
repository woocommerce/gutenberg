/**
 * External dependencies
 */
import * as lexer from 'es-module-lexer';

/**
 * Internal dependencies
 */
import { fetchModule } from './fetch';
import { resolve } from './resolver';

interface ModuleLoad {
	/**
	 * The module's original URL.
	 */
	u?: string;

	/**
	 * response url
	 */
	r?: string;

	/**
	 * fetchPromise
	 */
	f?: Promise< ModuleLoad >;

	/**
	 * source (source code?)
	 */
	S?: string;

	/**
	 * linkPromise
	 */
	L?: Promise< void >;

	/**
	 * analysis
	 */
	a?: ReturnType< typeof lexer.parse >;

	/**
	 * deps
	 */
	d?: ModuleLoad[];

	/**
	 * blobUrl
	 */
	b?: string;

	/**
	 * shellUrl
	 */
	s?: string;

	/**
	 * needsShim
	 */
	n?: boolean;

	/**
	 * type (unused)
	 */
	t?: null;

	/**
	 * meta
	 */
	m?: { url: string; resolve?: undefined };
}

export const initPromise = Promise.resolve( lexer.init );

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

function urlJsString( url ) {
	return `'${ url.replace( /'/g, "\\'" ) }'`;
}

const createBlob = ( source, type = 'text/javascript' ) =>
	URL.createObjectURL( new Blob( [ source ], { type } ) );

let lastLoad;
function resolveDeps( load, seen ) {
	if ( load.b || ! seen[ load.u ] ) {
		return;
	}
	seen[ load.u ] = 0;

	for ( const dep of load.d ) {
		resolveDeps( dep, seen );
	}

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
		let lastIndex = 0;
		let depIndex = 0;
		const dynamicImportEndStack = [];
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
				const depLoad = load.d[ depIndex++ ];
				let blobUrl = depLoad.b;
				const cycleShell = ! blobUrl;
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
				load.m = { url: load.r, resolve: undefined };
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

	let hasSourceURL = false;
	resolvedSource = resolvedSource.replace(
		sourceMapURLRegEx,
		( match, isMapping, url ) => (
			( hasSourceURL = ! isMapping ),
			match.replace( url, () => new URL( url, load.r ).toString() )
		)
	);
	if ( ! hasSourceURL ) {
		resolvedSource += '\n//# sourceURL=' + load.r;
	}

	load.b = lastLoad = createBlob( resolvedSource );
	load.S = undefined;
}

// ; and // trailer support added for Ruby on Rails 7 source maps compatibility
// https://github.com/guybedford/es-module-shims/issues/228
const sourceMapURLRegEx =
	/\n\/\/# source(Mapping)?URL=([^\n]+)\s*((;|\/\/[^#][^\n]*)\s*)*$/;

function getOrCreateLoad( url, fetchOpts, parent ) {
	let load: ModuleLoad = registry[ url ];
	if ( load ) {
		return load;
	}

	load = {
		// url
		u: url,
		// response url
		r: undefined,
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
		while ( registry[ load.u + ++i ] ) {
			// Eing?
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
						return { b: r };
					}
					if ( childFetchOpts.integrity ) {
						childFetchOpts = Object.assign( {}, childFetchOpts, {
							integrity: undefined,
						} );
					}
					return getOrCreateLoad( r, childFetchOpts, load.r ).f;
				} )
			)
		).filter( ( l ) => l );
	} );

	return load;
}

export async function topLevelLoad( url, fetchOpts ) {
	await initPromise;
	const load = getOrCreateLoad( url, fetchOpts, null );
	const seen = {};
	await loadAll( load, seen );
	lastLoad = undefined;
	resolveDeps( load, seen );
	await Promise.resolve(); // Is this necessary?
	const module = await dynamicImport( load.b );
	// if the top-level load is a shell, run its update function
	if ( load.s ) {
		( await dynamicImport( load.s ) ).u$_( module );
	}
	// when tla is supported, this should return the tla promise as an actual handle
	// so readystate can still correspond to the sync subgraph exec completions
	return module;
}

const dynamicImport = ( u ) => import( /* webpackIgnore: true */ u );
