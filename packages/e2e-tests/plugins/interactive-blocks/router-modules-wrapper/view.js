/**
 * WordPress dependencies
 */
import { store } from '@wordpress/interactivity';

const { state } = store( 'test/router-modules', {
	state: {
		clientSideNavigation: false,
		names: [],
	},
	actions: {
		*navigate( e ) {
			e.preventDefault();
			const { actions } = yield import(
				'@wordpress/interactivity-router'
			);
			yield actions.navigate( e.target.href );
			state.clientSideNavigation = true;
		},
		pushName( name ) {
			state.names.push( name );
		},
	},
} );
