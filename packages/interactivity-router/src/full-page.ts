/**
 * WordPress dependencies
 */
import { getConfig } from '@wordpress/interactivity';

// Check if the navigation mode is full page or region based.
const clientNavigationMode: 'regionBased' | 'experimentalFullPage' =
	getConfig( 'core/router' ).clientNavigationMode ?? 'regionBased';

// Check if the link is valid for client-side navigation.
const isValidLink = ( ref: HTMLAnchorElement ) =>
	ref &&
	ref instanceof window.HTMLAnchorElement &&
	ref.href &&
	( ! ref.target || ref.target === '_self' ) &&
	ref.origin === window.location.origin &&
	! ref.pathname.startsWith( '/wp-admin' ) &&
	! ref.pathname.startsWith( '/wp-login.php' ) &&
	! ref.getAttribute( 'href' ).startsWith( '#' ) &&
	! new URL( ref.href ).searchParams.has( '_wpnonce' );

// Check if the event is valid for client-side navigation.
const isValidEvent = ( event: MouseEvent ) =>
	event &&
	event.button === 0 && // Left clicks only.
	! event.metaKey && // Open in new tab (Mac).
	! event.ctrlKey && // Open in new tab (Windows).
	! event.altKey && // Download.
	! event.shiftKey &&
	! event.defaultPrevented;

/**
 * Builds a callback function to test if a given attribute name corresponds to a
 * `data-wp-on` or a `data-wp-on-async` directive for the given event type.
 *
 * @param event Event type.
 * @return Callback function.
 */
const isWpOn = ( event: string ) => ( attrName: string ) =>
	RegExp( `^data-wp-on(?:-async)?--${ event }(?:--([a-z0-9_-]+))?$` ).test(
		attrName
	);

/**
 * Determines whether the passed anchor element contains a `data-wp-on` or a
 * `data-wp-on-async` directive for the given event type, returning `true` when
 * it doesn't.
 *
 * @param event Event type to check.
 * @param ref   An HTMLAnchorElement instance.
 * @return Whether the pased element contains such a directive.
 */
const isLinkWithoutWpOn = ( event: string, ref: HTMLAnchorElement ) =>
	! ref.getAttributeNames().some( isWpOn( event ) );

// Add click and prefetch to all links.
if ( clientNavigationMode === 'experimentalFullPage' ) {
	// Navigate on click.
	document.addEventListener(
		'click',
		async ( event ) => {
			const ref = ( event.target as Element ).closest( 'a' );
			if (
				isValidLink( ref ) &&
				isValidEvent( event ) &&
				isLinkWithoutWpOn( 'click', ref )
			) {
				event.preventDefault();
				const { actions } = await import(
					'@wordpress/interactivity-router'
				);
				actions.navigate( ref.href );
			}
		},
		true
	);
	// Prefetch on hover.
	document.addEventListener(
		'mouseenter',
		async ( event ) => {
			if ( ( event.target as Element )?.nodeName === 'A' ) {
				const ref = ( event.target as Element ).closest( 'a' );
				if (
					isValidLink( ref ) &&
					isValidEvent( event ) &&
					isLinkWithoutWpOn( 'mouseenter', ref )
				) {
					const { actions } = await import(
						'@wordpress/interactivity-router'
					);
					actions.prefetch( ref.href );
				}
			}
		},
		true
	);
}
