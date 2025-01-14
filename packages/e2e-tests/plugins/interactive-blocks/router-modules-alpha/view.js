/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

store( 'test/router-modules-alpha', {
	state: {
		name: 'alpha',
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( 'alpha' );
