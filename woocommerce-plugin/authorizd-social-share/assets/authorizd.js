/* Authorizd Social Share Discount — WooCommerce frontend */
(function ($) {
  'use strict';

  const cfg = window.AuthorizedConfig || {};
  let pendingToken = null;
  let pendingPlatform = null;

  // ---------------------------------------------------------------------------
  // Facebook SDK init
  // ---------------------------------------------------------------------------
  window.fbAsyncInit = function () {
    FB.init({
      appId:   cfg.fbAppId,
      version: 'v19.0',
      xfbml:   false,
      cookie:  false,
    });
  };

  function waitForFB(cb) {
    if (typeof FB !== 'undefined') { cb(); return; }
    let attempts = 0;
    const t = setInterval(function () {
      if (typeof FB !== 'undefined') { clearInterval(t); cb(); }
      if (++attempts > 40) clearInterval(t); // give up after ~4s
    }, 100);
  }

  // ---------------------------------------------------------------------------
  // Step 1: Request a share token from the server
  // ---------------------------------------------------------------------------
  function createToken(platform, onSuccess, onError) {
    $.post(cfg.ajaxUrl, {
      action:     'authorizd_create_token',
      nonce:      cfg.nonce,
      cart_total: cfg.cartTotal,
      platform:   platform,
    })
      .done(function (res) {
        if (res.success) {
          onSuccess(res.data);
        } else {
          onError(res.data && res.data.message ? res.data.message : 'Unable to create share token.');
        }
      })
      .fail(function () {
        onError('Network error. Please try again.');
      });
  }

  // ---------------------------------------------------------------------------
  // Step 2: Redeem the token after the share is confirmed
  // ---------------------------------------------------------------------------
  function redeemToken(token, onSuccess, onError) {
    $.post(cfg.ajaxUrl, {
      action: 'authorizd_redeem_token',
      nonce:  cfg.nonce,
      token:  token,
    })
      .done(function (res) {
        if (res.success) {
          onSuccess(res.data);
        } else {
          onError(res.data && res.data.message ? res.data.message : 'Unable to apply discount.');
        }
      })
      .fail(function () {
        onError('Network error. Please try again.');
      });
  }

  // ---------------------------------------------------------------------------
  // UI helpers
  // ---------------------------------------------------------------------------
  function setButtonLoading($btn, loading) {
    if (loading) {
      $btn.prop('disabled', true).data('original-text', $btn.html()).html(
        '<span class="authorizd-spinner"></span> Loading…'
      );
    } else {
      $btn.prop('disabled', false).html($btn.data('original-text') || $btn.html());
    }
  }

  function showNudge() {
    $('#authorizd-nudge').slideDown(200);
  }

  function hideNudge() {
    $('#authorizd-nudge').slideUp(200);
  }

  function showSuccess(data) {
    const pct    = data.discount_percent;
    const amount = parseFloat(data.discount_amount).toFixed(2);
    const plat   = data.platform.charAt(0).toUpperCase() + data.platform.slice(1);

    $('#authorizd-widget').html(
      '<div class="authorizd-success">' +
        '<span class="authorizd-check">&#10003;</span>' +
        '<div>' +
          '<strong>Discount applied!</strong> ' +
          '<span class="authorizd-success-detail">' +
            'You saved ' + pct + '% ($' + amount + ') for sharing on ' + plat + '.' +
          '</span>' +
        '</div>' +
      '</div>'
    );

    // Trigger WooCommerce to recalculate + re-render the order total
    $(document.body).trigger('update_checkout');
  }

  // ---------------------------------------------------------------------------
  // Facebook share flow
  // ---------------------------------------------------------------------------
  function openFacebookShare($btn) {
    setButtonLoading($btn, true);
    hideNudge();

    createToken('facebook', function (tokenData) {
      pendingToken    = tokenData.token;
      pendingPlatform = 'facebook';

      waitForFB(function () {
        setButtonLoading($btn, false);

        FB.ui({
          method:       'share',
          href:         cfg.shareUrl,
          quote:        'I just found something awesome — check it out!',
        }, function (response) {
          if (response && !response.error_message) {
            // Share confirmed — redeem the token
            redeemToken(pendingToken, showSuccess, function (err) {
              alert('Could not apply discount: ' + err);
            });
          } else {
            // User cancelled or closed the dialog
            showNudge();
          }
        });
      });
    }, function (err) {
      setButtonLoading($btn, false);
      alert('Error: ' + err);
    });
  }

  // ---------------------------------------------------------------------------
  // Twitter/X share flow (web intent — no verified callback, best-effort)
  // ---------------------------------------------------------------------------
  function openTwitterShare($btn) {
    setButtonLoading($btn, true);
    hideNudge();

    createToken('twitter', function (tokenData) {
      pendingToken    = tokenData.token;
      pendingPlatform = 'twitter';
      setButtonLoading($btn, false);

      const text   = encodeURIComponent('Check out what I found! ' + cfg.shareUrl);
      const tweetUrl = 'https://twitter.com/intent/tweet?text=' + text;

      const popup = window.open(tweetUrl, 'authorizd-twitter', 'width=600,height=400,scrollbars=yes');

      // Poll until the popup closes, then treat it as a confirmed share.
      // Twitter removed verified callbacks in 2023; this is the best available approach.
      const poll = setInterval(function () {
        if (!popup || popup.closed) {
          clearInterval(poll);
          redeemToken(pendingToken, showSuccess, function (err) {
            showNudge();
          });
        }
      }, 500);
    }, function (err) {
      setButtonLoading($btn, false);
      alert('Error: ' + err);
    });
  }

  // ---------------------------------------------------------------------------
  // Bind events on document ready
  // ---------------------------------------------------------------------------
  $(function () {
    // If discount is already applied (page refresh), nothing to do
    if (cfg.discounted) return;

    $(document).on('click', '#authorizd-btn-facebook', function () {
      openFacebookShare($(this));
    });

    $(document).on('click', '#authorizd-btn-twitter', function () {
      openTwitterShare($(this));
    });

    // Retry button in nudge bar — re-open the last attempted platform
    $(document).on('click', '#authorizd-retry', function () {
      if (pendingPlatform === 'twitter') {
        $('#authorizd-btn-twitter').trigger('click');
      } else {
        $('#authorizd-btn-facebook').trigger('click');
      }
    });
  });

}(jQuery));
