<?php
/**
 * Interactivity API functions specific for the Gutenberg editor plugin.
 *
 * @package gutenberg
 */

/**
 * Adds script data to the interactivity-router script module.
 *
 * This filter is registered conditionally anticipating a WordPress Core change to add the script module data.
 * The filter runs on 'after_setup_theme' (when Core registers Interactivity and Script Modules hooks)
 * to ensure that the conditional registration happens after Core and correctly determine whether
 * the filter should be added.
 *
 * @see https://github.com/WordPress/wordpress-develop/pull/7304
 */
function gutenberg_register_interactivity_script_module_data_hooks() {
	if ( ! has_filter( 'script_module_data_@wordpress/interactivity-router', array( wp_interactivity(), 'filter_script_module_interactivity_router_data' ) ) ) {
		add_filter(
			'script_module_data_@wordpress/interactivity-router',
			function ( $data ) {
				if ( ! isset( $data['i18n'] ) ) {
					$data['i18n'] = array();
				}
				$data['i18n']['loading'] = __( 'Loading page, please wait.', 'default' );
				$data['i18n']['loaded']  = __( 'Page Loaded.', 'default' );
				return $data;
			}
		);
	}
}
add_action( 'after_setup_theme', 'gutenberg_register_interactivity_script_module_data_hooks', 20 );

function gutenberg_iapi_add_lightbox_region_directives( $buffer ) {
	$p = new WP_HTML_Tag_Processor( $buffer );
	if ( $p->next_tag( array( 'class_name' => 'wp-lightbox-overlay' ) ) ) {
		$p->set_attribute( 'data-wp-router-region', '{ "id": "core/body", "attachTo": "body" }' );
		$p->set_attribute( 'data-wp-key', 'wp-lightbox-overlay' );
		$p->set_attribute( 'data-wp-class--show-closing-animation', 'state.overlayOpened' );
		return $p->get_updated_html();
	} else {
		return $buffer;
	}
}

function gutenberg_core_image_lightbox_start_footer_buffer() {
	ob_start( 'gutenberg_iapi_add_lightbox_region_directives' );
}
add_action( 'wp_footer', 'gutenberg_core_image_lightbox_start_footer_buffer', 9 );

function gutenberg_core_image_lightbox_flush_footer_buffer() {
	ob_end_flush();
}
add_action( 'wp_footer', 'gutenberg_core_image_lightbox_flush_footer_buffer', 11 );

function gutenberg_iapi_router_region_based() {
	wp_interactivity_config( 'core/router', array( 'clientNavigationMode' => 'experimentalFullPage' ) );
}
add_action( 'init', 'gutenberg_iapi_router_region_based' );
