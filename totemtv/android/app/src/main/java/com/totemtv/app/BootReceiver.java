package com.totemtv.app;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

public class BootReceiver extends BroadcastReceiver {

    private static final String TAG = "TotemTV";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            Log.i(TAG, "BootReceiver: BOOT_COMPLETED received — launching MainActivity");
            Intent launchIntent = new Intent(context, MainActivity.class);
            launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            context.startActivity(launchIntent);
            Log.i(TAG, "BootReceiver: MainActivity launch requested");
        } else {
            Log.w(TAG, "BootReceiver: unexpected action: " + intent.getAction());
        }
    }
}
