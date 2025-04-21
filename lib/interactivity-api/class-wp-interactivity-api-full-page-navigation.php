<?php
/**
 * Enables full page client-side navigation for the Interactivity API.
 *
 * IMPORTANT: this code is not meant to be included in Gutenberg yet. Instead,
 * it will be part of an external plugin to test this feature separately.
 */

if ( ! class_exists( 'WP_Interactivity_API_Full_Page_Navigation' ) ) {

	/**
	 * Class to enable full page client-side navigation for the Interactivity API.
	 */
	class WP_Interactivity_API_Full_Page_Navigation {

		private static $instance = null;

		public function __construct() {
			add_action( 'init', array( $this, 'set_default_mode' ), 9 );
			add_action( 'wp_head', array( $this, 'buffer_start' ) );
			add_action( 'wp_footer', array( $this, 'buffer_end' ) );
			add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_script_modules' ) );
		}

		/**
		 * Returns whether the client navigation mode is `experimentalFullPage`.
		 */
		public function is_enabled() {
			$iapi_router_config     = wp_interactivity_config( 'core/router' );
			$client_navigation_mode = $iapi_router_config['clientNavigationMode'];
			return 'experimentalFullPage' === $client_navigation_mode;
		}

		/**
		 * Sets the client navigation mode by default.
		 */
		public function set_default_mode() {
			wp_interactivity_config(
				'core/router',
				array( 'clientNavigationMode' => 'experimentalFullPage' )
			);
		}

		/**
		 * Enqueues the required script modules.
		 */
		public function enqueue_script_modules() {
			if ( $this->is_enabled() ) {
				wp_enqueue_script_module(
					'@wordpress/interactivity-router/full-page'
				);
			}
		}

		/**
		 * Starts output buffering at the end of the 'wp_head' action, adding the
		 * required directives for client-side navigation to the BODY tags when the
		 * buffer is flushed.
		 */
		public function buffer_start() {
			if ( $this->is_enabled() ) {
				ob_start( array( $this, 'add_directives_to_body' ) );
			}
		}

		/**
		 * Flushes the output buffer at the end of the 'wp_footer' action.
		 */
		public function buffer_end() {
			if ( $this->is_enabled() ) {
				ob_end_flush();
			}
		}

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
		public function add_directives_to_body( $buffer ) {
			$p = new WP_HTML_Tag_Processor( $buffer );
			if ( $p->next_tag( array( 'tag_name' => 'BODY' ) ) ) {
				$p->set_attribute( 'data-wp-interactive', true );
				$p->set_attribute( 'data-wp-router-region', 'body' );
				return $p->get_updated_html();
			} else {
				return $buffer;
			}
		}

		public static function instance() {
			if ( null === self::$instance ) {
				self::$instance = new WP_Interactivity_API_Full_Page_Navigation();
			}
			return self::$instance;
		}
	}
}
