package com.fitsculpt.nativeshell

import androidx.core.graphics.Insets
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin

@CapacitorPlugin(name = "ShellInsets")
class ShellInsetsPlugin : Plugin() {
  @PluginMethod
  fun getInsets(call: PluginCall) {
    val currentActivity = activity
    val decorView = currentActivity?.window?.decorView

    if (currentActivity == null || decorView == null) {
      call.reject("WINDOW_UNAVAILABLE")
      return
    }

    val rootInsets = ViewCompat.getRootWindowInsets(decorView)
    val cutoutInsets =
      rootInsets?.getInsets(WindowInsetsCompat.Type.displayCutout()) ?: Insets.NONE

    // Important: the WebView on Android already lays out below system bars when not in edge-to-edge mode.
    // Returning status/navigation bar insets here causes CSS safe-area padding to be applied twice
    // (visible as extra blank space at top and bottom in APK only).
    // We therefore only expose display-cutout insets.
    val insets = Insets.of(cutoutInsets.left, cutoutInsets.top, cutoutInsets.right, cutoutInsets.bottom)

    val data = JSObject()
    data.put("top", insets.top)
    data.put("right", insets.right)
    data.put("bottom", insets.bottom)
    data.put("left", insets.left)
    call.resolve(data)
  }
}
