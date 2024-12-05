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

export const importModules = ( moduleUrls: string[] ) =>
	moduleUrls.map( ( url ) => import( /* webpackIgnore: true */ url ) );
