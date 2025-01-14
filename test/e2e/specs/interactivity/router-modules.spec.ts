/**
 * Internal dependencies
 */
import { test, expect } from './fixtures';

test.describe( 'Router modules', () => {
	test.beforeAll( async ( { interactivityUtils: utils } ) => {
		await utils.activatePlugins();
		const alpha = await utils.addPostWithBlock(
			'test/router-modules-wrapper',
			{
				alias: 'alpha',
				innerBlocks: [ [ 'test/router-modules-alpha' ] ],
			}
		);
		const bravo = await utils.addPostWithBlock(
			'test/router-modules-wrapper',
			{
				alias: 'bravo',
				innerBlocks: [ [ 'test/router-modules-bravo' ] ],
			}
		);
		const charlie = await utils.addPostWithBlock(
			'test/router-modules-wrapper',
			{
				alias: 'charlie',
				innerBlocks: [ [ 'test/router-modules-charlie' ] ],
			}
		);

		const all = await utils.addPostWithBlock(
			'test/router-modules-wrapper',
			{
				alias: 'all',
				innerBlocks: [
					[ 'test/router-modules-alpha' ],
					[ 'test/router-modules-bravo' ],
					[ 'test/router-modules-charlie' ],
				],
			}
		);

		await utils.addPostWithBlock( 'test/router-modules-wrapper', {
			alias: 'none',
			attributes: { links: { alpha, bravo, charlie, all } },
		} );
	} );

	test.beforeEach( async ( { page, interactivityUtils: utils } ) => {
		await page.goto( utils.getLink( 'none' ) );
	} );

	test.afterAll( async ( { interactivityUtils: utils } ) => {
		await utils.deactivatePlugins();
		await utils.deleteAllPosts();
	} );

	test( 'should handle modules from new blocks', async ( { page } ) => {
		const requestedModules = [];

		await page.route( '**/*.js', async ( route ) => {
			requestedModules.push( route.request().url() );
			await route.continue();
		} );

		const csn = page.getByTestId( 'client-side navigation' );
		const alpha = page.getByTestId( 'alpha-block' );
		const bravo = page.getByTestId( 'bravo-block' );
		const charlie = page.getByTestId( 'charlie-block' );

		await page.getByTestId( 'link alpha' ).click();

		await expect( csn ).toBeVisible();
		await expect( alpha ).toBeVisible();
		await expect( bravo ).toBeHidden();
		await expect( charlie ).toBeHidden();

		await page.getByTestId( 'link bravo' ).click();

		await expect( csn ).toBeVisible();
		await expect( alpha ).toBeHidden();
		await expect( bravo ).toBeVisible();
		await expect( charlie ).toBeHidden();

		await page.getByTestId( 'link charlie' ).click();

		await expect( csn ).toBeVisible();
		await expect( alpha ).toBeHidden();
		await expect( bravo ).toBeHidden();
		await expect( charlie ).toBeVisible();

		await page.getByTestId( 'link all' ).click();

		await expect( csn ).toBeVisible();
		await expect( alpha ).toBeVisible();
		await expect( bravo ).toBeVisible();
		await expect( charlie ).toBeVisible();
	} );
} );
