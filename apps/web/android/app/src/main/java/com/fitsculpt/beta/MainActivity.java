package com.fitsculpt.beta;

import android.content.res.Configuration;
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
    boolean isNightMode =
      (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK)
        == Configuration.UI_MODE_NIGHT_YES;

    WindowInsetsControllerCompat windowInsetsController =
      new WindowInsetsControllerCompat(getWindow(), getWindow().getDecorView());

    // true means dark icons. Use dark icons on light surfaces and light icons on dark ones.
    windowInsetsController.setAppearanceLightStatusBars(!isNightMode);
    windowInsetsController.setAppearanceLightNavigationBars(!isNightMode);
  }
}
