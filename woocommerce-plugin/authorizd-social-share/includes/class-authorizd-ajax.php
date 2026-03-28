<?php
defined( 'ABSPATH' ) || exit;

/**
 * WP AJAX handlers called by the checkout page JS.
 *
 * Both actions are available to logged-in and guest (nopriv) users
 * because guest checkout is common in WooCommerce.
 */
class Authorizd_Ajax {

    public static function init(): void {
        $actions = [ 'authorizd_create_token', 'authorizd_redeem_token' ];
        foreach ( $actions as $action ) {
            add_action( 'wp_ajax_' . $action,        [ __CLASS__, $action ] );
            add_action( 'wp_ajax_nopriv_' . $action, [ __CLASS__, $action ] );
        }
    }

    // -------------------------------------------------------------------------
    // POST /wp-admin/admin-ajax.php  action=authorizd_create_token
    //   Body: { nonce, cart_total, platform }
    // -------------------------------------------------------------------------
    public static function authorizd_create_token(): void {
        check_ajax_referer( 'authorizd_nonce', 'nonce' );

        $cart_total = isset( $_POST['cart_total'] ) ? floatval( $_POST['cart_total'] ) : 0;
        $platform   = isset( $_POST['platform'] )   ? sanitize_text_field( $_POST['platform'] ) : 'facebook';

        if ( $cart_total <= 0 ) {
            wp_send_json_error( [ 'message' => 'Invalid cart total.' ], 400 );
        }

        // Use WC session ID as the stable order reference (pre-order)
        $order_ref = WC()->session->get_customer_id() . '_' . time();

        $result = Authorizd_API::create_token( $order_ref, $cart_total, $platform );

        if ( is_wp_error( $result ) ) {
            wp_send_json_error( [ 'message' => $result->get_error_message() ], 502 );
        }

        // Store the pending token in the WC session so we can validate on redeem
        WC()->session->set( 'authorizd_pending_token', $result['token'] );
        WC()->session->set( 'authorizd_order_ref',     $order_ref );

        wp_send_json_success( $result );
    }

    // -------------------------------------------------------------------------
    // POST /wp-admin/admin-ajax.php  action=authorizd_redeem_token
    //   Body: { nonce, token }
    // -------------------------------------------------------------------------
    public static function authorizd_redeem_token(): void {
        check_ajax_referer( 'authorizd_nonce', 'nonce' );

        $token = isset( $_POST['token'] ) ? sanitize_text_field( $_POST['token'] ) : '';

        if ( empty( $token ) ) {
            wp_send_json_error( [ 'message' => 'Missing token.' ], 400 );
        }

        // Verify the token matches the one we issued in this session
        $session_token = WC()->session->get( 'authorizd_pending_token' );
        if ( $session_token !== $token ) {
            wp_send_json_error( [ 'message' => 'Token mismatch. Please try sharing again.' ], 403 );
        }

        $result = Authorizd_API::redeem_token( $token );

        if ( is_wp_error( $result ) ) {
            wp_send_json_error( [ 'message' => $result->get_error_message() ], 502 );
        }

        // Store the confirmed discount in the WC session — the cart fee hook picks this up
        WC()->session->set( 'authorizd_discount', [
            'code'            => $result['discount_code'],
            'percent'         => $result['discount_percent'],
            'amount'          => $result['discount_amount'],
            'platform'        => $result['platform'],
        ] );

        // Clear the pending token so it can't be replayed
        WC()->session->set( 'authorizd_pending_token', null );

        wp_send_json_success( $result );
    }
}
