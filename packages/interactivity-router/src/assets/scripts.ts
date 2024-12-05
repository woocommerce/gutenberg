/**
 * External dependencies
 */
import { importWithMap } from 'dynamic-importmap';

const preloaded = new Set< string >();

export const preloadModules = ( doc: Document ) => {
	const moduleUrls = [
		...doc.querySelectorAll< HTMLScriptElement >(
			'script[type=module][src]'
		),
	].map( ( s ) => s.src );

	moduleUrls.forEach( ( url ) => {
		if ( ! preloaded.has( url ) ) {
			// add the <link> elements to prefetch the module scripts
			const link = window.document.createElement( 'link' );
			link.rel = 'modulepreload';
			link.href = url;
			window.document.head.append( link );
			preloaded.add( url );
		}
	} );

	return moduleUrls;
};

const importedModules = new Set< string >();

export const setModuleAsImported = ( url: string ) => {
	importedModules.add( url );
};

export const importModules = ( moduleUrls: string[], importMap: any ) =>
	moduleUrls
		.filter( ( url ) => ! importedModules.has( url ) )
		.map( ( url ) => {
			setModuleAsImported( url );
			return importWithMap( url, importMap );
		} );
