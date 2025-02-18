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
					if ( element instanceof HTMLStyleElement ) {
						const cloned = element.cloneNode(
							true
						) as HTMLStyleElement;
						window.document.head.appendChild( cloned );
						cloned.sheet.disabled = true;
						return Promise.resolve( cloned );
					}
					return new Promise( ( resolve, reject ) => {
						const cloned = element.cloneNode() as StyleElement;
						cloned.onload = () => {
							cloned.sheet.disabled = true;
							resolve( cloned );
						};
						cloned.onerror = reject;
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
			el.sheet.disabled = ! styles.includes( el );
		} );
};
