package com.billvyapar.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * TrackingWatchdogWorker — WorkManager periodic job that ensures TrackingService
 * stays alive even on aggressive OEM battery killers (Xiaomi MIUI, Samsung OneUI,
 * Oppo ColorOS, Vivo FuntouchOS).
 *
 * WorkManager jobs survive app removal from recents and are rescheduled after reboot
 * by WorkManager itself — no need for a separate BootReceiver for this path.
 *
 * Runs every 15 minutes (minimum WorkManager interval). If the service is already
 * running, startForegroundService() is a no-op (onStartCommand is called again but
 * startLocationUpdates() guards against double-start).
 */
public class TrackingWatchdogWorker extends Worker {
    private static final String TAG = "BV-Watchdog";

    public TrackingWatchdogWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();

        // Only restart if we have a stored tracking session
        if (!TrackingService.loadIdentity(ctx)) {
            Log.d(TAG, "No active session — watchdog no-op");
            return Result.success();
        }

        Log.i(TAG, "Watchdog firing — ensuring TrackingService is alive for employee=" + TrackingService.sEmployeeId);

        Intent intent = new Intent(ctx, TrackingService.class);
        intent.putExtra("employeeId", TrackingService.sEmployeeId);
        intent.putExtra("ownerUserId", TrackingService.sOwnerUserId);
        intent.putExtra("name", TrackingService.sName);
        intent.putExtra("backendUrl", TrackingService.sBackendUrl);

        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ctx.startForegroundService(intent);
            } else {
                ctx.startService(intent);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to restart service: " + e.getMessage());
        }

        return Result.success();
    }
}
