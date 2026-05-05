package com.fitsculpt.nativeshell

import android.content.Intent
import android.net.Uri
import androidx.activity.result.ActivityResult
import androidx.health.connect.client.HealthConnectClient
import androidx.health.connect.client.PermissionController
import androidx.health.connect.client.permission.HealthPermission
import androidx.health.connect.client.records.ExerciseSessionRecord
import androidx.health.connect.client.records.SleepSessionRecord
import androidx.health.connect.client.records.StepsRecord
import androidx.health.connect.client.records.WeightRecord
import androidx.health.connect.client.request.ReadRecordsRequest
import androidx.health.connect.client.time.TimeRangeFilter
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.time.Instant
import java.time.LocalDate
import java.time.ZoneOffset

@CapacitorPlugin(name = "HealthSync")
class HealthSyncPlugin : Plugin() {
  private val healthConnectPackage = "com.google.android.apps.healthdata"
  private val requiredPermissions = setOf(
    HealthPermission.getReadPermission(StepsRecord::class),
    HealthPermission.getReadPermission(SleepSessionRecord::class),
    HealthPermission.getReadPermission(ExerciseSessionRecord::class),
    HealthPermission.getReadPermission(WeightRecord::class),
  )
  private val permissionRequestContract = PermissionController.createRequestPermissionResultContract()

  private data class DailySnapshot(
    var steps: Int? = null,
    var activeMinutes: Int? = null,
    var sleepHours: Double? = null,
    var bodyWeightKg: Double? = null,
  )

  private fun getClientOrNull(): HealthConnectClient? {
    val currentContext = context ?: return null
    val status = HealthConnectClient.getSdkStatus(currentContext)
    if (status != HealthConnectClient.SDK_AVAILABLE) {
      return null
    }
    return HealthConnectClient.getOrCreate(currentContext)
  }

  private fun resolveSdkStatusLabel(status: Int): String {
    return when (status) {
      HealthConnectClient.SDK_AVAILABLE -> "available"
      HealthConnectClient.SDK_UNAVAILABLE_PROVIDER_UPDATE_REQUIRED -> "provider_update_required"
      else -> "unavailable"
    }
  }

  @PluginMethod
  fun getSdkStatus(call: PluginCall) {
    val currentContext = context
    if (currentContext == null) {
      call.reject("CONTEXT_UNAVAILABLE")
      return
    }

    val status = HealthConnectClient.getSdkStatus(currentContext)
    val data = JSObject()
    data.put("sdkStatus", status)
    data.put("isAvailable", status == HealthConnectClient.SDK_AVAILABLE)
    data.put("status", resolveSdkStatusLabel(status))
    call.resolve(data)
  }

