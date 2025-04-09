<?php
/**
 * Registers full page client-side navigation option using the Interactivity API and adds the necessary directives.
 */

/**
 * Enqueue the interactivity router script.
 */
function _gutenberg_enqueue_interactivity_router() {
	// Set the navigation mode to full page client-side navigation.
	wp_interactivity_config( 'core/router', array( 'clientNavigationMode' => 'fullPage' ) );
	wp_enqueue_script_module( '@wordpress/interactivity-router/full-page' );
}

add_action( 'wp_enqueue_scripts', '_gutenberg_enqueue_interactivity_router' );

/**
 * Set enhancedPagination attribute for query loop when the experiment is enabled.
 *
 * @param array $parsed_block The parsed block.
 *
 * @return array The same parsed block with the modified attribute.
 */
function _gutenberg_add_enhanced_pagination_to_query_block( $parsed_block ) {
	if ( 'core/query' !== $parsed_block['blockName'] ) {
		return $parsed_block;
	}

	$parsed_block['attrs']['enhancedPagination'] = true;
	return $parsed_block;
}

add_filter( 'render_block_data', '_gutenberg_add_enhanced_pagination_to_query_block' );

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
	ob_start( '_gutenberg_add_client_side_navigation_directives' );
}
add_action( 'wp_head', '_gutenberg_full_page_client_navigation_buffer_start' );

/**
 * Flushes the output buffer at the end of the 'wp_footer' action.
 */
function _gutenberg_full_page_client_navigation_buffer_end() {
	ob_end_flush();
}
add_action( 'wp_footer', '_gutenberg_full_page_client_navigation_buffer_end' );
