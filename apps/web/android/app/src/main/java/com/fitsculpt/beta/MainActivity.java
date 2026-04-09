package com.fitsculpt.beta;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(HealthSyncPlugin.class);
    super.onCreate(savedInstanceState);

    WindowCompat.setDecorFitsSystemWindows(getWindow(), true);
    getWindow().setStatusBarColor(Color.parseColor("#111827"));

    WindowInsetsControllerCompat windowInsetsController =
      new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());
    windowInsetsController.setAppearanceLightStatusBars(false);
  }
}
