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

    val insets =
      ViewCompat.getRootWindowInsets(decorView)?.getInsets(
        WindowInsetsCompat.Type.statusBars() or
          WindowInsetsCompat.Type.navigationBars() or
          WindowInsetsCompat.Type.displayCutout(),
      ) ?: Insets.NONE

    val data = JSObject()
    data.put("top", insets.top)
    data.put("right", insets.right)
    data.put("bottom", insets.bottom)
    data.put("left", insets.left)
    call.resolve(data)
  }
}
