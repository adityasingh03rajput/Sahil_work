package com.billvyapar.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.os.Build;
import android.os.Handler;
import android.os.HandlerThread;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.util.Log;
import androidx.core.app.NotificationCompat;
import com.google.android.gms.location.FusedLocationProviderClient;
import com.google.android.gms.location.LocationCallback;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationResult;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.location.Priority;
import org.json.JSONObject;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.Date;

/**
 * TrackingService — Native Android Foreground Service for GPS Tracking
 *
 * This is the KEY architectural difference: GPS polling happens 100% in native Java,
 * completely independent of the WebView / JavaScript layer.
 *
 * Why this works when the WebView doesn't:
 * - The WebView JS runtime is throttled by Android when the screen turns off.
 * - This native service holds a PARTIAL_WAKE_LOCK that prevents the CPU from sleeping.
 * - FusedLocationProviderClient is the Google-blessed way to get background GPS.
 * - Locations are sent via plain HTTP POST so no socket.io is needed.
 * - START_STICKY ensures Android restarts this service if the OS kills it.
 */
public class TrackingService extends Service {
    private static final String TAG = "BV-Tracking";
    private static final String CHANNEL_ID = "bv_tracking_channel";
    private static final int NOTIFY_ID = 9999;
    private static final long LOCATION_INTERVAL_MS = 15000;  // 15s
    private static final long MIN_LOCATION_INTERVAL_MS = 10000; // 10s fastest
    // private static final float MIN_DISTANCE_METERS = 10f; // Removed to ensure stationary heartbeats

    // Static fields so plugin can update them at any time
    public static String sEmployeeId = "";
    public static String sOwnerUserId = "";
    public static String sName = "";
    public static String sBackendUrl = "";

    private FusedLocationProviderClient fusedLocationClient;
    private LocationCallback locationCallback;
    private PowerManager.WakeLock wakeLock;
    private ExecutorService networkExecutor;
    // Dedicated background thread for location callbacks — NEVER use main looper,
    // because Android throttles the UI thread hard when the screen turns off.
    private HandlerThread locationHandlerThread;
    private Handler locationHandler;

    @Override
    public void onCreate() {
        super.onCreate();
        Log.i(TAG, "TrackingService.onCreate()");
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this);
        networkExecutor = Executors.newSingleThreadExecutor();

        // Start a dedicated background thread for GPS callbacks.
        // This is critical: Looper.getMainLooper() is throttled on screen-off.
        locationHandlerThread = new HandlerThread("BV-LocationThread");
        locationHandlerThread.start();
        locationHandler = new Handler(locationHandlerThread.getLooper());

