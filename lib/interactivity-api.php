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

/*
 * Unlocks the experimental full-page client-side navigation feature of the
 * interactivity-router module.
 *
 * IMPORTANT: this code is not meant to be included in Gutenberg. Instead, it
 * will be part of an external plugin to test this feature separately.
 *
 * Check out the file:
 * `lib/interactivity-api/class-wp-interactivity-api-full-page-navigation.php`.
 */
add_filter(
	'wp_interactivity_experimental_full_page_client_navigation',
	function () {
		return 'I acknowledge that full-page client-side navigation is still experimental and will probably change, breaking my plugin or website on its next version.';
	}
);
