/**
 * Internal dependencies
 */
import {
	importPreloadedModule,
	preloadWithMap,
	type ModuleLoad,
} from './dynamic-importmap';

const preloadedModules = new Set< string >();

export const setModuleAsPreloaded = ( url: string ) => {
	preloadedModules.add( url );
};

export const preloadModules = ( doc: Document, importMap: any ) => {
	const moduleUrls = [
		...doc.querySelectorAll< HTMLScriptElement >(
			'script[type=module][src]'
		),
	].map( ( s ) => s.src );

	return moduleUrls
		.filter( ( url ) => ! preloadedModules.has( url ) )
		.map( ( url ) => {
			setModuleAsPreloaded( url );
			return preloadWithMap( url, importMap );
		} );
};

const importedModules = new Set< string >();

export const setModuleAsImported = ( url: string ) => {
	importedModules.add( url );
};

export const importModules = ( modules: ModuleLoad[] ) =>
	modules
		.filter( ( { u: url } ) => ! importedModules.has( url ) )
		.map( ( m ) => {
			setModuleAsImported( m.u );
			return importPreloadedModule( m );
		} );
