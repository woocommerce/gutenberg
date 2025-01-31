/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

/**
 * Internal dependencies
 */
import { addImportMap, resolve } from './resolver';
import { initPromise, registry, topLevelLoad } from './loader';

// TODO(mark): what is this used for?
const baseUrl = document.baseURI;
const pageBaseUrl = baseUrl;

( self as any ).importShim = importShim; // For the import.meta and dynamic import cases.
importShim._r = registry;

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

export async function importWithMap( id, importMapIn ) {
	addImportMap( importMapIn );
	return importShim( id );
}
