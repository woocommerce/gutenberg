/**
 * Internal dependencies
 */
import { shortestCommonSupersequence } from './scs';

export type StyleElement = HTMLLinkElement | HTMLStyleElement;

const isStyleEqual = ( a: StyleElement, b: StyleElement ): boolean => {
	if ( a === b ) {
		return true;
	}

	const [ normalizedA, normalizedB ] = [ a, b ].map( ( element ) => {
		if ( element.getAttribute( 'media' ) === 'preload' ) {
			element = element.cloneNode( true ) as StyleElement;
			const { originalMedia } = element.dataset;
			if ( originalMedia ) {
				element.setAttribute( 'media', originalMedia );
				element.removeAttribute( 'data-original-media' );
			} else {
				element.removeAttribute( 'media' );
			}
		}
		return element;
	} );

	const result = normalizedA.isEqualNode( normalizedB );

	return result;
};

export function updateStylesWithSCS(
	X: StyleElement[],
	Y: StyleElement[],
	parent: Element = window.document.head
) {
	if ( X.length === 0 ) {
		return Y.map( ( element ) => {
			parent.appendChild( element );
			return prepareStyleElement( element );
		} );
	}

	const scs = shortestCommonSupersequence( X, Y, isStyleEqual );
	const xLength = X.length;
	const yLength = Y.length;
	const promises = [];
	let last = X[ xLength - 1 ];
	let xIndex = 0;
	let yIndex = 0;

	for ( const element of scs ) {
		if ( xIndex < xLength && isStyleEqual( X[ xIndex ], element ) ) {
			if ( yIndex < yLength && isStyleEqual( Y[ yIndex ], element ) ) {
				promises.push( Promise.resolve( X[ xIndex ] ) );
				yIndex++;
			}
			xIndex++;
		} else {
			const clone = Y[ yIndex ].cloneNode( true ) as StyleElement;
			promises.push( prepareStyleElement( clone ) );
			if ( xIndex < xLength ) {
				X[ xIndex ].before( clone );
				yIndex++;
			} else {
				last.after( clone );
				last = clone;
			}
		}
	}

	return promises;
}

const prepareStyleElement = (
	element: StyleElement
): Promise< StyleElement > => {
	if ( element.media ) {
		element.dataset.originalMedia = element.media;
	}

	element.media = 'preload';

	if ( element instanceof HTMLStyleElement ) {
		return Promise.resolve( element );
	}

	const loadPromise = new Promise< HTMLLinkElement >( ( resolve, reject ) => {
		element.addEventListener( 'load', () => resolve( element ) );
		element.addEventListener( 'error', ( event ) => {
			const { href } = event.target as HTMLLinkElement;
			reject(
				Error(
					`The style sheet with the following URL failed to load. ${ href }`
				)
			);
		} );
	} );

	return loadPromise;
};

const styleSheetCache = new Map< string, Promise< StyleElement >[] >();

export const prepareStyles = (
	doc: Document,
	url: string = ( doc.location || window.location ).href
): Promise< StyleElement >[] => {
	if ( ! styleSheetCache.has( url ) ) {
		const currentStyleElements = Array.from(
			window.document.querySelectorAll< StyleElement >(
				'style,link[rel=stylesheet]'
			)
		);
		const newStyleElements = Array.from(
			doc.querySelectorAll< StyleElement >( 'style,link[rel=stylesheet]' )
		);

		// Set styles in order.
		const stylePromises = updateStylesWithSCS(
			currentStyleElements,
			newStyleElements
		);

		styleSheetCache.set( url, stylePromises );
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
