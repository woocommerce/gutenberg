/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

store( 'test/router-modules-charlie', {
	state: {
		name: 'charlie',
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( 'charlie' );
