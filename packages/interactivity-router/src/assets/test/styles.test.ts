/**
 * Internal dependencies
 */
import {
	updateStylesWithSCS,
	prepareStyles,
	applyStyles,
	type StyleElement,
} from '../styles';

const mockSheet = (
	element: StyleElement,
	{ disabled, mediaText }: { disabled: boolean; mediaText: string }
) => {
	if ( element.sheet ) {
		Object.assign( element.sheet, { disabled, media: { mediaText } } );
	} else {
		Object.defineProperty( element, 'sheet', {
			value: {
				disabled,
				media: { mediaText },
			},
		} );
	}
};

// Mock DOM elements for testing
const createStyleElement = ( id: string ): HTMLStyleElement => {
	const element = document.createElement( 'style' );
	element.id = id;
	element.textContent = `/* Style ${ id } */`;
	return element;
};

const createLinkElement = (
	id: string,
	href: string = `https://example.com/${ id }.css`
): HTMLLinkElement => {
	const element = document.createElement( 'link' );
	element.id = id;
	element.rel = 'stylesheet';
	element.href = href;
	return element;
};

describe( 'updateStylesWithSCS', () => {
	const parent = document.head;

	beforeEach( () => {
		document.head.replaceChildren();
	} );

	afterAll( () => {
		document.head.replaceChildren();
	} );

	it( 'should append all elements when X is empty in the correct order', () => {
		const X = [];
		const Y = [
			createStyleElement( 'style1' ),
			createLinkElement( 'link1' ),
			createStyleElement( 'style2' ),
		];
		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 3 );
		expect( parent.childNodes.length ).toBe( 3 );

		// Verify elements are in the correct order
		expect( parent.childNodes[ 0 ] ).toBe( Y[ 0 ] );
		expect( parent.childNodes[ 1 ] ).toBe( Y[ 1 ] );
		expect( parent.childNodes[ 2 ] ).toBe( Y[ 2 ] );
	} );

	it( 'should handle when both X and Y are empty', () => {
		const promises = updateStylesWithSCS( [], [], parent );

		expect( promises.length ).toBe( 0 );
		expect( parent.childNodes.length ).toBe( 0 );
	} );

	it( 'should do nothing when X is non-empty but Y is empty', () => {
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );
		const X = [ style1, style2 ];
		// Pre-append X so they are in the DOM.
		parent.append( ...X );

		const promises = updateStylesWithSCS( X, [], parent );

		// No new promises should be generated.
		expect( promises.length ).toBe( 0 );
		// The DOM should still only have the original X elements.
		expect( parent.childNodes.length ).toBe( X.length );
		expect( parent.childNodes[ 0 ] ).toBe( style1 );
		expect( parent.childNodes[ 1 ] ).toBe( style2 );
	} );

	it( 'should keep existing elements when they match in both X and Y', () => {
		const X = [
			createStyleElement( 'style1' ),
			createLinkElement( 'link1' ),
		];
		const Y = [
			createStyleElement( 'style1' ),
			createLinkElement( 'link1' ),
		];

		parent.append( ...X );

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 2 );
		expect( parent.childNodes.length ).toBe( 2 );
		// Should maintain the original elements (not replace with clones)
		expect( parent.childNodes[ 0 ] ).toBe( X[ 0 ] );
		expect( parent.childNodes[ 1 ] ).toBe( X[ 1 ] );
	} );

	it( 'should insert new elements from Y in correct positions relative to X', () => {
		const X = [
			createStyleElement( 'style1' ),
			createStyleElement( 'style3' ),
		];
		const Y = [
			createStyleElement( 'style1' ),
			createStyleElement( 'style2' ),
			createStyleElement( 'style3' ),
			createStyleElement( 'style4' ),
		];

		parent.append( ...X );

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 4 );
		expect( parent.childNodes.length ).toBe( 4 );
		expect( parent.childNodes[ 0 ] ).toBe( X[ 0 ] );
		expect( parent.childNodes[ 1 ] ).toBe( Y[ 1 ] );
		expect( parent.childNodes[ 2 ] ).toBe( X[ 1 ] );
		expect( parent.childNodes[ 3 ] ).toBe( Y[ 3 ] );
	} );

	it( 'should handle Y having completely different elements than X', () => {
		const X = [
			createStyleElement( 'style1' ),
			createStyleElement( 'style2' ),
		];
		const Y = [
			createStyleElement( 'style3' ),
			createStyleElement( 'style4' ),
		];

		parent.append( ...X );

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 2 );

		// Check the specific order - based on the SCS algorithm
		// When X and Y are completely different, the SCS places
		// all elements from Y before X.
		expect( parent.childNodes[ 0 ] ).toBe( Y[ 0 ] );
		expect( parent.childNodes[ 1 ] ).toBe( Y[ 1 ] );
		expect( parent.childNodes[ 2 ] ).toBe( X[ 0 ] );
		expect( parent.childNodes[ 3 ] ).toBe( X[ 1 ] );
	} );

	it( 'should consider normalized media attributes when comparing elements', () => {
		// These should be considered equal after normalizing the media attribute
		const X = [ createLinkElement( 'same-link' ) ];
		const Y = [ createLinkElement( 'same-link' ) ];

		X[ 0 ].setAttribute( 'media', 'preload' );
		X[ 0 ].dataset.originalMedia = 'screen';

		Y[ 0 ].setAttribute( 'media', 'screen' );

		parent.append( ...X );

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( parent.childNodes.length ).toBe( 1 );
		expect( promises.length ).toBe( 1 );
		expect( parent.childNodes[ 0 ] ).toBe( X[ 0 ] );
	} );

	it( 'should treat style elements as already loaded', async () => {
		const X = [ createStyleElement( 'style1' ) ];
		const Y = [ createStyleElement( 'style1' ) ];

		parent.append( ...X );

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 1 );
		expect( await promises[ 0 ] ).toBe( X[ 0 ] );
	} );

	it( 'should return the same promise for equivalent link elements', () => {
		const X = [ createLinkElement( 'link1' ) ];
		const Y = [ createLinkElement( 'link1' ) ];

		// First, add it to the DOM
		const promises1 = updateStylesWithSCS( [], X, parent );

		// Then, use it in a second call
		const promises2 = updateStylesWithSCS( X, Y, parent );

		// The promises should be the same
		expect( promises1[ 0 ] ).toBe( promises2[ 0 ] );
	} );

	it( 'should return the same promise for equivalent style elements', () => {
		const X = [ createStyleElement( 'style1' ) ];
		const Y = [ createStyleElement( 'style1' ) ];

		// First, add it to the DOM
		const promises1 = updateStylesWithSCS( [], X, parent );

		// Then, use it in a second call
		const promises2 = updateStylesWithSCS( X, Y, parent );

		// The promises should be the same
		expect( promises1[ 0 ] ).toBe( promises2[ 0 ] );
	} );

	it( 'should handle complex reordering of elements maintaining the correct order', async () => {
		// Initial set of elements
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );
		const style3 = createStyleElement( 'style3' );
		const style4 = createStyleElement( 'style4' );

		const X = [ style1, style2, style3, style4 ];
		parent.append( ...X );

		// New set with reordering and some new elements
		const newStyle1 = createStyleElement( 'style1' );
		const newStyle3 = createStyleElement( 'style3' );
		const newStyle5 = createStyleElement( 'style5' );
		const newStyle2 = createStyleElement( 'style2' );
		const newStyle6 = createStyleElement( 'style6' );

		const Y = [ newStyle1, newStyle3, newStyle5, newStyle2, newStyle6 ];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 5 );

		// Verify the exact order
		expect( parent.childNodes[ 0 ] ).toBe( style1 );
		expect( parent.childNodes[ 1 ] ).toBe( newStyle3 );
		expect( parent.childNodes[ 2 ] ).toBe( newStyle5 );
		expect( parent.childNodes[ 3 ] ).toBe( style2 );
		expect( parent.childNodes[ 4 ] ).toBe( newStyle6 );
		expect( parent.childNodes[ 5 ] ).toBe( style3 );
		expect( parent.childNodes[ 6 ] ).toBe( style4 );

		// Verify the promise values
		const values = await Promise.all( promises );
		expect( values[ 0 ] ).toBe( style1 );
		expect( values[ 1 ] ).toBe( newStyle3 );
		expect( values[ 2 ] ).toBe( newStyle5 );
		expect( values[ 3 ] ).toBe( style2 );
		expect( values[ 4 ] ).toBe( newStyle6 );
	} );

	it( 'should handle link elements with load events', async () => {
		const link1 = createLinkElement( 'link1' );
		const promises = updateStylesWithSCS( [], [ link1 ], parent );

		// Manually trigger a load event
		link1.dispatchEvent( new Event( 'load' ) );

		// The promise should resolve with the link element
		const result = await promises[ 0 ];
		expect( result ).toBe( link1 );
	} );

	it( 'should reject the promise when a link element fails to load', async () => {
		const link1 = createLinkElement( 'link-fail' );
		// Remove load/error listeners by not adding it to the DOM initially.
		const promises = updateStylesWithSCS( [], [ link1 ], parent );

		// Simulate an error event.
		const errorEvent = new Event( 'error' );
		link1.dispatchEvent( errorEvent );

		await expect( promises[ 0 ] ).rejects.toThrow(
			`The style sheet with the following URL failed to load. ${ link1.href }`
		);
	} );

	it( 'should handle mixed style and link elements', async () => {
		const X = [
			createLinkElement( 'link1' ),
			createStyleElement( 'style1' ),
			createLinkElement( 'link2' ),
			createStyleElement( 'style2' ),
			createStyleElement( 'style3' ),
		];
		parent.append( ...X );

		const Y = [
			createLinkElement( 'link1' ),
			createLinkElement( 'link3' ),
			createStyleElement( 'style1' ),
			createLinkElement( 'link2' ),
			createStyleElement( 'style2' ),
			createLinkElement( 'link1' ),
		];

		// Run the update using X and Y.
		const promises = updateStylesWithSCS( X, Y, parent );

		// Expected DOM outcome (based on the SCS algorithm):
		// We expect that the existing link1 and link2 are reused, and the new link3 is inserted.
		// The duplicate occurrences of link1 (via link1Clone and link1 itself in Y)
		// should resolve to the original link1.
		expect( parent.childNodes.length ).toBe( 7 );
		expect( [ ...parent.childNodes ] ).toEqual( [
			X[ 0 ],
			Y[ 1 ],
			X[ 1 ],
			X[ 2 ],
			X[ 3 ],
			Y[ 5 ],
			X[ 4 ],
		] );

		( parent.childNodes as NodeListOf< StyleElement > ).forEach(
			( element ) => element.dispatchEvent( new Event( 'load' ) )
		);

		// Verify that the returned promises resolve to the appropriate elements.
		const resolved = await Promise.all( promises );

		expect( promises.length ).toBe( 6 );
		expect( resolved ).toEqual( [
			X[ 0 ],
			Y[ 1 ],
			X[ 1 ],
			X[ 2 ],
			X[ 3 ],
			Y[ 5 ],
		] );
	} );

	it( 'should set media and data-original-media correctly on new elements', async () => {
		const X = [
			createStyleElement( 'style1' ),
			createStyleElement( 'style1Media' ),
			createLinkElement( 'link1' ),
			createLinkElement( 'link1Media' ),
		];

		X[ 1 ].setAttribute( 'media', 'screen' ); // style1Media
		X[ 3 ].setAttribute( 'media', 'screen' ); // link1Media

		mockSheet( X[ 2 ], { disabled: false, mediaText: 'all' } ); // link1
		mockSheet( X[ 3 ], { disabled: false, mediaText: 'screen' } ); // link1Media

		parent.append( ...X );

		const Y = [
			...X.map( ( e ) => e.cloneNode( true ) as StyleElement ),
			createStyleElement( 'style2' ),
			createStyleElement( 'style2Media' ),
			createLinkElement( 'link2' ),
			createLinkElement( 'link2Media' ),
		];

		Y[ 5 ].setAttribute( 'media', 'screen' ); // style2Media
		Y[ 7 ].setAttribute( 'media', 'screen' ); // link2Media

		const promises = updateStylesWithSCS( X, Y, parent );

		( parent.childNodes as NodeListOf< StyleElement > ).forEach(
			( element ) => element.dispatchEvent( new Event( 'load' ) )
		);

		const elements = await Promise.all( promises );

		const attributes = elements.map( ( e ) => ( {
			id: e.id,
			media: e.getAttribute( 'media' ),
			originalMedia: e.getAttribute( 'data-original-media' ),
		} ) );

		expect( attributes ).toEqual( [
			{
				id: 'style1',
				media: null,
				originalMedia: null,
			},
			{
				id: 'style1Media',
				media: 'screen',
				originalMedia: null,
			},
			{
				id: 'link1',
				media: null,
				originalMedia: null,
			},
			{
				id: 'link1Media',
				media: 'screen',
				originalMedia: null,
			},
			{
				id: 'style2',
				media: 'preload',
				originalMedia: null,
			},
			{
				id: 'style2Media',
				media: 'preload',
				originalMedia: 'screen',
			},
			{
				id: 'link2',
				media: 'preload',
				originalMedia: null,
			},
			{
				id: 'link2Media',
				media: 'preload',
				originalMedia: 'screen',
			},
		] );
	} );
} );

