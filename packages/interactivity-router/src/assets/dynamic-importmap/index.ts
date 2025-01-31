/* eslint-disable eslint-comments/disable-enable-pair */
/* eslint-disable eslint-comments/no-unlimited-disable */
/* eslint-disable */

/**
 * Internal dependencies
 */
import { addImportMap, resolve } from './resolver';
import { initPromise, registry, topLevelLoad, preloadModule } from './loader';

// TODO(mark): what is this used for?
const baseUrl = document.baseURI;
const pageBaseUrl = baseUrl;

( self as any ).importShim = importShim; // For the import.meta and dynamic import cases.
importShim._r = registry;

async function importShim( id ) {
	await initPromise;
	return topLevelLoad( ( await resolve( id, pageBaseUrl ) ).r, {
		credentials: 'same-origin',
	} );
}

export async function importWithMap( id, importMapIn ) {
	addImportMap( importMapIn );
	return importShim( id );
}

export async function preloadWithMap( id, importMapIn ) {
	addImportMap( importMapIn );
	await initPromise;
	return preloadModule( ( await resolve( id, pageBaseUrl ) ).r, {
		credentials: 'same-origin',
	} );
}

export { importPreloadedModule, type ModuleLoad } from './loader';
