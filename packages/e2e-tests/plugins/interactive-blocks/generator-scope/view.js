/**
 * WordPress dependencies
 */
import { store, getContext } from '@wordpress/interactivity';

store( 'test/generator-scope', {
	callbacks: {
		*resolve() {
			try {
				getContext().result = yield Promise.resolve( 'ok' );
			} catch ( err ) {
				getContext().result = err.toString();
			}
		},
		*reject() {
			try {
				getContext().result = yield Promise.reject( new Error( '😘' ) );
			} catch ( err ) {
				getContext().result = err.toString();
			}
		},
		*capture() {
			let value = yield Promise.resolve( 1 );
			try {
				value = yield Promise.reject( 2 );
			} catch ( e ) {
				value = yield Promise.resolve( 3 );
			}
			getContext().result = value;
		},
	},
} );