  @PluginMethod
  fun getPermissionsStatus(call: PluginCall) {
    val currentContext = context
    if (currentContext == null) {
      call.reject("CONTEXT_UNAVAILABLE")
      return
    }

    val sdkStatus = HealthConnectClient.getSdkStatus(currentContext)
    val client = getClientOrNull()
    if (client == null) {
      val data = JSObject()
      data.put("granted", false)
      data.put("reason", resolveSdkStatusLabel(sdkStatus))
      call.resolve(data)
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val granted = client.permissionController.getGrantedPermissions()
        val data = JSObject()
        data.put("granted", granted.containsAll(requiredPermissions))
        if (!granted.containsAll(requiredPermissions)) {
          data.put("reason", "permissions_missing")
        }
        withContext(Dispatchers.Main) {
          call.resolve(data)
        }
      } catch (_: Exception) {
        withContext(Dispatchers.Main) {
          call.reject("HEALTH_CONNECT_PERMISSION_CHECK_FAILED")
        }
      }
    }
  }

  @PluginMethod
  fun openHealthConnectSettings(call: PluginCall) {
    val currentActivity = activity
    val currentContext = context
    if (currentActivity == null || currentContext == null) {
      call.reject("ACTIVITY_UNAVAILABLE")
      return
    }

    try {
      val appPermissionsIntent = Intent("androidx.health.ACTION_MANAGE_HEALTH_PERMISSIONS")
      appPermissionsIntent.setPackage(healthConnectPackage)
      appPermissionsIntent.putExtra(Intent.EXTRA_PACKAGE_NAME, currentContext.packageName)
      appPermissionsIntent.putExtra("androidx.health.extra.PACKAGE_NAME", currentContext.packageName)
      appPermissionsIntent.putExtra("androidx.health.connect.extra.PACKAGE_NAME", currentContext.packageName)
      appPermissionsIntent.putExtra("androidx.health.connect.extra.APP_PACKAGE_NAME", currentContext.packageName)
      if (appPermissionsIntent.resolveActivity(currentActivity.packageManager) != null) {
        currentActivity.startActivity(appPermissionsIntent)

        val data = JSObject()
        data.put("opened", true)
        data.put("destination", "app_permissions")
        call.resolve(data)
        return
      }
    } catch (_: Exception) {
      // Fall through to general Health Connect settings.
    }

    try {
      val healthIntent = Intent("androidx.health.ACTION_HEALTH_CONNECT_SETTINGS")
      healthIntent.setPackage(healthConnectPackage)
      if (healthIntent.resolveActivity(currentActivity.packageManager) != null) {
        currentActivity.startActivity(healthIntent)

        val data = JSObject()
        data.put("opened", true)
        data.put("destination", "health_connect_settings")
        call.resolve(data)
        return
      }
    } catch (_: Exception) {
      // Fall through to the Play Store fallback.
    }

    try {
      val marketIntent = Intent(
        Intent.ACTION_VIEW,
        Uri.parse("market://details?id=com.google.android.apps.healthdata"),
      )
      marketIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      currentContext.startActivity(marketIntent)

      val data = JSObject()
      data.put("opened", true)
      data.put("destination", "play_store")
      call.resolve(data)
      return
    } catch (_: Exception) {
      // Fall through to the web fallback.
    }

    val webIntent = Intent(
      Intent.ACTION_VIEW,
      Uri.parse("https://play.google.com/store/apps/details?id=com.google.android.apps.healthdata"),
    )
    webIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    currentContext.startActivity(webIntent)

    val data = JSObject()
    data.put("opened", true)
    data.put("destination", "play_store_web")
    call.resolve(data)
  }

  @PluginMethod
  override fun requestPermissions(call: PluginCall) {
    val currentActivity = activity
    if (currentActivity == null) {
      call.reject("ACTIVITY_UNAVAILABLE")
      return
    }

    try {
      val intent = permissionRequestContract.createIntent(currentActivity, requiredPermissions)
      startActivityForResult(call, intent, "handlePermissionRequestResult")
    } catch (_: Exception) {
      call.reject("HEALTH_CONNECT_PERMISSION_REQUEST_FAILED")
    }
  }

  @ActivityCallback
  private fun handlePermissionRequestResult(call: PluginCall?, result: ActivityResult) {
    if (call == null) {
      return
    }

    val grantedPermissions = permissionRequestContract.parseResult(result.resultCode, result.data)
    val granted = grantedPermissions.containsAll(requiredPermissions)
    val data = JSObject()
    data.put("granted", granted)
    if (!granted) {
      data.put("reason", "permissions_denied")
    }
    call.resolve(data)
  }

  @PluginMethod
  fun syncLastDays(call: PluginCall) {
    val days = (call.getInt("days") ?: 30).coerceIn(1, 90)
    val client = getClientOrNull()
    if (client == null) {
      call.reject("HEALTH_CONNECT_UNAVAILABLE")
      return
    }

    CoroutineScope(Dispatchers.IO).launch {
      try {
        val granted = client.permissionController.getGrantedPermissions()
        if (!granted.containsAll(requiredPermissions)) {
          withContext(Dispatchers.Main) {
            call.reject("HEALTH_CONNECT_PERMISSIONS_REQUIRED")
          }
          return@launch
        }

        val utcNow = Instant.now()
        val start = utcNow.minusSeconds(days.toLong() * 24L * 60L * 60L)
        val range = TimeRangeFilter.between(start, utcNow)
        val byDate = mutableMapOf<LocalDate, DailySnapshot>()

        val steps = client.readRecords(
          ReadRecordsRequest(
            recordType = StepsRecord::class,
            timeRangeFilter = range,
          ),
        )

        steps.records.forEach { record ->
          val date = record.endTime.atZone(ZoneOffset.UTC).toLocalDate()
          val bucket = byDate.getOrPut(date) { DailySnapshot() }
          val current = bucket.steps ?: 0
          bucket.steps = current + record.count.toInt()
        }

        val sleep = client.readRecords(
          ReadRecordsRequest(
            recordType = SleepSessionRecord::class,
            timeRangeFilter = range,
          ),
        )

        sleep.records.forEach { record ->
          val date = record.endTime.atZone(ZoneOffset.UTC).toLocalDate()
          val bucket = byDate.getOrPut(date) { DailySnapshot() }
          val durationHours = (record.endTime.epochSecond - record.startTime.epochSecond).toDouble() / 3600.0
          val current = bucket.sleepHours ?: 0.0
          bucket.sleepHours = current + durationHours
        }

        val exercise = client.readRecords(
          ReadRecordsRequest(
            recordType = ExerciseSessionRecord::class,
            timeRangeFilter = range,
          ),
        )

        exercise.records.forEach { record ->
          val date = record.endTime.atZone(ZoneOffset.UTC).toLocalDate()
          val bucket = byDate.getOrPut(date) { DailySnapshot() }
          val minutes = ((record.endTime.epochSecond - record.startTime.epochSecond) / 60L).toInt()
          val current = bucket.activeMinutes ?: 0
          bucket.activeMinutes = current + maxOf(0, minutes)
        }

        val weight = client.readRecords(
          ReadRecordsRequest(
            recordType = WeightRecord::class,
            timeRangeFilter = range,
          ),
        )

        weight.records.forEach { record ->
          val date = record.time.atZone(ZoneOffset.UTC).toLocalDate()
          val bucket = byDate.getOrPut(date) { DailySnapshot() }
          bucket.bodyWeightKg = record.weight.inKilograms
        }

        val snapshots = JSArray()
        val syncedAt = Instant.now().toString()

        byDate.entries.sortedByDescending { it.key }.forEach { (date, bucket) ->
          val item = JSObject()
          val dateKey = date.toString()
          item.put("id", "health-connect-$dateKey")
          item.put("date", dateKey)
          item.put("source", "health_connect")
          item.put("provider", "Health Connect")
          item.put("steps", bucket.steps)
          item.put("activeCalories", null)
          item.put("activeMinutes", bucket.activeMinutes)
          item.put("sleepHours", bucket.sleepHours)
          item.put("restingHeartRate", null)
          item.put("bodyWeightKg", bucket.bodyWeightKg)
          item.put("bodyFatPercent", null)
          item.put("exerciseSessions", if ((bucket.activeMinutes ?: 0) > 0) 1 else 0)
          item.put("note", "Health Connect sync")
          item.put("syncedAt", syncedAt)
          snapshots.put(item)
        }

        val result = JSObject()
        result.put("source", "health_connect")
        result.put("provider", "Health Connect")
        result.put("days", days)
        result.put("snapshots", snapshots)

        withContext(Dispatchers.Main) {
          call.resolve(result)
        }
      } catch (_: Exception) {
        withContext(Dispatchers.Main) {
          call.reject("HEALTH_CONNECT_SYNC_FAILED")
        }
      }
    }
  }
}
