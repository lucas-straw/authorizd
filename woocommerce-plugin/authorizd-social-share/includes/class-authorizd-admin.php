<?php
defined( 'ABSPATH' ) || exit;

/**
 * Admin settings page under WooCommerce → Authorizd.
 */
class Authorizd_Admin {

    public static function init(): void {
        add_action( 'admin_menu',            [ __CLASS__, 'add_menu' ] );
        add_action( 'admin_init',            [ __CLASS__, 'register_settings' ] );
        add_action( 'admin_enqueue_scripts', [ __CLASS__, 'enqueue_admin_assets' ] );
    }

    public static function add_menu(): void {
        add_submenu_page(
            'woocommerce',
            __( 'Authorizd', 'authorizd' ),
            __( 'Authorizd', 'authorizd' ),
            'manage_woocommerce',
            'authorizd-settings',
            [ __CLASS__, 'render_settings_page' ]
        );
    }

    public static function register_settings(): void {
        register_setting( 'authorizd_settings', 'authorizd_api_key',      [ 'sanitize_callback' => 'sanitize_text_field' ] );
        register_setting( 'authorizd_settings', 'authorizd_fb_app_id',    [ 'sanitize_callback' => 'sanitize_text_field' ] );
        register_setting( 'authorizd_settings', 'authorizd_api_url',      [ 'sanitize_callback' => 'esc_url_raw',         'default' => 'https://api.authorizd.com' ] );
        register_setting( 'authorizd_settings', 'authorizd_platforms',    [ 'sanitize_callback' => [ __CLASS__, 'sanitize_platforms' ], 'default' => [ 'facebook' ] ] );
        register_setting( 'authorizd_settings', 'authorizd_widget_title', [ 'sanitize_callback' => 'sanitize_text_field', 'default' => 'Save on your order — share it!' ] );
        register_setting( 'authorizd_settings', 'authorizd_widget_body',  [ 'sanitize_callback' => 'sanitize_textarea_field', 'default' => 'Share your cart on social media and get an instant discount applied to this order.' ] );
    }

    public static function sanitize_platforms( $value ): array {
        $allowed = [ 'facebook', 'twitter', 'instagram' ];
        if ( ! is_array( $value ) ) return [ 'facebook' ];
        return array_values( array_intersect( (array) $value, $allowed ) ) ?: [ 'facebook' ];
    }

