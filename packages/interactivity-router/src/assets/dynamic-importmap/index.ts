/**
 * Internal dependencies
 */
import { addImportMap, resolve } from './resolver';
import { initPromise, topLevelLoad, preloadModule } from './loader';

type ImportMap = {
	imports?: Record< string, string >;
	scopes?: Record< string, Record< string, string > >;
};

// TODO: check if this baseURI should change per document, and so
// it need to be passed as a parameter to methods like `importWithMap`
// and `preloadWithMap`.
const baseUrl = document.baseURI;
const pageBaseUrl = baseUrl;

async function importShim< Module = unknown >( id: string ) {
	await initPromise;
	return topLevelLoad< Module >( ( await resolve( id, pageBaseUrl ) ).r, {
		credentials: 'same-origin',
	} );
}

/**
 * Imports the module with the passed ID.
 *
 * The module is resolved against the internal dynamic import map,
 * extended with the passed import map.
 *
 * @param id          Module ID.
 * @param importMapIn Import map.
 * @return Resolved module.
 */
export async function importWithMap< Module = unknown >(
	id: string,
	importMapIn: ImportMap
) {
	addImportMap( importMapIn );
	return importShim< Module >( id );
}

/**
 * Preloads the module with the passed ID along with its dependencies.
 *
 * The module is resolved against the internal dynamic import map,
 * extended with the passed import map.
 *
 * @param id          Module ID.
 * @param importMapIn Import map.
 * @return Resolved `ModuleLoad` instance.
 */
export async function preloadWithMap( id: string, importMapIn: ImportMap ) {
	addImportMap( importMapIn );
	await initPromise;
	return preloadModule( ( await resolve( id, pageBaseUrl ) ).r, {
		credentials: 'same-origin',
	} );
}

export { importPreloadedModule, type ModuleLoad } from './loader';
