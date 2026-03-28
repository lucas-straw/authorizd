<?php
defined( 'ABSPATH' ) || exit;

/**
 * HTTP client for the Authorizd central API.
 * All plugin-to-server communication goes through here.
 */
class Authorizd_API {

    private static function base_url(): string {
        $url = get_option( 'authorizd_api_url', 'https://api.authorizd.com' );
        return rtrim( $url, '/' );
    }

    private static function api_key(): string {
        return (string) get_option( 'authorizd_api_key', '' );
    }

    /**
     * Make an authenticated request to the Authorizd API.
     *
     * @param string $method  GET | POST | PUT
     * @param string $path    e.g. '/tokens'
     * @param array  $body    JSON body (for POST/PUT)
     * @return array|WP_Error Decoded JSON body or WP_Error on failure
     */
    private static function request( string $method, string $path, array $body = [] ) {
        $args = [
            'method'  => strtoupper( $method ),
            'timeout' => 10,
            'headers' => [
                'Content-Type' => 'application/json',
                'X-Api-Key'    => self::api_key(),
            ],
        ];

        if ( ! empty( $body ) ) {
            $args['body'] = wp_json_encode( $body );
        }

        $response = wp_remote_request( self::base_url() . $path, $args );

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $code = wp_remote_retrieve_response_code( $response );
        $data = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $code >= 400 ) {
            $message = isset( $data['error'] ) ? $data['error'] : 'Authorizd API error';
            return new WP_Error( 'authorizd_api_' . $code, $message );
        }

        return $data;
    }

    /**
     * Create a share token for an order/cart.
     *
     * @param string $order_ref   Unique cart/order identifier
     * @param float  $cart_value  Pre-discount cart total
     * @param string $platform    facebook | twitter | instagram
     * @return array|WP_Error { token, expires_at, discount_percent }
     */
    public static function create_token( string $order_ref, float $cart_value, string $platform = 'facebook' ) {
        return self::request( 'POST', '/tokens', [
            'order_ref'  => $order_ref,
            'cart_value' => $cart_value,
            'platform'   => $platform,
        ] );
    }

    /**
     * Redeem a share token after the social share is confirmed.
     *
     * @param string $token
     * @return array|WP_Error { discount_code, discount_percent, discount_amount, platform_fee, cart_value, platform }
     */
    public static function redeem_token( string $token ) {
        return self::request( 'POST', '/tokens/' . rawurlencode( $token ) . '/redeem' );
    }

    /**
     * Verify the stored API key is valid by fetching merchant config.
     * Used on the admin settings page.
     */
    public static function verify_api_key(): bool {
        // Use JWT-less health check via a lightweight endpoint
        $args = [
            'method'  => 'GET',
            'timeout' => 8,
            'headers' => [
                'X-Api-Key' => self::api_key(),
            ],
        ];
        $response = wp_remote_request( self::base_url() . '/health', $args );
        if ( is_wp_error( $response ) ) return false;
        return wp_remote_retrieve_response_code( $response ) === 200;
    }
}
