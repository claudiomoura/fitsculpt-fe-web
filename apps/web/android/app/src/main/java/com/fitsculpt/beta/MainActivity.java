package com.fitsculpt.beta;

import android.graphics.Color;
import android.os.Bundle;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.fitsculpt.nativeshell.HealthSyncPlugin;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(HealthSyncPlugin.class);
    super.onCreate(savedInstanceState);

    WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    getWindow().setStatusBarColor(Color.TRANSPARENT);
    getWindow().setNavigationBarColor(Color.TRANSPARENT);

    applySystemBarIconContrast();
  }

  @Override
  public void onResume() {
    super.onResume();
    applySystemBarIconContrast();
  }

  private void applySystemBarIconContrast() {
    WindowInsetsControllerCompat windowInsetsController =
      new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());

    // FitSculpt's app chrome is dark. Keep system icons light for readability.
    windowInsetsController.setAppearanceLightStatusBars(false);
    windowInsetsController.setAppearanceLightNavigationBars(false);
  }
}
