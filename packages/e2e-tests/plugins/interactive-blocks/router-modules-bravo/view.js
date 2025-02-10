/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

/**
 * External dependencies
 */
// eslint-disable-next-line import/no-unresolved
import name from 'test/router-modules-bravo';

store( 'test/router-modules-bravo', {
	state: {
		name,
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( name );
