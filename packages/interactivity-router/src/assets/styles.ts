export type StyleElement = HTMLLinkElement | HTMLStyleElement;

const styleSheetCache = new Map< string, Promise< StyleElement >[] >();

export const prepareStyles = (
	doc: Document,
	url: string = ( doc.location || window.location ).href
): Promise< StyleElement >[] => {
	if ( ! styleSheetCache.has( url ) ) {
		const comment = window.document.createComment( url );
		window.document.head.appendChild( comment );
		styleSheetCache.set(
			url,
			[ ...doc.querySelectorAll( 'style,link[rel=stylesheet]' ) ].map(
				( element: StyleElement ) => {
					if ( doc === window.document ) {
						return Promise.resolve( element );
					}

					const cloned = element.cloneNode( true ) as
						| HTMLStyleElement
						| HTMLLinkElement;

					cloned.dataset.originalMedia = cloned.media || 'all';
					cloned.media = 'prefetch';

					if ( cloned instanceof HTMLStyleElement ) {
						window.document.head.appendChild( cloned );
						return Promise.resolve( cloned );
					}
					return new Promise( ( resolve, reject ) => {
						cloned.addEventListener(
							'load',
							() => resolve( cloned ),
							{ once: true }
						);
						cloned.addEventListener( 'error', reject );
						window.document.head.appendChild( cloned );
					} );
				}
			)
		);
	}
	return styleSheetCache.get( url );
};

export const applyStyles = async ( styles: StyleElement[] ) => {
	window.document
		.querySelectorAll( 'style,link[rel=stylesheet]' )
		.forEach( ( el: HTMLLinkElement | HTMLStyleElement ) => {
			if ( styles.includes( el ) ) {
				const { originalMedia = 'all' } = el.dataset;
				el.sheet.media.appendMedium( originalMedia );
				el.sheet.disabled = false;
			} else {
				el.sheet.disabled = true;
			}
		} );
};
