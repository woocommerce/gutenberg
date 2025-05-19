/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

test.describe( 'Router regions', () => {
	test.beforeAll( async ( { interactivityUtils: utils } ) => {
		await utils.activatePlugins();
		const next = await utils.addPostWithBlock( 'test/router-regions', {
			alias: 'router regions - page 2',
			attributes: { page: 2 },
		} );
		await utils.addPostWithBlock( 'test/router-regions', {
			alias: 'router regions - page 1',
			attributes: { page: 1, next },
		} );

		// These pages are for testing router regions with `attachTo`.
		const pageAttachTo2 = await utils.addPostWithBlock(
			'test/router-regions',
			{
				alias: 'router regions - page 2',
				attributes: {
					page: 'attachTo2',
					regionWithAttachTo: true,
					counter: 10,
				},
			}
		);
		const pageAttachTo1 = await utils.addPostWithBlock(
			'test/router-regions',
			{
				alias: 'router regions - page 2',
				attributes: {
					page: 'attachTo1',
					next: pageAttachTo2,
					regionWithAttachTo: true,
				},
			}
		);
		await utils.addPostWithBlock( 'test/router-regions', {
			alias: 'router regions - page 1 - attachTo',
			attributes: { page: 1, next: pageAttachTo1 },
		} );
	} );

	test.beforeEach( async ( { interactivityUtils: utils, page } ) => {
		await page.goto( utils.getLink( 'router regions - page 1' ) );
	} );

	test.afterAll( async ( { interactivityUtils: utils } ) => {
		await utils.deactivatePlugins();
		await utils.deleteAllPosts();
	} );

	test( 'should be the only part hydrated', async ( { page } ) => {
		const region1Text = page.getByTestId( 'region-1-text' );
		const region2Text = page.getByTestId( 'region-2-text' );
		const noRegionText1 = page.getByTestId( 'no-region-text-1' );

		await expect( region1Text ).toHaveText( 'hydrated' );
		await expect( region2Text ).toHaveText( 'hydrated' );
		await expect( noRegionText1 ).toHaveText( 'not hydrated' );
	} );

	test( 'should update after navigation', async ( { page } ) => {
		const region1Ssr = page.getByTestId( 'region-1-ssr' );
		const region2Ssr = page.getByTestId( 'region-2-ssr' );

		await expect( region1Ssr ).toHaveText( 'content from page 1' );
		await expect( region2Ssr ).toHaveText( 'content from page 1' );

		await page.getByTestId( 'next' ).click();

		await expect( region1Ssr ).toHaveText( 'content from page 2' );
		await expect( region2Ssr ).toHaveText( 'content from page 2' );

		await page.getByTestId( 'back' ).click();

		await expect( region1Ssr ).toHaveText( 'content from page 1' );
		await expect( region2Ssr ).toHaveText( 'content from page 1' );
	} );

	test( 'should preserve state across pages', async ( { page } ) => {
		const counter = page.getByTestId( 'state-counter' );
		await expect( counter ).toHaveText( '0' );

		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '3' );

		await page.getByTestId( 'next' ).click();
		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '6' );

		await page.getByTestId( 'back' ).click();
		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '9' );
	} );

	test( 'should preserve context across pages', async ( { page } ) => {
		const counter = page.getByTestId( 'context-counter' );
		await expect( counter ).toHaveText( '0' );

		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '3' );

		await page.getByTestId( 'next' ).click();
		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '6' );

		await page.getByTestId( 'back' ).click();
		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '9' );
	} );

	test( 'can be nested', async ( { page } ) => {
		const nestedRegionSsr = page.getByTestId( 'nested-region-ssr' );
		const innerContent = page.getByTestId( 'nested-item' );

		await expect( nestedRegionSsr ).toHaveText( 'content from page 1' );
		await expect( innerContent ).toHaveCount( 3 );

		await page.getByTestId( 'next' ).click();
		await expect( nestedRegionSsr ).toHaveText( 'content from page 2' );
		await expect( innerContent ).toHaveCount( 3 );
		await page.getByTestId( 'add-item' ).click();
		await expect( innerContent ).toHaveCount( 4 );

		await page.getByTestId( 'back' ).click();
		await expect( nestedRegionSsr ).toHaveText( 'content from page 1' );
		await expect( innerContent ).toHaveCount( 4 );
	} );

	test( 'Page title is updated 2', async ( { page } ) => {
		await expect( page ).toHaveTitle(
			'router regions – page 1 – gutenberg'
		);
		await page.getByTestId( 'next' ).click();
		await expect( page ).toHaveTitle(
			'router regions – page 2 – gutenberg'
		);
		await page.getByTestId( 'back' ).click();
		await expect( page ).toHaveTitle(
			'router regions – page 1 – gutenberg'
		);
	} );

	test( 'should not take into account regions that are not in the topmost `data-wp-interactive`.', async ( {
		page,
	} ) => {
		const invalidRegionText1 = page.getByTestId( 'invalid-region-text-1' );
		const invalidRegionText2 = page.getByTestId( 'invalid-region-text-2' );

		await expect( invalidRegionText1 ).toHaveText( 'content from page 1' );
		await expect( invalidRegionText2 ).toHaveText( 'content from page 1' );

		await page.getByTestId( 'next' ).click();
		// Waits until the navigation finishes so it doesn't read the text from
		// the previous page.
		await expect( page ).toHaveTitle(
			'router regions – page 2 – gutenberg'
		);
		await expect( invalidRegionText1 ).toHaveText( 'content from page 1' );
		await expect( invalidRegionText2 ).toHaveText( 'content from page 1' );

		await page.getByTestId( 'back' ).click();
		// Waits until the navigation finishes so it doesn't read the text from
		// the previous page.
		await expect( page ).toHaveTitle(
			'router regions – page 1 – gutenberg'
		);
		await expect( invalidRegionText1 ).toHaveText( 'content from page 1' );
		await expect( invalidRegionText2 ).toHaveText( 'content from page 1' );
	} );

	test( 'should support router regions with the `attachTo` property.', async ( {
		page,
		interactivityUtils: utils,
	} ) => {
		await page.goto(
			utils.getLink( 'router regions - page 1 - attachTo' )
		);

		const region3 = page.getByTestId( 'region-3' );
		const text = region3.getByTestId( 'text' );
		const counter = region3.getByTestId( 'counter' );

		await expect( region3 ).toBeHidden();
		await expect( text ).toBeHidden();
		await expect( counter ).toBeHidden();

		await page.getByTestId( 'next' ).click();

		// Page attachTo 1
		await expect( region3 ).toBeVisible();
		await expect( text ).toBeVisible();
		await expect( text ).toHaveText( 'region-3' );
		await expect( counter ).toBeVisible();
		await expect( counter ).toHaveText( '0' );

		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '3' );

		await page.getByTestId( 'next' ).click();

		// Page attachTo 2
		await expect( region3 ).toBeVisible();
		await expect( text ).toBeVisible();
		await expect( text ).toHaveText( 'region-3' );
		await expect( counter ).toBeVisible();
		await expect( counter ).toHaveText( '10' );

		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '13' );

		await page.goBack();

		// Page attachTo 1
		await expect( region3 ).toBeVisible();
		await expect( text ).toBeVisible();
		await expect( text ).toHaveText( 'region-3' );
		await expect( counter ).toBeVisible();
		await expect( counter ).toHaveText( '0' );

		await counter.click( { clickCount: 3, delay: 50 } );
		await expect( counter ).toHaveText( '3' );

		await page.goBack();

		await expect( region3 ).toBeHidden();
		await expect( text ).toBeHidden();
		await expect( counter ).toBeHidden();
	} );
} );
