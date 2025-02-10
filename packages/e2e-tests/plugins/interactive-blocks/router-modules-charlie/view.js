/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

/**
 * External dependencies
 */
// eslint-disable-next-line import/no-unresolved
import name from 'test/router-modules-charlie';

store( 'test/router-modules-charlie', {
	state: {
		name,
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( name );