    public static function enqueue_admin_assets( string $hook ): void {
        if ( $hook !== 'woocommerce_page_authorizd-settings' ) return;
        // Minimal inline styles for the settings page
        wp_add_inline_style( 'wp-admin', '
            .authorizd-logo { display:flex; align-items:center; gap:10px; margin-bottom:24px; }
            .authorizd-logo h1 { font-size:1.6rem; margin:0; }
            .authorizd-badge { background:#1877F2; color:#fff; font-size:11px; font-weight:600;
                               padding:2px 8px; border-radius:99px; vertical-align:middle; }
            .authorizd-api-status { display:inline-flex; align-items:center; gap:6px;
                                     font-size:13px; margin-left:8px; }
            .authorizd-api-status.ok  { color:#3a9a3a; }
            .authorizd-api-status.err { color:#c0392b; }
        ' );
    }

    public static function render_settings_page(): void {
        if ( ! current_user_can( 'manage_woocommerce' ) ) return;

        $api_key      = get_option( 'authorizd_api_key', '' );
        $fb_app_id    = get_option( 'authorizd_fb_app_id', '' );
        $api_url      = get_option( 'authorizd_api_url', 'https://api.authorizd.com' );
        $platforms    = (array) get_option( 'authorizd_platforms', [ 'facebook' ] );
        $widget_title = get_option( 'authorizd_widget_title', 'Save on your order — share it!' );
        $widget_body  = get_option( 'authorizd_widget_body',  'Share your cart on social media and get an instant discount applied to this order.' );
        ?>
        <div class="wrap">
            <div class="authorizd-logo">
                <h1>Authorizd <span class="authorizd-badge">Social Share Discount</span></h1>
            </div>

            <p>Connect your store to Authorizd. Customers share their cart during checkout and receive an instant discount. You pay only for confirmed shares. <a href="https://authorizd.com/docs" target="_blank">Learn more →</a></p>

            <?php settings_errors( 'authorizd_settings' ); ?>

            <form method="post" action="options.php">
                <?php settings_fields( 'authorizd_settings' ); ?>

                <h2 class="title"><?php esc_html_e( 'API Connection', 'authorizd' ); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th><label for="authorizd_api_key"><?php esc_html_e( 'Authorizd API Key', 'authorizd' ); ?></label></th>
                        <td>
                            <input type="password" id="authorizd_api_key" name="authorizd_api_key"
                                   value="<?php echo esc_attr( $api_key ); ?>" class="regular-text" autocomplete="off">
                            <p class="description"><?php esc_html_e( 'Found in your Authorizd merchant dashboard under API Keys.', 'authorizd' ); ?></p>
                        </td>
                    </tr>
                    <tr>
                        <th><label for="authorizd_api_url"><?php esc_html_e( 'API URL', 'authorizd' ); ?></label></th>
                        <td>
                            <input type="url" id="authorizd_api_url" name="authorizd_api_url"
                                   value="<?php echo esc_attr( $api_url ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'Leave as default unless you are running a local dev server.', 'authorizd' ); ?></p>
                        </td>
                    </tr>
                </table>

                <h2 class="title"><?php esc_html_e( 'Facebook Integration', 'authorizd' ); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th><label for="authorizd_fb_app_id"><?php esc_html_e( 'Facebook App ID', 'authorizd' ); ?></label></th>
                        <td>
                            <input type="text" id="authorizd_fb_app_id" name="authorizd_fb_app_id"
                                   value="<?php echo esc_attr( $fb_app_id ); ?>" class="regular-text">
                            <p class="description"><?php esc_html_e( 'Your Facebook App ID from developers.facebook.com. Required for the Facebook share dialog.', 'authorizd' ); ?></p>
                        </td>
                    </tr>
                </table>

                <h2 class="title"><?php esc_html_e( 'Enabled Platforms', 'authorizd' ); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th><?php esc_html_e( 'Platforms', 'authorizd' ); ?></th>
                        <td>
                            <?php
                            $platform_options = [
                                'facebook'  => 'Facebook',
                                'twitter'   => 'X (Twitter)',
                                'instagram' => 'Instagram (link only)',
                            ];
                            foreach ( $platform_options as $value => $label ) :
                                $checked = in_array( $value, $platforms, true ) ? 'checked' : '';
                            ?>
                            <label style="display:block;margin-bottom:6px;">
                                <input type="checkbox" name="authorizd_platforms[]"
                                       value="<?php echo esc_attr( $value ); ?>" <?php echo $checked; ?>>
                                <?php echo esc_html( $label ); ?>
                            </label>
                            <?php endforeach; ?>
                            <p class="description"><?php esc_html_e( 'Platforms shown to the customer. Discount applies for any confirmed share.', 'authorizd' ); ?></p>
                        </td>
                    </tr>
                </table>

                <h2 class="title"><?php esc_html_e( 'Widget Text', 'authorizd' ); ?></h2>
                <table class="form-table" role="presentation">
                    <tr>
                        <th><label for="authorizd_widget_title"><?php esc_html_e( 'Heading', 'authorizd' ); ?></label></th>
                        <td>
                            <input type="text" id="authorizd_widget_title" name="authorizd_widget_title"
                                   value="<?php echo esc_attr( $widget_title ); ?>" class="large-text">
                        </td>
                    </tr>
                    <tr>
                        <th><label for="authorizd_widget_body"><?php esc_html_e( 'Description', 'authorizd' ); ?></label></th>
                        <td>
                            <textarea id="authorizd_widget_body" name="authorizd_widget_body"
                                      class="large-text" rows="3"><?php echo esc_textarea( $widget_body ); ?></textarea>
                        </td>
                    </tr>
                </table>

                <?php submit_button( __( 'Save Settings', 'authorizd' ) ); ?>
            </form>
        </div>
        <?php
    }
}
