export type StyleElement = HTMLLinkElement | HTMLStyleElement;

const styleSheetCache = new Map< string, Promise< StyleElement >[] >();

export const prepareStyles = (
	doc: Document,
	url: string = ( doc.location || window.location ).href
): Promise< StyleElement >[] => {
	if ( ! styleSheetCache.has( url ) ) {
		if ( doc !== window.document ) {
			window.document.head.appendChild(
				window.document.createComment(
					`@wordpress/interactivity-router: prefetched styles for ${ url }`
				)
			);
		}
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

					if ( cloned.media ) {
						cloned.dataset.originalMedia = cloned.media;
					}
					cloned.media = 'preload';

					if ( cloned instanceof HTMLStyleElement ) {
						window.document.head.appendChild( cloned );
						return Promise.resolve( cloned );
					}
					const loadPromise = new Promise< HTMLLinkElement >(
						( resolve, reject ) => {
							cloned.addEventListener(
								'load',
								() => resolve( cloned ),
								{ once: true }
							);
							cloned.addEventListener(
								'error',
								( event ) => {
									const { href } =
										event.target as HTMLLinkElement;
									reject(
										Error(
											`The style sheet with the following URL failed to load. ${ href }`
										)
									);
								},
								{ once: true }
							);
						}
					);

					window.document.head.appendChild( cloned );
					return loadPromise;
				}
			)
		);
		if ( doc !== window.document ) {
			window.document.head.appendChild(
				window.document.createComment(
					`@wordpress/interactivity-router: end of prefetched styles`
				)
			);
		}
	}
	return styleSheetCache.get( url );
};

export const applyStyles = ( styles: StyleElement[] ) => {
	window.document
		.querySelectorAll( 'style,link[rel=stylesheet]' )
		.forEach( ( el: HTMLLinkElement | HTMLStyleElement ) => {
			if ( styles.includes( el ) ) {
				const { originalMedia = 'all' } = el.dataset;
				el.sheet.media.mediaText = originalMedia;
				el.sheet.disabled = false;
			} else {
				el.sheet.disabled = true;
			}
		} );
};
