/**
 * Internal dependencies
 */
import {
	updateStylesWithSCS,
	StyleElement,
	prepareStyles,
	applyStyles,
} from '../styles';

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

// Mock for Sheet property since it's not available in jsdom
Object.defineProperty( HTMLLinkElement.prototype, 'sheet', {
	get() {
		if ( ! this._sheet ) {
			this._sheet = {
				disabled: false,
				media: { mediaText: 'all' },
			};
		}
		return this._sheet;
	},
} );

Object.defineProperty( HTMLStyleElement.prototype, 'sheet', {
	get() {
		if ( ! this._sheet ) {
			this._sheet = {
				disabled: false,
				media: { mediaText: 'all' },
			};
		}
		return this._sheet;
	},
} );

describe( 'updateStylesWithSCS', () => {
	let parent: HTMLElement;

	beforeEach( () => {
		// Clean up the DOM and create a fresh parent element for each test
		document.body.innerHTML = '';
		parent = document.createElement( 'div' );
		document.body.appendChild( parent );

		// Try to clear any cached promises (though this is internal to the implementation)
		jest.restoreAllMocks();
	} );

	it( 'should append all elements when X is empty in the correct order', () => {
		const Y = [
			createStyleElement( 'style1' ),
			createLinkElement( 'link1' ),
			createStyleElement( 'style2' ),
		];

		const promises = updateStylesWithSCS( [], Y, parent );

		expect( promises.length ).toBe( 3 );
		expect( parent.childNodes.length ).toBe( 3 );

		// Verify elements are present
		expect( parent.querySelector( '#style1' ) ).toBeTruthy();
		expect( parent.querySelector( '#link1' ) ).toBeTruthy();
		expect( parent.querySelector( '#style2' ) ).toBeTruthy();

		// Verify elements are in the correct order
		expect( parent.childNodes[ 0 ].id ).toBe( 'style1' );
		expect( parent.childNodes[ 1 ].id ).toBe( 'link1' );
		expect( parent.childNodes[ 2 ].id ).toBe( 'style2' );
	} );

	it( 'should handle when both X and Y are empty', () => {
		const promises = updateStylesWithSCS( [], [], parent );

		expect( promises.length ).toBe( 0 );
		expect( parent.childNodes.length ).toBe( 0 );
	} );

	it( 'should keep existing elements when they match in both X and Y', () => {
		const style1 = createStyleElement( 'style1' );
		const link1 = createLinkElement( 'link1' );

		// Add elements to parent to simulate existing DOM
		parent.appendChild( style1 );
		parent.appendChild( link1 );

		const X = [ style1, link1 ];
		const Y = [
			style1.cloneNode( true ),
			link1.cloneNode( true ),
		] as StyleElement[];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 2 );
		expect( parent.childNodes.length ).toBe( 2 );
		// Should maintain the original elements (not replace with clones)
		expect( parent.childNodes[ 0 ] ).toBe( style1 );
		expect( parent.childNodes[ 1 ] ).toBe( link1 );
	} );

	it( 'should insert new elements from Y in correct positions relative to X', () => {
		const style1 = createStyleElement( 'style1' );
		const style3 = createStyleElement( 'style3' );

		// Add existing elements to parent
		parent.appendChild( style1 );
		parent.appendChild( style3 );

		const X = [ style1, style3 ];
		const style2 = createStyleElement( 'style2' );
		const style4 = createStyleElement( 'style4' );
		const Y = [
			style1.cloneNode( true ),
			style2,
			style3.cloneNode( true ),
			style4,
		] as StyleElement[];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 4 );
		expect( parent.childNodes.length ).toBe( 4 );
		expect( parent.childNodes[ 0 ].id ).toBe( 'style1' );
		expect( parent.childNodes[ 1 ].id ).toBe( 'style2' );
		expect( parent.childNodes[ 2 ].id ).toBe( 'style3' );
		expect( parent.childNodes[ 3 ].id ).toBe( 'style4' );
	} );

	it( 'should handle Y having completely different elements than X in a deterministic order', () => {
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );

		// Add existing elements to parent
		parent.appendChild( style1 );
		parent.appendChild( style2 );

		const X = [ style1, style2 ];
		const style3 = createStyleElement( 'style3' );
		const style4 = createStyleElement( 'style4' );
		const Y = [ style3, style4 ];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 2 );

		// Verify all elements exist after the update
		const ids = Array.from( parent.childNodes ).map(
			( node ) => ( node as HTMLElement ).id
		);
		expect( ids ).toContain( 'style1' );
		expect( ids ).toContain( 'style2' );
		expect( ids ).toContain( 'style3' );
		expect( ids ).toContain( 'style4' );

		// Check the specific order - based on the SCS algorithm
		// When X and Y are completely different, the SCS places all elements from Y before X
		expect( parent.childNodes[ 0 ].id ).toBe( 'style3' );
		expect( parent.childNodes[ 1 ].id ).toBe( 'style4' );
		expect( parent.childNodes[ 2 ].id ).toBe( 'style1' );
		expect( parent.childNodes[ 3 ].id ).toBe( 'style2' );
	} );

	it( 'should consider normalized media attributes when comparing elements', () => {
		// Create a link that simulates one that has been processed for preloading
		const link1 = createLinkElement( 'same-link' );
		link1.setAttribute( 'media', 'preload' );
		link1.dataset.originalMedia = 'screen';
		parent.appendChild( link1 );

		// Create an identical link with regular media attribute
		const link2 = createLinkElement( 'same-link' );
		link2.setAttribute( 'media', 'screen' );

		// These should be considered equal after normalizing the media attribute
		const X = [ link1 ];
		const Y = [ link2 ];

		const promises = updateStylesWithSCS( X, Y, parent );

		// Should only have one link in the parent (no duplicates)
		expect( parent.childNodes.length ).toBe( 1 );

		// Should have only returned one promise, since the elements are considered equal
		expect( promises.length ).toBe( 1 );

		// The original element should still be in the DOM
		expect( parent.contains( link1 ) ).toBe( true );
	} );

	it( 'should treat style elements as already loaded', async () => {
		const style1 = createStyleElement( 'style1' );
		const promises = updateStylesWithSCS( [], [ style1 ], parent );

		expect( promises.length ).toBe( 1 );

		// Style elements should resolve immediately
		const result = await promises[ 0 ];
		expect( result ).toBe( style1 );
	} );

	it( 'should return the same promise for the same element', () => {
		const link1 = createLinkElement( 'link1' );

		// First, add it to the DOM
		const promises1 = updateStylesWithSCS( [], [ link1 ], parent );

		// Then, use it in a second call
		const X = [];
		const Y = [ link1 ];
		const promises2 = updateStylesWithSCS( X, Y, parent );

		// The promises should be the same
		expect( promises1[ 0 ] ).toBe( promises2[ 0 ] );
	} );

	it( 'should return the same promise for the same style element', () => {
		const style1 = createStyleElement( 'style1' );

		// First, add it to the DOM
		const promises1 = updateStylesWithSCS( [], [ style1 ], parent );

		// Then, use it in a second call
		const X = [];
		const Y = [ style1 ];
		const promises2 = updateStylesWithSCS( X, Y, parent );

		// The promises should be the same
		expect( promises1[ 0 ] ).toBe( promises2[ 0 ] );
	} );

	it( 'should handle complex reordering of elements maintaining the correct order', () => {
		// Initial set of elements
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );
		const style3 = createStyleElement( 'style3' );
		const style4 = createStyleElement( 'style4' );

		parent.appendChild( style1 );
		parent.appendChild( style2 );
		parent.appendChild( style3 );
		parent.appendChild( style4 );

		const X = [ style1, style2, style3, style4 ];

		// New set with reordering and some new elements
		const newStyle1 = createStyleElement( 'style1' );
		const newStyle3 = createStyleElement( 'style3' );
		const newStyle5 = createStyleElement( 'style5' );
		const newStyle2 = createStyleElement( 'style2' );
		const newStyle6 = createStyleElement( 'style6' );

		const Y = [ newStyle1, newStyle3, newStyle5, newStyle2, newStyle6 ];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 5 );

		// Check the exact order of elements after applying the SCS algorithm
		const ids = Array.from( parent.childNodes ).map(
			( node ) => ( node as HTMLElement ).id
		);

		// The actual order from observation:
		// 1. style1 (matched in both X and Y)
		// 2. style3 (matched in both X and Y)
		// 3. style5 (only in Y, inserted after style3)
		// 4. style2 (matched in both X and Y)
		// 5. style6 (only in Y, inserted after style2)
		// 6. style3 (appears again - the original element)
		// 7. style4 (kept from X since it wasn't in Y)

		// Verify the exact order
		expect( ids[ 0 ] ).toBe( 'style1' );
		expect( ids[ 1 ] ).toBe( 'style3' );
		expect( ids[ 2 ] ).toBe( 'style5' );
		expect( ids[ 3 ] ).toBe( 'style2' );
		expect( ids[ 4 ] ).toBe( 'style6' );
		expect( ids[ 5 ] ).toBe( 'style3' ); // Duplicate style3
		expect( ids[ 6 ] ).toBe( 'style4' );
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

	it( 'should handle mixed style and link elements by adding them all to the DOM', () => {
		// Create a mix of style and link elements
		const style1 = createStyleElement( 'style1' );
		const link1 = createLinkElement( 'link1' );

		// Add elements to parent
		parent.appendChild( style1 );

		const X = [ style1 ];
		const Y = [ style1.cloneNode( true ), link1 ] as StyleElement[];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 2 );

		// Check both elements are in the DOM
		expect( parent.contains( style1 ) ).toBe( true );
		expect( parent.contains( link1 ) ).toBe( true );
	} );

	it( 'should handle additions to element sets with correct ordering', () => {
		// Initial set
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );

		parent.appendChild( style1 );
		parent.appendChild( style2 );

		const X = [ style1, style2 ];

		// New set adds an element at the end
		const style3 = createStyleElement( 'style3' );

		const Y = [
			style1.cloneNode( true ) as HTMLStyleElement,
			style2.cloneNode( true ) as HTMLStyleElement,
			style3,
		];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 3 );

		// Get the actual order of elements
		const ids = Array.from( parent.childNodes ).map(
			( node ) => ( node as HTMLElement ).id
		);

		// In this case, we should expect:
		// 1. style1 (matched in both X and Y)
		// 2. style2 (matched in both X and Y)
		// 3. style3 (new element added after existing ones)

		// Verify the exact order
		expect( ids[ 0 ] ).toBe( 'style1' );
		expect( ids[ 1 ] ).toBe( 'style2' );
		expect( ids[ 2 ] ).toBe( 'style3' );
	} );

	it( 'should efficiently handle additions at the beginning', () => {
		// Initial set
		const style3 = createStyleElement( 'style3' );
		const style4 = createStyleElement( 'style4' );

		parent.appendChild( style3 );
		parent.appendChild( style4 );

		const X = [ style3, style4 ];

		// New set adds elements at the beginning
		const style1 = createStyleElement( 'style1' );
		const style2 = createStyleElement( 'style2' );

		const Y = [
			style1,
			style2,
			style3.cloneNode( true ) as HTMLStyleElement,
			style4.cloneNode( true ) as HTMLStyleElement,
		];

		const promises = updateStylesWithSCS( X, Y, parent );

		expect( promises.length ).toBe( 4 );

		// All elements should be in the DOM
		const ids = Array.from( parent.childNodes ).map(
			( node ) => ( node as HTMLElement ).id
		);
		expect( ids ).toContain( 'style1' );
		expect( ids ).toContain( 'style2' );
		expect( ids ).toContain( 'style3' );
		expect( ids ).toContain( 'style4' );

		// Check the order
		expect( ids.indexOf( 'style1' ) ).toBeLessThan(
			ids.indexOf( 'style3' )
		);
		expect( ids.indexOf( 'style2' ) ).toBeLessThan(
			ids.indexOf( 'style3' )
		);
		expect( ids.indexOf( 'style3' ) ).toBeLessThan(
			ids.indexOf( 'style4' )
		);
	} );
} );

