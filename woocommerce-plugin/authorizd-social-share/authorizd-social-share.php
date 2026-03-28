<?php
/**
 * Plugin Name: Authorizd Social Share Discount
 * Plugin URI:  https://authorizd.com
 * Description: Let customers share their cart on social media during checkout to unlock an instant % discount. Powered by Authorizd.
 * Version:     1.0.0
 * Author:      Authorizd
 * Author URI:  https://authorizd.com
 * License:     GPL-2.0-or-later
 * Text Domain: authorizd
 * Requires Plugins: woocommerce
 */

defined( 'ABSPATH' ) || exit;

define( 'AUTHORIZD_VERSION',    '1.0.0' );
define( 'AUTHORIZD_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'AUTHORIZD_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

// Bail early if WooCommerce is not active
function authorizd_check_woocommerce() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        add_action( 'admin_notices', function () {
            echo '<div class="error"><p><strong>Authorizd Social Share Discount</strong> requires WooCommerce to be installed and active.</p></div>';
        } );
        deactivate_plugins( plugin_basename( __FILE__ ) );
    }
}
add_action( 'admin_init', 'authorizd_check_woocommerce' );

// Load plugin classes
require_once AUTHORIZD_PLUGIN_DIR . 'includes/class-authorizd-api.php';
require_once AUTHORIZD_PLUGIN_DIR . 'includes/class-authorizd-admin.php';
require_once AUTHORIZD_PLUGIN_DIR . 'includes/class-authorizd-ajax.php';
require_once AUTHORIZD_PLUGIN_DIR . 'includes/class-authorizd-cart.php';

// Boot
add_action( 'plugins_loaded', function () {
    if ( ! class_exists( 'WooCommerce' ) ) return;

    Authorizd_Admin::init();
    Authorizd_Ajax::init();
    Authorizd_Cart::init();
} );
