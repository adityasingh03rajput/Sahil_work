package com.billvyapar.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

/**
 * BootReceiver — Restarts the TrackingService after device reboot.
 *
 * The manifest already declares RECEIVE_BOOT_COMPLETED permission.
 * Without this receiver, the service dies forever on reboot until
 * the employee opens the app and marks attendance again.
 *
 * Note: The service will only auto-restart if it was previously running
 * (we check the stored static identity fields). If those are empty the
 * service starts but immediately skips posting (no-op).
 */
public class BootReceiver extends BroadcastReceiver {
    private static final String TAG = "BV-BootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction()) &&
            !"android.intent.action.QUICKBOOT_POWERON".equals(intent.getAction())) {
            return;
        }

        Log.i(TAG, "Boot completed — checking if tracking should restart");

        // Load identity from SharedPreferences — static fields are always empty after reboot
        if (!TrackingService.loadIdentity(context)) {
            Log.i(TAG, "No stored tracking session — skipping auto-restart");
            return;
        }

        Log.i(TAG, "Restarting TrackingService after boot for employee=" + TrackingService.sEmployeeId);

        Intent serviceIntent = new Intent(context, TrackingService.class);
        serviceIntent.putExtra("employeeId", TrackingService.sEmployeeId);
        serviceIntent.putExtra("ownerUserId", TrackingService.sOwnerUserId);
        serviceIntent.putExtra("name", TrackingService.sName);
        serviceIntent.putExtra("backendUrl", TrackingService.sBackendUrl);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.startForegroundService(serviceIntent);
        } else {
            context.startService(serviceIntent);
        }
    }
}
