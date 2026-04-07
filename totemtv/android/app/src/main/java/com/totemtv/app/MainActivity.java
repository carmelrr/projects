package com.totemtv.app;

import android.os.Bundle;
import android.view.WindowManager;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep screen on for slideshow/digital signage use
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Enable hardware-accelerated video decoding in the WebView
        WebView webView = getBridge().getWebView();
        webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
    }
}
