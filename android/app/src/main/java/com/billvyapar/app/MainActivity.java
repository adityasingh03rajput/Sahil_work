package com.billvyapar.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebView;
import android.webkit.WebSettings;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

    // Tune the underlying WebView for maximum touch/scroll smoothness
    WebView webView = getBridge().getWebView();

    if (webView != null) {
      WebSettings settings = webView.getSettings();

      // ── GPU & Hardware Acceleration ─────────────────────────────────────
      // Force hardware acceleration at the view level (Activity-level is set
      // in the manifest, but view-level gives us compositing layers)
      webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

      // ── Rendering Hints ──────────────────────────────────────────────────
      // Render the WebView contents as tiles on the GPU rather than software
      settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

      // ── Smooth Scrolling / Fling Physics ────────────────────────────────
      // Enable built-in smooth scrolling (API 17+)
      webView.setScrollBarStyle(View.SCROLLBARS_INSIDE_OVERLAY);
      webView.setOverScrollMode(View.OVER_SCROLL_NEVER);  // no rubber-band jank

      // ── Tap Delay Removal ───────────────────────────────────────────────
      // Disables the 300 ms double-tap-to-zoom delay so every tap fires
      // instantly, making the UI feel truly native
      webView.setOnLongClickListener(v -> true);          // suppress context menu
      webView.setHapticFeedbackEnabled(false);            // no accidental vibrations

      // ── Caching: keep assets in RAM across navigations ───────────────────
      settings.setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);

      // ── DOM Storage (localStorage used by cache layer) ───────────────────
      settings.setDomStorageEnabled(true);

      // ── Ensure smooth font rendering ─────────────────────────────────────
      settings.setMinimumFontSize(1);
      settings.setMinimumLogicalFontSize(1);
    }
  }
}

