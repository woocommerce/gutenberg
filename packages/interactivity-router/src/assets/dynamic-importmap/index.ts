/**
 * Internal dependencies
 */
import { addImportMap, resolve } from './resolver';
import { initPromise, registry, topLevelLoad, preloadModule } from './loader';

// TODO: check if this baseURI should change per document, and so
// it need to be passed as a parameter to methods like `importWithMap`
// and `preloadWithMap`.
const baseUrl = document.baseURI;
const pageBaseUrl = baseUrl;

// Global property used on `import.meta` cases.
// TODO: not sure if we need to support that case for now.
( self as any ).importShim = importShim;
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
