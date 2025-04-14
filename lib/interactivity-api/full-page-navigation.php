<?php
/**
 * Enables full page client-side navigation for the Interactivity API.
 *
 * IMPORTANT: this code is not meant to be included in Gutenberg yet. Instead,
 * it will be part of an external plugin to test this feature separately.
 */

/**
 * Returns whether the client navigation mode is `experimentalFullPage`.
 */
function _gutenberg_is_interactivity_router_full_page_enabled() {
	$iapi_router_config     = wp_interactivity_config( 'core/router' );
	$client_navigation_mode = $iapi_router_config['clientNavigationMode'];
	return 'experimentalFullPage' === $client_navigation_mode;
}

/**
 * Enqueue the interactivity router script.
 */
function _gutenberg_enqueue_interactivity_router() {
	if ( _gutenberg_is_interactivity_router_full_page_enabled() ) {
		wp_enqueue_script_module( '@wordpress/interactivity-router/full-page' );
	}
}
add_action( 'wp_enqueue_scripts', '_gutenberg_enqueue_interactivity_router' );

/**
 * Sets the navigation mode to full page client-side navigation.
 */
function _gutenberg_interactivity_router_set_client_navigation_mode() {
	wp_interactivity_config(
		'core/router',
		array( 'clientNavigationMode' => 'experimentalFullPage' )
	);
}
add_action( 'init', '_gutenberg_interactivity_router_set_client_navigation_mode', 9 );

/**
 * Adds client-side navigation directives to BODY tag in the passed output
 * buffer.
 *
 * Note: This should probably be done per site, not by default when this option
 * is enabled.
 *
 * @param string $buffer Passed output buffer.
 *
 * @return string The same HTML with modified BODY attributes.
 */
function _gutenberg_add_client_side_navigation_directives( $buffer ) {
	$p = new WP_HTML_Tag_Processor( $buffer );
	if ( $p->next_tag( array( 'tag_name' => 'BODY' ) ) ) {
		$p->set_attribute( 'data-wp-interactive', true );
		$p->set_attribute( 'data-wp-router-region', 'body' );
		return $p->get_updated_html();
	} else {
		return $buffer;
	}
}

/**
 * Starts output buffering at the end of the 'wp_head' action, adding the
 * required directives for client-side navigation to the BODY tags when the
 * buffer is flushed.
 */
function _gutenberg_full_page_client_navigation_buffer_start() {
	if ( _gutenberg_is_interactivity_router_full_page_enabled() ) {
		ob_start( '_gutenberg_add_client_side_navigation_directives' );
	}
}
add_action( 'wp_head', '_gutenberg_full_page_client_navigation_buffer_start' );

/**
 * Flushes the output buffer at the end of the 'wp_footer' action.
 */
function _gutenberg_full_page_client_navigation_buffer_end() {
	if ( _gutenberg_is_interactivity_router_full_page_enabled() ) {
		ob_end_flush();
	}
}
add_action( 'wp_footer', '_gutenberg_full_page_client_navigation_buffer_end' );
