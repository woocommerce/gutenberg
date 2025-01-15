/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

/**
 * External dependencies
 */
// eslint-disable-next-line import/no-unresolved
import name from 'test/router-modules-alpha';

store( 'test/router-modules-alpha', {
	state: {
		name,
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( name );
