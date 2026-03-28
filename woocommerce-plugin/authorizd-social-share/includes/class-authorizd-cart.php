<?php
defined( 'ABSPATH' ) || exit;

/**
 * Injects the share widget into the checkout page and applies
 * the confirmed discount as a WooCommerce cart fee (negative amount).
 */
class Authorizd_Cart {

    public static function init(): void {
        // Inject the share widget above the checkout form
        add_action( 'woocommerce_before_checkout_form', [ __CLASS__, 'render_widget' ], 5 );

        // Apply the Authorizd discount to the cart totals
        add_action( 'woocommerce_cart_calculate_fees',  [ __CLASS__, 'apply_discount_fee' ] );

        // Enqueue frontend assets on the checkout page
        add_action( 'wp_enqueue_scripts', [ __CLASS__, 'enqueue_assets' ] );
    }

    // -------------------------------------------------------------------------
    // Enqueue JS + CSS + pass config to JS
    // -------------------------------------------------------------------------
    public static function enqueue_assets(): void {
        if ( ! is_checkout() ) return;

        $fb_app_id = get_option( 'authorizd_fb_app_id', '' );
        $platforms = (array) get_option( 'authorizd_platforms', [ 'facebook' ] );

        wp_enqueue_style(
            'authorizd',
            AUTHORIZD_PLUGIN_URL . 'assets/authorizd.css',
            [],
            AUTHORIZD_VERSION
        );

        // Facebook JS SDK (only if Facebook is an enabled platform)
        if ( in_array( 'facebook', $platforms, true ) && ! empty( $fb_app_id ) ) {
            wp_enqueue_script(
                'facebook-sdk',
                'https://connect.facebook.net/en_US/sdk.js',
                [],
                null,
                true
            );
        }

        wp_enqueue_script(
            'authorizd',
            AUTHORIZD_PLUGIN_URL . 'assets/authorizd.js',
            [ 'jquery' ],
            AUTHORIZD_VERSION,
            true
        );

        // Pass config to JS via wp_localize_script
        wp_localize_script( 'authorizd', 'AuthorizedConfig', [
            'ajaxUrl'    => admin_url( 'admin-ajax.php' ),
            'nonce'      => wp_create_nonce( 'authorizd_nonce' ),
            'fbAppId'    => $fb_app_id,
            'platforms'  => $platforms,
            'cartTotal'  => (float) WC()->cart->get_cart_contents_total(),
            'discounted' => self::get_active_discount() !== null,
            'discount'   => self::get_active_discount(),
            'shareUrl'   => get_permalink( wc_get_page_id( 'shop' ) ),
        ] );
    }

    // -------------------------------------------------------------------------
    // Render the share widget HTML above the checkout form
    // -------------------------------------------------------------------------
    public static function render_widget(): void {
        $api_key   = get_option( 'authorizd_api_key', '' );
        $fb_app_id = get_option( 'authorizd_fb_app_id', '' );
        $platforms = (array) get_option( 'authorizd_platforms', [ 'facebook' ] );

        // Don't show if not configured
        if ( empty( $api_key ) ) return;

        $discount  = self::get_active_discount();
        $title     = get_option( 'authorizd_widget_title', 'Save on your order — share it!' );
        $body_text = get_option( 'authorizd_widget_body',  'Share your cart on social media and get an instant discount applied to this order.' );

        ?>
        <div id="authorizd-widget" class="authorizd-widget">

            <?php if ( $discount ) : ?>
                <!-- Discount already applied — show success state -->
                <div class="authorizd-success">
                    <span class="authorizd-check">&#10003;</span>
                    <div>
                        <strong><?php esc_html_e( 'Discount applied!', 'authorizd' ); ?></strong>
                        <span class="authorizd-success-detail">
                            <?php printf(
                                esc_html__( 'You saved %1$s%% (%2$s) for sharing on %3$s.', 'authorizd' ),
                                esc_html( $discount['percent'] ),
                                esc_html( wc_price( $discount['amount'] ) ),
                                esc_html( ucfirst( $discount['platform'] ) )
                            ); ?>
                        </span>
                    </div>
                </div>

            <?php else : ?>
                <!-- Share prompt -->
                <div class="authorizd-header">
                    <span class="authorizd-icon">&#127381;</span>
                    <div>
                        <h3 class="authorizd-title"><?php echo esc_html( $title ); ?></h3>
                        <p class="authorizd-body"><?php echo esc_html( $body_text ); ?></p>
                    </div>
                </div>

                <div class="authorizd-actions">
                    <?php if ( in_array( 'facebook', $platforms, true ) && ! empty( $fb_app_id ) ) : ?>
                    <button id="authorizd-btn-facebook" class="authorizd-btn authorizd-btn-facebook" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951"/>
                        </svg>
                        <?php esc_html_e( 'Share on Facebook', 'authorizd' ); ?>
                    </button>
                    <?php endif; ?>

                    <?php if ( in_array( 'twitter', $platforms, true ) ) : ?>
                    <button id="authorizd-btn-twitter" class="authorizd-btn authorizd-btn-twitter" type="button">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                            <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z"/>
                        </svg>
                        <?php esc_html_e( 'Share on X', 'authorizd' ); ?>
                    </button>
                    <?php endif; ?>
                </div>

                <div id="authorizd-nudge" class="authorizd-nudge" style="display:none;">
                    <?php esc_html_e( "Didn't finish sharing? Try again to unlock your discount.", 'authorizd' ); ?>
                    <button id="authorizd-retry" class="authorizd-retry" type="button"><?php esc_html_e( 'Try again', 'authorizd' ); ?></button>
                </div>

                <p class="authorizd-powered">
                    <?php esc_html_e( 'Powered by', 'authorizd' ); ?>
                    <a href="https://authorizd.com" target="_blank" rel="noopener">Authorizd</a>
                </p>
            <?php endif; ?>

        </div>
        <?php
    }

    // -------------------------------------------------------------------------
    // Apply the confirmed discount as a negative cart fee
    // -------------------------------------------------------------------------
    public static function apply_discount_fee( WC_Cart $cart ): void {
        $discount = self::get_active_discount();
        if ( ! $discount ) return;

        $cart->add_fee(
            sprintf(
                /* translators: %1$s platform name, %2$s discount percent */
                __( 'Social Share Discount (%1$s) — %2$s%% off', 'authorizd' ),
                ucfirst( $discount['platform'] ),
                $discount['percent']
            ),
            -1 * abs( $discount['amount'] ),
            false // not taxable
        );
    }

    // -------------------------------------------------------------------------
    // Helper: get the active discount from the WC session, or null
    // -------------------------------------------------------------------------
    public static function get_active_discount(): ?array {
        if ( ! WC()->session ) return null;
        $discount = WC()->session->get( 'authorizd_discount' );
        return is_array( $discount ) ? $discount : null;
    }
}