// Tests for prepareStyles function
describe( 'prepareStyles', () => {
	beforeEach( () => {
		// Clean up the DOM
		document.body.innerHTML = '';
		// Clear the cache by setting it to a new Map
		// @ts-ignore - accessing private property for testing
		window.styleSheetCache = new Map();
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

		// Call prepareStyles
		prepareStyles( doc );

		// Check that styles were extracted and added to the document
		expect( document.querySelector( '#test-style-1' ) ).toBeTruthy();
		expect( document.querySelector( '#test-link-1' ) ).toBeTruthy();
	} );
} );

// Tests for applyStyles function
describe( 'applyStyles', () => {
	beforeEach( () => {
		// Clean up the DOM
		document.body.innerHTML = '';
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

		// Apply styles to only style1 and style3
		applyStyles( [ style1, style3 ] );

		// style1 and style3 should be enabled, style2 should be disabled
		expect( style1.sheet.disabled ).toBe( false );
		expect( style2.sheet.disabled ).toBe( true );
		expect( style3.sheet.disabled ).toBe( false );
	} );

	it( 'should set media appropriately based on originalMedia', () => {
		// Create link elements with originalMedia
		const link1 = createLinkElement( 'link1' );
		link1.dataset.originalMedia = 'print';
		const link2 = createLinkElement( 'link2' );
		link2.dataset.originalMedia = 'screen';

		// Add to document
		document.head.appendChild( link1 );
		document.head.appendChild( link2 );

		// Apply styles
		applyStyles( [ link1, link2 ] );

		// Check that media was set correctly
		expect( link1.sheet.media.mediaText ).toBe( 'print' );
		expect( link2.sheet.media.mediaText ).toBe( 'screen' );
	} );

	it( 'should use "all" as default media if no originalMedia specified', () => {
		// Create link element without originalMedia
		const link = createLinkElement( 'link' );

		// Add to document
		document.head.appendChild( link );

		// Apply styles
		applyStyles( [ link ] );

		// Default should be "all"
		expect( link.sheet.media.mediaText ).toBe( 'all' );
	} );
} );