// Tests for prepareStyles function
describe( 'prepareStyles', () => {
	beforeEach( () => {
		document.head.replaceChildren();
	} );

	afterAll( () => {
		document.head.replaceChildren();
	} );

	it( 'should use cached promises for the same URL', () => {
		// Create a test document
		const doc = document.implementation.createHTMLDocument();
		const style = doc.createElement( 'style' );
		doc.head.appendChild( style );

		// First call should update the DOM
		const firstResult = prepareStyles( doc, 'https://example.com/test' );
		expect( firstResult ).toBeTruthy();

		// Second call should return the same promises
		const secondResult = prepareStyles( doc, 'https://example.com/test' );
		expect( secondResult ).toBe( firstResult );
	} );

	it( 'should extract style elements from the provided document', () => {
		// Create a test document with style elements
		const doc = document.implementation.createHTMLDocument();
		const style1 = doc.createElement( 'style' );
		style1.id = 'test-style-1';
		const style2 = doc.createElement( 'link' );
		style2.id = 'test-link-1';
		style2.rel = 'stylesheet';
		doc.head.appendChild( style1 );
		doc.head.appendChild( style2 );

		prepareStyles( doc, 'https://example.com/another-test-page' );

		// Check that styles were extracted and added to the document
		expect( document.querySelector( '#test-style-1' ) ).toBeTruthy();
		expect( document.querySelector( '#test-link-1' ) ).toBeTruthy();
	} );
} );

