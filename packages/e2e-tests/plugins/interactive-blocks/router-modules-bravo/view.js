/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

store( 'test/router-modules-bravo', {
	state: {
		name: 'bravo',
	},
} );

const { actions } = store( 'test/router-modules' );
actions.pushName( 'bravo' );
