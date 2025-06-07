package com.example.cuentacuentoswebapp

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import android.util.Log
import android.webkit.JavascriptInterface
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import android.webkit.ConsoleMessage
import androidx.appcompat.app.AppCompatActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.cuentacuentoswebapp.ui.theme.CuentacuentosWebAppTheme
import android.app.Dialog
import android.view.ViewGroup
import android.widget.LinearLayout

class MainActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private var popupDialog: Dialog? = null
    private var oauthTimeoutHandler: android.os.Handler? = null
    private var oauthTimeoutRunnable: Runnable? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Clear Google OAuth data for fresh login
        clearGoogleOAuthData()
        
        // Handle intent if app was launched via OAuth callback
        handleIntent(intent)
        
        setContent {
            CuentacuentosWebAppTheme {
                AndroidView(
                    factory = { context ->
                        WebView(context).apply {
                            webView = this
                            setupWebView()
                        }
                    },
                    modifier = Modifier.fillMaxSize()
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent) // Important: update the activity's intent
        Log.d("MainActivity", "onNewIntent called with: ${intent.data}")
        handleIntent(intent)
    }

    override fun onStart() {
        super.onStart()
        Log.d("MainActivity", "onStart called")
        
        // Check if we have a pending OAuth callback
        val intent = intent
        if (intent?.data != null) {
            Log.d("MainActivity", "onStart with intent data: ${intent.data}")
            handleIntent(intent)
        }
    }

    override fun onResume() {
        super.onResume()
        Log.d("MainActivity", "onResume called")
        
        // Check if we returned from OAuth flow
        val intent = intent
        if (intent?.data != null) {
            Log.d("MainActivity", "Resuming with intent data: ${intent.data}")
            handleIntent(intent)
        }
        
        // Ensure WebView is properly restored
        if (::webView.isInitialized) {
            // Check if we need to refresh the page to reflect login state
            val checkLoginScript = """
                (function() {
                    // Check if we have OAuth success stored
                    const oauthSuccess = sessionStorage.getItem('oauthSuccess');
                    const oauthCallback = sessionStorage.getItem('oauthCallback');
                    
                    if (oauthSuccess === 'true' || oauthCallback) {
                        console.log('OAuth success detected on resume, refreshing page');
                        sessionStorage.removeItem('oauthSuccess');
                        
                        // Trigger a gentle refresh to update login state
                        setTimeout(() => {
                            if (window.location.pathname === '/') {
                                window.location.reload();
                            }
                        }, 500);
                    }
                })();
            """.trimIndent()
            
            webView.postDelayed({
                webView.evaluateJavascript(checkLoginScript, null)
            }, 300)
        }
    }

    private fun handleIntent(intent: Intent) {
        val data = intent.data
        val action = intent.action
        val categories = intent.categories?.joinToString(", ")
        
        Log.d("MainActivity", "Handling intent - Action: $action, Categories: $categories, Data: $data")
        
        if (data != null && (data.scheme == "audiogretel" || 
            (data.scheme == "https" && data.host == "audiogretel.com"))) {
            Log.d("MainActivity", "OAuth callback received: $data")
            Log.d("MainActivity", "Current task root: $isTaskRoot, Activity state: ${lifecycle.currentState}")
            
            // Immediately bring the app to foreground
            runOnUiThread {
                try {
                    // Close any open popup dialog first
                    popupDialog?.dismiss()
                    popupDialog = null
                    
                    // Force bring app to foreground
                    val moveToFrontIntent = Intent(this, MainActivity::class.java)
                    moveToFrontIntent.addFlags(
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or 
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                    )
                    startActivity(moveToFrontIntent)
                    
                    // Check if WebView is initialized and handle the callback
                    if (::webView.isInitialized) {
                        Log.d("MainActivity", "WebView initialized, processing OAuth callback")
                        
                        // Extract token from callback URL if present
                        val token = data.getQueryParameter("token")
                        Log.d("MainActivity", "Extracted token: ${if (token != null) "present" else "null"}")
                        
                        // Navigate to the main page
                        webView.loadUrl("https://audiogretel.com")
                        
                        // Create a more robust callback handler
                        val callbackScript = """
                            (function() {
                                console.log('OAuth callback handler executing...');
                                console.log('Current URL:', window.location.href);
                                
                                // Store the callback data
                                const callbackData = {
                                    url: '${data.toString()}',
                                    scheme: '${data.scheme}',
                                    host: '${data.host}',
                                    path: '${data.path ?: ""}',
                                    query: '${data.query ?: ""}',
                                    fragment: '${data.fragment ?: ""}',
                                    token: '${token ?: ""}',
                                    timestamp: Date.now()
                                };
                                
                                // Store in sessionStorage for persistence
                                sessionStorage.setItem('oauthCallback', JSON.stringify(callbackData));
                                localStorage.setItem('lastOAuthCallback', JSON.stringify(callbackData));
                                
                                // If we have a token, store it for the web app
                                if (callbackData.token) {
                                    localStorage.setItem('authToken', callbackData.token);
                                    sessionStorage.setItem('authToken', callbackData.token);
                                    console.log('Auth token stored:', callbackData.token.substring(0, 20) + '...');
                                }
                                
                                // Dispatch custom event
                                const event = new CustomEvent('oauthCallback', {
                                    detail: callbackData
                                });
                                window.dispatchEvent(event);
                                
                                // Try multiple callback methods
                                if (window.handleOAuthCallback) {
                                    console.log('Calling window.handleOAuthCallback');
                                    window.handleOAuthCallback(callbackData.url);
                                }
                                
                                if (window.onOAuthCallback) {
                                    console.log('Calling window.onOAuthCallback');
                                    window.onOAuthCallback(callbackData);
                                }
                                
                                // Check for common OAuth libraries
                                if (window.gapi && window.gapi.auth2) {
                                    console.log('Google Auth API detected');
                                }
                                
                                // Notify Android that callback was processed
                                if (window.Android && window.Android.postMessage) {
                                    window.Android.postMessage('OAUTH_CALLBACK_PROCESSED:' + JSON.stringify(callbackData));
                                }
                                
                                // Mark as OAuth success
                                sessionStorage.setItem('oauthSuccess', 'true');
                                
                                // Trigger immediate page refresh to update login state
                                console.log('Triggering immediate page refresh for login state update');
                                setTimeout(function() {
                                    window.location.reload();
                                }, 1000);
                                
                                console.log('OAuth callback processed:', callbackData);
                                return 'OAuth callback processed successfully';
                            })();
                        """.trimIndent()
                        
                        // Execute the callback script after a short delay to ensure page is loaded
                        webView.postDelayed({
                            Log.d("MainActivity", "Executing OAuth callback script")
                            webView.evaluateJavascript(callbackScript) { result ->
                                Log.d("MainActivity", "Callback script result: $result")
                            }
                        }, 1000) // Reduced delay for faster response
                    } else {
                        Log.w("MainActivity", "WebView not initialized when handling OAuth callback")
                        // Try to reinitialize WebView if needed
                        setupWebView()
                        webView.loadUrl("https://audiogretel.com")
                    }
                } catch (e: Exception) {
                    Log.e("MainActivity", "Error handling OAuth callback", e)
                }
            }
        } else {
            Log.d("MainActivity", "Intent does not contain OAuth callback data")
        }
    }

    private fun setupWebView() {
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            databaseEnabled = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
            loadWithOverviewMode = true
            useWideViewPort = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            allowFileAccess = true
            allowContentAccess = true
            
            // Set a proper user agent that Google will accept
            userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            
            // Additional settings for OAuth compatibility
            mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            
            // Clear cache and cookies to force account picker
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        }

        // Clear WebView data to ensure fresh OAuth flow
        webView.clearCache(true)
        webView.clearHistory()
        android.webkit.CookieManager.getInstance().apply {
            removeAllCookies(null)
            flush()
        }

        webView.addJavascriptInterface(WebAppInterface(), "Android")

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                Log.d("WebView", "URL solicitada: $url")
                
                // Handle custom scheme redirects
                if (url.startsWith("audiogretel://")) {
                    Log.d("WebView", "Detected OAuth callback URL: $url")
                    
                    // Close any popup dialog
                    runOnUiThread {
                        popupDialog?.dismiss()
                    }
                    
                    // Create an intent to handle the OAuth callback
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        handleIntent(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e("WebView", "Error manejando URL personalizada: $url", e)
                    }
                }
                
                return false
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("WebView", "Página terminada: $url")
                
                // Inject JavaScript to handle login clicks and URL changes
                val javascript = """
                    (function() {
                        // Monitor URL changes
                        let currentUrl = window.location.href;
                        function checkUrlChange() {
                            if (window.location.href !== currentUrl) {
                                console.log('URL cambió de ' + currentUrl + ' a ' + window.location.href);
                                Android.postMessage('URL_CHANGED:' + window.location.href);
                                currentUrl = window.location.href;
                            }
                        }
                        setInterval(checkUrlChange, 100);
                        
                        // Function to modify Google OAuth URLs to force account picker
                        function modifyGoogleOAuthUrl(url) {
                            if (url.includes('accounts.google.com/oauth') || url.includes('accounts.google.com/signin') || url.includes('accounts.google.com/o/oauth2')) {
                                try {
                                    const urlObj = new URL(url);
                                    
                                    // Force account picker with the correct parameter
                                    urlObj.searchParams.set('prompt', 'select_account');
                                    urlObj.searchParams.set('access_type', 'offline');
                                    
                                    // Remove ALL parameters that could bypass account selection
                                    const paramsToRemove = [
                                        'login_hint', 'hd', 'authuser', 'account', 'session_state', 
                                        'approval_prompt', 'include_granted_scopes', 'state',
                                        'selected_account', 'account_hint', 'user_hint',
                                        'email_hint', 'domain_hint', 'preferred_account',
                                        'account_selection_hint', 'signin_hint', 'auto_select',
                                        'skip_account_chooser', 'account_chooser_result'
                                    ];
                                    
                                    paramsToRemove.forEach(param => {
                                        urlObj.searchParams.delete(param);
                                    });
                                    
                                    // Add additional parameters to force fresh authentication
                                    urlObj.searchParams.set('include_granted_scopes', 'false');
                                    urlObj.searchParams.set('enable_granular_consent', 'false');
                                    
                                    const modifiedUrl = urlObj.toString();
                                    if (modifiedUrl !== url) {
                                        console.log('Modified Google OAuth URL to force account picker');
                                        console.log('Original:', url);
                                        console.log('Modified:', modifiedUrl);
                                    }
                                    return modifiedUrl;
                                } catch (e) {
                                    console.error('Error modifying OAuth URL:', e);
                                    return url;
                                }
                            }
                            return url;
                        }
                        
                        // Override window.open to modify Google OAuth URLs
                        const originalOpen = window.open;
                        window.open = function(url, target, features) {
                            if (url && typeof url === 'string') {
                                url = modifyGoogleOAuthUrl(url);
                            }
                            return originalOpen.call(this, url, target, features);
                        };
                        
                        // Override location.href assignments
                        const originalLocationHref = Object.getOwnPropertyDescriptor(Location.prototype, 'href');
                        Object.defineProperty(location, 'href', {
                            set: function(url) {
                                if (typeof url === 'string') {
                                    url = modifyGoogleOAuthUrl(url);
                                }
                                originalLocationHref.set.call(this, url);
                            },
                            get: originalLocationHref.get
                        });
                        
                        // Monitor login button clicks
                        document.addEventListener('click', function(e) {
                            if (e.target.tagName === 'A' || e.target.tagName === 'BUTTON') {
                                const text = e.target.textContent || e.target.innerText || '';
                                const href = e.target.href || e.target.getAttribute('href') || '';
                                
                                // Check if it's a Google login link
                                if (href.includes('google') || href.includes('oauth') || 
                                    text.toLowerCase().includes('google') ||
                                    text.toLowerCase().includes('login') || 
                                    text.toLowerCase().includes('iniciar') ||
                                    text.toLowerCase().includes('sign in') ||
                                    e.target.className.includes('login')) {
                                    
                                    console.log('Click en botón de login detectado: ' + text);
                                    Android.postMessage('LOGIN_BUTTON_CLICKED:' + text);
                                    
                                    // If it's a Google OAuth link, modify it
                                    if (href && (href.includes('google') || href.includes('oauth'))) {
                                        const modifiedUrl = modifyGoogleOAuthUrl(href);
                                        if (modifiedUrl !== href) {
                                            e.preventDefault();
                                            window.location.href = modifiedUrl;
                                            return false;
                                        }
                                    }
                                }
                            }
                        });
                        
                        // Listen for OAuth callback events
                        window.addEventListener('oauthCallback', function(event) {
                            console.log('OAuth callback event received:', event.detail);
                            Android.postMessage('OAUTH_CALLBACK:' + JSON.stringify(event.detail));
                        });
                        
                        // Clear any existing Google account cookies to force fresh login
                        if (window.location.hostname.includes('google.com')) {
                            console.log('On Google domain, clearing account cookies');
                            document.cookie.split(";").forEach(function(c) { 
                                document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
                            });
                        }
                    })();
                """.trimIndent()
                
                view?.evaluateJavascript(javascript, null)
            }
        }

        webView.webChromeClient = object : WebChromeClient() {
            override fun onConsoleMessage(consoleMessage: ConsoleMessage?): Boolean {
                Log.d("WebView", "Console: ${consoleMessage?.message()} at ${consoleMessage?.sourceId()}:${consoleMessage?.lineNumber()}")
                return true
            }

            override fun onCreateWindow(
                view: WebView?,
                isDialog: Boolean,
                isUserGesture: Boolean,
                resultMsg: android.os.Message?
            ): Boolean {
                Log.d("WebView", "onCreateWindow llamado - isDialog: $isDialog, isUserGesture: $isUserGesture")
                
                // Create a visible popup dialog
                runOnUiThread {
                    showPopupDialog(resultMsg)
                }
                
                return true
            }
        }

        // Load the initial URL
        webView.loadUrl("https://audiogretel.com")
    }

    private fun showPopupDialog(resultMsg: android.os.Message?) {
        // Close any existing popup
        popupDialog?.dismiss()
        
        // Cancel any existing timeout
        oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return)
        
        // Force account picker more aggressively before showing popup
        forceAccountPickerBeforePopup()
        
        // Create a new WebView for the popup
        val popupWebView = WebView(this)
        popupWebView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            setSupportMultipleWindows(true)
            javaScriptCanOpenWindowsAutomatically = true
            // Use the same user agent for popup windows
            userAgentString = "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
            
            // Clear cache for fresh OAuth flow
            cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        }
        
        // Clear popup WebView data to ensure fresh OAuth flow
        popupWebView.clearCache(true)
        popupWebView.clearHistory()
        
        // Set up OAuth timeout (30 seconds)
        oauthTimeoutHandler = android.os.Handler(mainLooper)
        oauthTimeoutRunnable = Runnable {
            Log.w("WebView", "OAuth timeout reached, checking for successful login")
            runOnUiThread {
                // Check if login was successful by examining the main page
                webView.evaluateJavascript("""
                    (function() {
                        // Check if we have stored auth tokens
                        const authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
                        const oauthSuccess = sessionStorage.getItem('oauthSuccess');
                        
                        // Check if page shows logged in state
                        const isLoggedIn = document.querySelector('.user-menu') || 
                                         document.querySelector('.logout') ||
                                         document.querySelector('[data-testid="user-menu"]') ||
                                         document.body.innerHTML.includes('logout') ||
                                         document.body.innerHTML.includes('dashboard');
                        
                        return {
                            hasToken: !!authToken,
                            oauthSuccess: oauthSuccess === 'true',
                            isLoggedIn: !!isLoggedIn,
                            shouldClosePopup: !!(authToken || oauthSuccess || isLoggedIn)
                        };
                    })();
                """.trimIndent()) { result ->
                    Log.d("WebView", "OAuth timeout check result: $result")
                    if (result?.contains("shouldClosePopup\":true") == true) {
                        Log.i("WebView", "Login appears successful, closing popup")
                        popupDialog?.dismiss()
                        popupDialog = null
                        webView.loadUrl("https://audiogretel.com")
                    } else {
                        Log.w("WebView", "OAuth may have failed, keeping popup open")
                    }
                }
            }
        }
        oauthTimeoutHandler?.postDelayed(oauthTimeoutRunnable!!, 30000) // 30 second timeout

        popupWebView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                Log.d("WebView", "Popup URL: $url")
                
                // Add debug JavaScript to understand what's happening
                val debugScript = """
                    (function() {
                        try {
                            console.log('Popup page started: ' + window.location.href);
                            
                            // Monitor for any redirects or changes
                            const originalLocation = window.location.href;
                            
                            // Check for immediate redirects
                            setTimeout(function() {
                                try {
                                    if (window.location.href !== originalLocation) {
                                        console.log('Popup redirected from ' + originalLocation + ' to ' + window.location.href);
                                    }
                                } catch (e) {
                                    console.log('Error checking redirect:', e);
                                }
                            }, 1000);
                            
                            // Monitor for meta refresh tags (with null check)
                            setTimeout(function() {
                                try {
                                    const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
                                    if (metaRefresh && metaRefresh.getAttribute) {
                                        console.log('Meta refresh found:', metaRefresh.getAttribute('content'));
                                    }
                                } catch (e) {
                                    console.log('Error checking meta refresh:', e);
                                }
                            }, 500);
                            
                            // Monitor for JavaScript redirects
                            if (window.location && window.location.replace) {
                                const originalReplace = window.location.replace;
                                window.location.replace = function(url) {
                                    console.log('JavaScript redirect to:', url);
                                    return originalReplace.call(this, url);
                                };
                            }
                            
                            if (window.location && window.location.assign) {
                                const originalAssign = window.location.assign;
                                window.location.assign = function(url) {
                                    console.log('JavaScript assign to:', url);
                                    return originalAssign.call(this, url);
                                };
                            }
                        } catch (e) {
                            console.log('Error in popup debug script:', e);
                        }
                    })();
                """.trimIndent()
                
                view?.evaluateJavascript(debugScript, null)
                
                // If this is a Google OAuth URL, modify it to force account picker
                if (url != null && (url.contains("accounts.google.com/oauth") || url.contains("accounts.google.com/signin") || url.contains("accounts.google.com/o/oauth2"))) {
                    try {
                        val uri = Uri.parse(url)
                        val builder = uri.buildUpon()
                        
                        // Clear all existing query parameters to start fresh
                        builder.clearQuery()
                        
                        // List of parameters that could bypass account selection
                        val paramsToExclude = listOf(
                            "prompt", "access_type", "login_hint", "hd", "authuser", "account", 
                            "session_state", "approval_prompt", "include_granted_scopes", "state",
                            "selected_account", "account_hint", "user_hint", "email_hint", 
                            "domain_hint", "preferred_account", "account_selection_hint", 
                            "signin_hint", "auto_select", "skip_account_chooser", "account_chooser_result"
                        )
                        
                        // Re-add all original parameters except the ones we want to override
                        for (paramName in uri.queryParameterNames) {
                            if (paramName !in paramsToExclude) {
                                val values = uri.getQueryParameters(paramName)
                                for (value in values) {
                                    builder.appendQueryParameter(paramName, value)
                                }
                            }
                        }
                        
                        // Add parameters to force account picker
                        builder.appendQueryParameter("prompt", "select_account")
                        builder.appendQueryParameter("access_type", "offline")
                        builder.appendQueryParameter("include_granted_scopes", "false")
                        builder.appendQueryParameter("enable_granular_consent", "false")
                        
                        val modifiedUrl = builder.build().toString()
                        if (modifiedUrl != url) {
                            Log.d("WebView", "Modifying popup Google OAuth URL to force account picker")
                            Log.d("WebView", "Original: $url")
                            Log.d("WebView", "Modified: $modifiedUrl")
                            view?.loadUrl(modifiedUrl)
                            return
                        }
                    } catch (e: Exception) {
                        Log.e("WebView", "Error modifying popup OAuth URL", e)
                    }
                }
            }

            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                Log.d("WebView", "Popup página terminada: $url")
                
                // Check if we're back at audiogretel.com with tokens or if login completed
                if (url?.contains("audiogretel.com") == true && !url.contains("accounts.google.com")) {
                    // Check for OAuth success indicators
                    val tokenCheckScript = """
                        (function() {
                            try {
                                // Look for common OAuth success indicators
                                const urlParams = new URLSearchParams(window.location.search);
                                const hash = window.location.hash;
                                const fullUrl = window.location.href;
                                
                                // Check for tokens in URL parameters or hash
                                const accessToken = urlParams.get('access_token') || 
                                                  (hash.match(/access_token=([^&]+)/) && hash.match(/access_token=([^&]+)/)[1]);
                                const idToken = urlParams.get('id_token') || 
                                              (hash.match(/id_token=([^&]+)/) && hash.match(/id_token=([^&]+)/)[1]);
                                const code = urlParams.get('code');
                                const token = urlParams.get('token');
                                
                                // Also check if user appears to be logged in (with null checks)
                                let isLoggedIn = false;
                                try {
                                    isLoggedIn = !!(document.querySelector('.user-menu') || 
                                                   document.querySelector('.logout') ||
                                                   document.querySelector('[data-testid="user-menu"]') ||
                                                   (document.body && document.body.innerHTML && 
                                                    (document.body.innerHTML.includes('logout') ||
                                                     document.body.innerHTML.includes('dashboard') ||
                                                     document.body.innerHTML.includes('profile'))));
                                } catch (e) {
                                    console.log('Error checking login state:', e);
                                }
                                
                                return {
                                    accessToken: accessToken,
                                    idToken: idToken,
                                    code: code,
                                    token: token,
                                    url: fullUrl,
                                    isLoggedIn: isLoggedIn
                                };
                            } catch (e) {
                                console.log('Error in token check script:', e);
                                return {
                                    accessToken: null,
                                    idToken: null,
                                    code: null,
                                    token: null,
                                    url: window.location.href,
                                    isLoggedIn: false
                                };
                            }
                        })();
                    """.trimIndent()
                    
                    view?.evaluateJavascript(tokenCheckScript) { result ->
                        Log.d("WebView", "Resultado búsqueda token en popup: $result")
                        if (result != null && (result.contains("true") || result.contains("access_token") || result.contains("code") || result.contains("token"))) {
                            // Found tokens or login success, close popup and reload main WebView
                            Log.d("WebView", "OAuth success detected, closing popup and reloading main view")
                            runOnUiThread {
                                // Cancel timeout since OAuth completed successfully
                                oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return@runOnUiThread)
                                
                                popupDialog?.dismiss()
                                popupDialog = null
                                webView.loadUrl("https://audiogretel.com")
                            }
                        }
                    }
                }
                
                // Also check if this page contains any redirect attempts to audiogretel://
                if (url != null) {
                    val redirectCheckScript = """
                        (function() {
                            try {
                                // Check for any meta refresh or JavaScript redirects to audiogretel://
                                const metaRefresh = document.querySelector('meta[http-equiv="refresh"]');
                                if (metaRefresh && metaRefresh.getAttribute) {
                                    const content = metaRefresh.getAttribute('content');
                                    if (content && content.includes('audiogretel://')) {
                                        const match = content.match(/url=([^;]+)/);
                                        if (match) {
                                            return match[1];
                                        }
                                    }
                                }
                                
                                // Check for JavaScript redirects (with null checks)
                                const scripts = document.querySelectorAll('script');
                                if (scripts && scripts.length > 0) {
                                    for (let script of scripts) {
                                        if (script && script.textContent && script.textContent.includes('audiogretel://')) {
                                            const match = script.textContent.match(/audiogretel:\/\/[^"'\s]+/);
                                            if (match) {
                                                return match[0];
                                            }
                                        }
                                    }
                                }
                                
                                // Check if the page body contains the redirect URL (with null checks)
                                if (document.body && document.body.textContent && document.body.textContent.includes('audiogretel://')) {
                                    const match = document.body.textContent.match(/audiogretel:\/\/[^\s"'<>]+/);
                                    if (match) {
                                        return match[0];
                                    }
                                }
                                
                                return null;
                            } catch (e) {
                                console.log('Error in redirect check script:', e);
                                return null;
                            }
                        })();
                    """.trimIndent()
                    
                    view?.evaluateJavascript(redirectCheckScript) { result ->
                        if (result != null && result.contains("audiogretel://")) {
                            val cleanResult = result.replace("\"", "")
                            Log.d("WebView", "Found audiogretel redirect in popup: $cleanResult")
                            runOnUiThread {
                                // Cancel timeout since OAuth redirect was found
                                oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return@runOnUiThread)
                                
                                popupDialog?.dismiss()
                                popupDialog = null
                                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(cleanResult))
                                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                                handleIntent(intent)
                            }
                        }
                    }
                }
            }

            override fun shouldOverrideUrlLoading(view: WebView?, request: WebResourceRequest?): Boolean {
                val url = request?.url.toString()
                Log.d("WebView", "Popup URL override: $url")
                
                // Handle OAuth callback URLs
                if (url.startsWith("audiogretel://")) {
                    Log.d("WebView", "OAuth callback detected in popup: $url")
                    // Close popup and handle the callback in main activity
                    runOnUiThread {
                        // Cancel timeout since OAuth callback was detected
                        oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return@runOnUiThread)
                        
                        popupDialog?.dismiss()
                        popupDialog = null
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                        handleIntent(intent)
                    }
                    return true
                }
                
                // Handle backend OAuth callback redirects
                if (url.contains("/api/auth/google/callback") || url.contains("/auth/google/callback")) {
                    Log.d("WebView", "Backend OAuth callback detected: $url")
                    // Let this load normally, but monitor for redirects
                    return false
                }
                
                // Handle successful OAuth redirects back to audiogretel.com
                if (url.contains("audiogretel.com") && !url.contains("accounts.google.com")) {
                    Log.d("WebView", "Successful OAuth redirect detected: $url")
                    
                    // Check if this looks like a successful login redirect
                    if (url.contains("?") || url.contains("#") || url.contains("token") || url.contains("code")) {
                        Log.d("WebView", "OAuth success parameters detected in URL")
                        runOnUiThread {
                            popupDialog?.dismiss()
                            popupDialog = null
                            webView.loadUrl(url)
                            
                            // Inject success detection script
                            webView.postDelayed({
                                val successScript = """
                                    (function() {
                                        console.log('Checking for OAuth success...');
                                        
                                        // Check URL parameters for OAuth tokens/codes
                                        const urlParams = new URLSearchParams(window.location.search);
                                        const hash = window.location.hash;
                                        
                                        const hasToken = urlParams.has('access_token') || 
                                                        urlParams.has('id_token') || 
                                                        urlParams.has('code') ||
                                                        urlParams.has('token') ||
                                                        hash.includes('access_token') ||
                                                        hash.includes('id_token');
                                        
                                        if (hasToken) {
                                            console.log('OAuth tokens detected, triggering success handler');
                                            
                                            // Dispatch success event
                                            const event = new CustomEvent('oauthSuccess', {
                                                detail: {
                                                    url: window.location.href,
                                                    params: Object.fromEntries(urlParams),
                                                    hash: hash
                                                }
                                            });
                                            window.dispatchEvent(event);
                                            
                                            // Store success state
                                            sessionStorage.setItem('oauthSuccess', 'true');
                                            
                                            // Reload to clean URL and trigger login state check
                                            setTimeout(() => {
                                                window.location.href = 'https://audiogretel.com';
                                            }, 1000);
                                        }
                                    })();
                                """.trimIndent()
                                
                                webView.evaluateJavascript(successScript, null)
                            }, 500)
                        }
                        return true
                    } else {
                        // Regular audiogretel.com page, just close popup and load in main view
                        runOnUiThread {
                            popupDialog?.dismiss()
                            popupDialog = null
                            webView.loadUrl(url)
                        }
                        return true
                    }
                }
                
                // Handle Google OAuth intermediate pages
                if (url.contains("accounts.google.com")) {
                    Log.d("WebView", "Google OAuth page, allowing normal load: $url")
                    return false
                }
                
                return false
            }
        }
        
        // Create and show the dialog
        popupDialog = Dialog(this, android.R.style.Theme_Black_NoTitleBar_Fullscreen)
        
        val layout = LinearLayout(this)
        layout.orientation = LinearLayout.VERTICAL
        layout.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        
        popupWebView.layoutParams = ViewGroup.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        )
        
        layout.addView(popupWebView)
        popupDialog?.setContentView(layout)
        
        // Set up the WebView transport
        val transport = resultMsg?.obj as? WebView.WebViewTransport
        transport?.webView = popupWebView
        resultMsg?.sendToTarget()
        
        // Show the dialog
        popupDialog?.show()
        
        // Add a back button handler
        popupDialog?.setOnKeyListener { _, keyCode, event ->
            if (keyCode == android.view.KeyEvent.KEYCODE_BACK && event.action == android.view.KeyEvent.ACTION_UP) {
                if (popupWebView.canGoBack()) {
                    popupWebView.goBack()
                    true
                } else {
                    popupDialog?.dismiss()
                    true
                }
            } else {
                false
            }
        }
    }

    inner class WebAppInterface {
        @JavascriptInterface
        fun postMessage(message: String) {
            Log.d("WebAppInterface", "Mensaje recibido: $message")
            
            when {
                message.startsWith("LOGIN_BUTTON_CLICKED:") -> {
                    val buttonText = message.substringAfter("LOGIN_BUTTON_CLICKED:")
                    Log.d("WebAppInterface", "Botón de login clickeado: $buttonText")
                }
                message.startsWith("URL_CHANGED:") -> {
                    val newUrl = message.substringAfter("URL_CHANGED:")
                    Log.d("WebAppInterface", "URL cambió a: $newUrl")
                }
                message.startsWith("OAUTH_CALLBACK:") -> {
                    val callbackData = message.substringAfter("OAUTH_CALLBACK:")
                    Log.d("WebAppInterface", "OAuth callback data: $callbackData")
                }
                message.startsWith("OAUTH_CALLBACK_PROCESSED:") -> {
                    val processedData = message.substringAfter("OAUTH_CALLBACK_PROCESSED:")
                    Log.d("WebAppInterface", "OAuth callback processed successfully: $processedData")
                    
                    // Optionally trigger additional actions after successful OAuth processing
                    runOnUiThread {
                        // Could add a toast notification or other UI feedback here
                        Log.i("MainActivity", "OAuth login flow completed successfully")
                    }
                }
                message.startsWith("DEBUG_OAUTH:") -> {
                    val debugData = message.substringAfter("DEBUG_OAUTH:")
                    Log.d("WebAppInterface", "OAuth Debug: $debugData")
                }
                else -> {
                    Log.d("WebAppInterface", "Unknown message type: $message")
                }
            }
        }
        
        @JavascriptInterface
        fun testOAuthCallback(token: String) {
            Log.d("WebAppInterface", "Testing OAuth callback with token: ${token.take(20)}...")
            runOnUiThread {
                val testUrl = "audiogretel://auth/callback?token=$token"
                val intent = Intent(Intent.ACTION_VIEW, Uri.parse(testUrl))
                intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
                handleIntent(intent)
            }
        }
    }

    override fun onBackPressed() {
        if (popupDialog?.isShowing == true) {
            popupDialog?.dismiss()
            // Cancel OAuth timeout when popup is manually closed
            oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return)
        } else if (webView.canGoBack()) {
            webView.goBack()
        } else {
            super.onBackPressed()
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        popupDialog?.dismiss()
        // Cancel OAuth timeout on destroy
        oauthTimeoutHandler?.removeCallbacks(oauthTimeoutRunnable ?: return)
    }

    private fun bringAppToForeground() {
        Log.d("MainActivity", "Bringing app to foreground")
        
        // Method 1: Use activity flags
        val intent = Intent(this, MainActivity::class.java)
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or 
                       Intent.FLAG_ACTIVITY_SINGLE_TOP or 
                       Intent.FLAG_ACTIVITY_NEW_TASK or
                       Intent.FLAG_ACTIVITY_REORDER_TO_FRONT or
                       Intent.FLAG_ACTIVITY_BROUGHT_TO_FRONT)
        startActivity(intent)
        
        // Method 2: Try to move task to front
        try {
            val activityManager = getSystemService(ACTIVITY_SERVICE) as android.app.ActivityManager
            val tasks = activityManager.getRunningTasks(10)
            for (task in tasks) {
                if (task.baseActivity?.packageName == packageName) {
                    activityManager.moveTaskToFront(task.id, android.app.ActivityManager.MOVE_TASK_WITH_HOME)
                    break
                }
            }
        } catch (e: Exception) {
            Log.w("MainActivity", "Could not move task to front", e)
        }
        
        // Method 3: Request focus
        runOnUiThread {
            window.addFlags(android.view.WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                           android.view.WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON)
        }
    }

    private fun clearGoogleOAuthData() {
        Log.d("MainActivity", "Clearing Google OAuth data to force account picker")
        
        // Clear all WebView data
        webView.clearCache(true)
        webView.clearHistory()
        webView.clearFormData()
        
        // Clear all cookies more aggressively
        val cookieManager = android.webkit.CookieManager.getInstance()
        cookieManager.removeAllCookies { success ->
            Log.d("MainActivity", "Cookies cleared: $success")
        }
        cookieManager.removeSessionCookies { success ->
            Log.d("MainActivity", "Session cookies cleared: $success")
        }
        cookieManager.flush()
        
        // Clear WebView storage
        android.webkit.WebStorage.getInstance().deleteAllData()
        
        // Clear application cache and data
        try {
            val cacheDir = cacheDir
            if (cacheDir.exists()) {
                cacheDir.deleteRecursively()
            }
            
            // Clear shared preferences that might contain Google auth data
            val prefs = getSharedPreferences("google_signin_accounts", MODE_PRIVATE)
            prefs.edit().clear().apply()
            
            val defaultPrefs = getSharedPreferences(packageName + "_preferences", MODE_PRIVATE)
            defaultPrefs.edit().clear().apply()
            
        } catch (e: Exception) {
            Log.e("MainActivity", "Error clearing cache/preferences", e)
        }
        
        // Force reload with no-cache headers
        webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE
        
        Log.d("MainActivity", "Google OAuth data clearing completed")
    }

    private fun forceAccountPickerBeforePopup() {
        Log.d("MainActivity", "Forcing account picker by clearing Google authentication state")
        
        // Inject JavaScript to clear Google-specific cookies and storage
        val clearGoogleDataScript = """
            (function() {
                try {
                    console.log('Clearing Google authentication data...');
                    
                    // Clear all localStorage
                    if (window.localStorage) {
                        window.localStorage.clear();
                        console.log('localStorage cleared');
                    }
                    
                    // Clear all sessionStorage
                    if (window.sessionStorage) {
                        window.sessionStorage.clear();
                        console.log('sessionStorage cleared');
                    }
                    
                    // Clear all cookies by setting them to expire
                    document.cookie.split(";").forEach(function(c) { 
                        const eqPos = c.indexOf("=");
                        const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                        // Set cookie to expire for all possible domains and paths
                        const domains = ['', '.google.com', '.accounts.google.com', '.googleapis.com', '.gstatic.com'];
                        const paths = ['/', '/accounts', '/oauth', '/signin'];
                        
                        domains.forEach(domain => {
                            paths.forEach(path => {
                                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=" + path + (domain ? ";domain=" + domain : "");
                            });
                        });
                    });
                    console.log('Cookies cleared');
                    
                    // Clear IndexedDB
                    if (window.indexedDB) {
                        try {
                            window.indexedDB.databases().then(databases => {
                                databases.forEach(db => {
                                    if (db.name) {
                                        window.indexedDB.deleteDatabase(db.name);
                                    }
                                });
                            });
                            console.log('IndexedDB cleared');
                        } catch (e) {
                            console.log('Error clearing IndexedDB:', e);
                        }
                    }
                    
                    // Clear WebSQL (if supported)
                    if (window.openDatabase) {
                        try {
                            const db = window.openDatabase('', '', '', '');
                            if (db) {
                                db.transaction(function(tx) {
                                    tx.executeSql('DROP TABLE IF EXISTS accounts');
                                    tx.executeSql('DROP TABLE IF EXISTS auth_tokens');
                                });
                            }
                            console.log('WebSQL cleared');
                        } catch (e) {
                            console.log('Error clearing WebSQL:', e);
                        }
                    }
                    
                    console.log('Google authentication data clearing completed');
                    return 'SUCCESS';
                } catch (e) {
                    console.log('Error clearing Google data:', e);
                    return 'ERROR: ' + e.message;
                }
            })();
        """.trimIndent()
        
        webView.evaluateJavascript(clearGoogleDataScript) { result ->
            Log.d("MainActivity", "Google data clearing result: $result")
        }
    }
}