// Tests for applyStyles function
describe( 'applyStyles', () => {
	beforeEach( () => {
		document.head.replaceChildren();
	} );

	afterAll( () => {
		document.head.replaceChildren();
	} );

	it( 'should enable included styles and disable others', () => {
		// Create some style elements
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );
		const style3 = createStyleElement( 'style3' );

		// Add all to document
		document.head.appendChild( style1 );
		document.head.appendChild( style2 );
		document.head.appendChild( style3 );

		// Init `sheet` property
		mockSheet( style1, { disabled: true, mediaText: 'all' } );
		mockSheet( style2, { disabled: false, mediaText: 'all' } );
		mockSheet( style3, { disabled: false, mediaText: 'prefetch' } );

		// Apply styles to only style1 and style3
		applyStyles( [ style1, style3 ] );

		// style1 and style3 should be enabled, style2 should be disabled
		expect( style1.sheet!.disabled ).toBe( false );
		expect( style2.sheet!.disabled ).toBe( true );
		expect( style3.sheet!.disabled ).toBe( false );
	} );

	it( 'should set media appropriately based on originalMedia', () => {
		// Create link elements with originalMedia
		const link1 = createLinkElement( 'link1' );
		link1.setAttribute( 'media', 'prefetch' );
		link1.dataset.originalMedia = 'print';
		const link2 = createLinkElement( 'link2' );
		link2.setAttribute( 'media', 'prefetch' );
		link2.dataset.originalMedia = 'screen';

		// Add to document
		document.head.appendChild( link1 );
		document.head.appendChild( link2 );

		// Init `sheet` property
		mockSheet( link1, { disabled: false, mediaText: 'prefetch' } );
		mockSheet( link2, { disabled: false, mediaText: 'prefetch' } );

		// Apply styles
		applyStyles( [ link1, link2 ] );

		// Check that media was set correctly
		expect( link1.sheet!.media.mediaText ).toBe( 'print' );
		expect( link2.sheet!.media.mediaText ).toBe( 'screen' );
	} );

	it( 'should use "all" as default media if no originalMedia specified', () => {
		// Create elements without originalMedia
		const link = createLinkElement( 'link' );
		const style = createStyleElement( 'style' );
		link.setAttribute( 'media', 'prefetch' );
		style.setAttribute( 'media', 'prefetch' );

		// Add to document
		document.head.append( link, style );

		// Init `sheet` property
		mockSheet( link, { disabled: false, mediaText: 'preload' } );
		mockSheet( style, { disabled: false, mediaText: 'preload' } );

		// Apply styles
		applyStyles( [ link, style ] );

		// Default should be "all"
		expect( link.sheet!.media.mediaText ).toBe( 'all' );
		expect( style.sheet!.media.mediaText ).toBe( 'all' );
	} );
} );