        createNotificationChannel();
        acquireWakeLock();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            Log.i(TAG, "STOP action received — stopping service");
            stopSelfClean();
            return START_NOT_STICKY;
        }

        // Read identity params from intent (sent by TrackingPlugin)
        if (intent != null) {
            String eid = intent.getStringExtra("employeeId");
            String oid = intent.getStringExtra("ownerUserId");
            String nm  = intent.getStringExtra("name");
            String url = intent.getStringExtra("backendUrl");
            if (eid != null && !eid.isEmpty()) sEmployeeId = eid;
            if (oid != null && !oid.isEmpty()) sOwnerUserId = oid;
            if (nm  != null && !nm.isEmpty())  sName = nm;
            if (url != null && !url.isEmpty())  sBackendUrl = url;
        }

        Log.i(TAG, "Starting foreground for employee=" + sEmployeeId + " owner=" + sOwnerUserId);

        Notification notification = buildNotification();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFY_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFY_ID, notification);
        }

        startLocationUpdates();

        // START_STICKY = Android will restart this service if it ever gets killed
        return START_STICKY;
    }

    private void startLocationUpdates() {
        if (locationCallback != null) return; // already running

        LocationRequest locationRequest = new LocationRequest.Builder(Priority.PRIORITY_HIGH_ACCURACY, LOCATION_INTERVAL_MS)
                .setMinUpdateIntervalMillis(MIN_LOCATION_INTERVAL_MS)
                // .setMinUpdateDistanceMeters(MIN_DISTANCE_METERS) // Cannot use this; it stops callbacks completely when stationary
                .setWaitForAccurateLocation(false)
                .build();

        locationCallback = new LocationCallback() {
            @Override
            public void onLocationResult(LocationResult result) {
                if (result == null) return;
                for (Location loc : result.getLocations()) {
                    Log.d(TAG, "Got location: " + loc.getLatitude() + "," + loc.getLongitude() + " acc=" + loc.getAccuracy());
                    postLocationToBackend(loc);
                }
            }
        };

        try {
            // KEY FIX: use our dedicated HandlerThread looper, NOT the main looper.
            // The main looper (UI thread) is throttled by Android's Doze/screen-off.
            // A background HandlerThread is NOT subject to this throttle.
            fusedLocationClient.requestLocationUpdates(
                    locationRequest,
                    locationCallback,
                    locationHandler.getLooper()
            );
            Log.i(TAG, "Location updates started on background thread");
        } catch (SecurityException e) {
            Log.e(TAG, "No location permission", e);
        }
    }

    private void postLocationToBackend(Location loc) {
        if (sBackendUrl.isEmpty() || sEmployeeId.isEmpty() || sOwnerUserId.isEmpty()) {
            Log.w(TAG, "Missing config, skipping location post");
            return;
        }

        // Discard very inaccurate readings (>100m)
        if (loc.hasAccuracy() && loc.getAccuracy() > 100f) {
            Log.d(TAG, "Discarding low-accuracy reading: " + loc.getAccuracy() + "m");
            return;
        }

        networkExecutor.submit(() -> {
            int retries = 2;
            boolean success = false;
            while (retries >= 0 && !success) {
                try {
                    String endpoint = sBackendUrl.replaceAll("/$", "") + "/attendance/live-location";
                    URL url = new URL(endpoint);
                    HttpURLConnection conn = (HttpURLConnection) url.openConnection();
                    conn.setRequestMethod("POST");
                    conn.setRequestProperty("Content-Type", "application/json");
                    conn.setRequestProperty("User-Agent", "BillVyapar-NativeTracker/1.0");
                    conn.setDoOutput(true);
                    
                    // Increased timeouts for cold starts (Fly.dev)
                    conn.setConnectTimeout(25000); 
                    conn.setReadTimeout(25000);

                    JSONObject body = new JSONObject();
                    body.put("employeeId", sEmployeeId);
                    body.put("ownerUserId", sOwnerUserId);
                    body.put("name", sName);
                    body.put("lat", loc.getLatitude());
                    body.put("lng", loc.getLongitude());
                    body.put("accuracy", loc.hasAccuracy() ? loc.getAccuracy() : 0);
                    body.put("speed", loc.hasSpeed() ? loc.getSpeed() : 0);
                    body.put("updatedAt", new Date(loc.getTime()).toInstant().toString());

                    byte[] bodyBytes = body.toString().getBytes("UTF-8");
                    conn.setRequestProperty("Content-Length", String.valueOf(bodyBytes.length));

                    OutputStream os = conn.getOutputStream();
                    os.write(bodyBytes);
                    os.flush();
                    os.close();

                    int code = conn.getResponseCode();
                    Log.d(TAG, "Posted location → HTTP " + code);
                    conn.disconnect();
                    success = true; 
                } catch (Exception e) {
                    Log.e(TAG, "Failed to post location (retries left: " + retries + "): " + e.getMessage());
                    retries--;
                    if (retries >= 0) {
                        try { Thread.sleep(2000); } catch (InterruptedException ignored) {}
                    }
                }
            }
        });
    }

    private void stopSelfClean() {
        if (locationCallback != null) {
            fusedLocationClient.removeLocationUpdates(locationCallback);
            locationCallback = null;
        }
        // Quit the background HandlerThread cleanly
        if (locationHandlerThread != null) {
            locationHandlerThread.quitSafely();
            locationHandlerThread = null;
            locationHandler = null;
        }
        releaseWakeLock();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE);
        } else {
            stopForeground(true);
        }
        stopSelf();
    }

    private void acquireWakeLock() {
        PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (pm != null) {
            wakeLock = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "BillVyapar::TrackingWakeLock");
            wakeLock.acquire(10 * 60 * 60 * 1000L); // max 10h
            Log.i(TAG, "WakeLock acquired");
        }
    }

    private void releaseWakeLock() {
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
            Log.i(TAG, "WakeLock released");
        }
    }

    private Notification buildNotification() {
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("BillVyapar — Live Tracking Active")
                .setContentText("Your location is being recorded for attendance.")
                .setSmallIcon(android.R.drawable.ic_menu_mylocation)
                // Use DEFAULT priority — LOW priority services are killed more aggressively
                // by OEM battery optimizers (Xiaomi MIUI, Samsung OneUI, etc.)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setCategory(NotificationCompat.CATEGORY_SERVICE)
                .setOngoing(true)
                .setShowWhen(false)
                .build();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onTaskRemoved(Intent rootIntent) {
        // App was swiped from recents — restart ourselves immediately
        Log.w(TAG, "App removed from recents — scheduling restart");
        Intent restartIntent = new Intent(getApplicationContext(), TrackingService.class);
        restartIntent.putExtra("employeeId", sEmployeeId);
        restartIntent.putExtra("ownerUserId", sOwnerUserId);
        restartIntent.putExtra("name", sName);
        restartIntent.putExtra("backendUrl", sBackendUrl);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            getApplicationContext().startForegroundService(restartIntent);
        } else {
            getApplicationContext().startService(restartIntent);
        }
    }

    @Override
    public void onDestroy() {
        Log.w(TAG, "TrackingService destroyed");
        stopSelfClean();
        super.onDestroy();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Live Tracking",
                    // IMPORTANCE_DEFAULT keeps the service alive on aggressive OEMs
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("Background GPS for employee attendance");
            channel.setShowBadge(false);
            channel.enableVibration(false);
            channel.enableLights(false);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }
}
