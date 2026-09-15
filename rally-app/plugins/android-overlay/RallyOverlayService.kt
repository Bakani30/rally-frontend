package com.rallyactiver.rallyapp.overlay

import android.animation.ValueAnimator
import android.app.Service
import android.content.Intent
import android.graphics.Color
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.provider.Settings
import android.text.TextUtils
import android.util.TypedValue
import android.view.Gravity
import android.view.MotionEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateInterpolator
import android.view.animation.DecelerateInterpolator
import android.view.animation.OvershootInterpolator
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.LinearLayout
import android.widget.TextView
import com.rallyactiver.rallyapp.R
import androidx.core.app.NotificationManagerCompat
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt

class RallyOverlayService : Service() {
  private enum class IslandStage { MINIMAL, COMPACT, EXPANDED, DISMISSING }

  private val handler = Handler(Looper.getMainLooper())
  private var windowManager: WindowManager? = null
  private var binding: OverlayBinding? = null
  private var currentStage = IslandStage.MINIMAL
  private var currentSurfaceKey: String? = null
  private var latestInput: OverlayInput? = null
  private var latestRoute = "/"
  private var latestKind = "notification"

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    when (intent?.action) {
      ACTION_SHOW -> showOrUpdate(intent)
      ACTION_HIDE -> dismissOverlay(stopAfter = true)
      else -> stopSelf()
    }
    return START_STICKY
  }

  override fun onDestroy() {
    removeOverlayView()
    super.onDestroy()
  }

  private fun showOrUpdate(intent: Intent) {
    if (!Settings.canDrawOverlays(this)) {
      removeOverlayView()
      stopSelf()
      return
    }

    val input = OverlayInput.from(intent)
    latestInput = input
    latestRoute = input.route
    latestKind = input.kind
    if (input.presentation == "expanded" && input.systemNotificationKey.isNotBlank()) {
      NotificationManagerCompat.from(this).cancel(input.systemNotificationKey.hashCode())
    }

    val manager = windowManager ?: (getSystemService(WINDOW_SERVICE) as WindowManager).also {
      windowManager = it
    }
    val isNewSurface = binding == null || currentSurfaceKey != input.surfaceKey
    val currentBinding = binding ?: createOverlayBinding().also {
      binding = it
      currentStage = IslandStage.MINIMAL
      manager.addView(it.root, createLayoutParams(IslandStage.MINIMAL, input))
    }

    render(currentBinding, input)

    if (isNewSurface) {
      currentSurfaceKey = input.surfaceKey
      playIntro(manager, currentBinding, input)
    } else {
      animateStage(manager, currentBinding, input, currentStage, 120)
      scheduleAutoDismiss(input.autoDismissMs)
    }
  }

  private fun createLayoutParams(stage: IslandStage, input: OverlayInput): WindowManager.LayoutParams {
    return WindowManager.LayoutParams(
      overlayWidthPx(stage, input),
      overlayHeightPx(stage, input),
      WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY,
      WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
        WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
        WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN or
        WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS,
      PixelFormat.TRANSLUCENT,
    ).apply {
      gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
      y = overlayTopOffsetPx(stage)
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        layoutInDisplayCutoutMode = WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
      }
    }
  }

  private fun playIntro(manager: WindowManager, overlay: OverlayBinding, input: OverlayInput) {
    handler.removeCallbacks(collapseRunnable)
    handler.removeCallbacks(autoDismissRunnable)

    currentStage = IslandStage.MINIMAL
    applyExpandedVisibility(overlay, false, immediate = true)

    overlay.root.alpha = 0f
    overlay.root.scaleX = 0.72f
    overlay.root.scaleY = 0.72f
    overlay.root.translationY = -dp(10).toFloat()
    overlay.root.translationX = 0f

    overlay.root.animate()
      .alpha(1f)
      .scaleX(1f)
      .scaleY(1f)
      .translationY(0f)
      .setDuration(220L)
      .setInterpolator(OvershootInterpolator(0.68f))
      .start()

    animateStage(
      manager,
      overlay,
      input,
      if (input.presentation == "expanded") IslandStage.EXPANDED else IslandStage.COMPACT,
      220L,
    )
    scheduleAutoDismiss(input.autoDismissMs)
  }

  private fun animateStage(
    manager: WindowManager,
    overlay: OverlayBinding,
    input: OverlayInput,
    target: IslandStage,
    duration: Long,
  ) {
    val params = overlay.root.layoutParams as? WindowManager.LayoutParams ?: return
    val startWidth = params.width.takeIf { it > 0 } ?: overlayWidthPx(currentStage, input)
    val startHeight = params.height.takeIf { it > 0 } ?: overlayHeightPx(currentStage, input)
    val startY = params.y
    val targetWidth = overlayWidthPx(target, input)
    val targetHeight = overlayHeightPx(target, input)
    val targetY = overlayTopOffsetPx(target)
    val startRadius = overlay.panelBackground.cornerRadius
    val targetRadius = cornerRadiusPx(target).toFloat()
    val wasExpanded = currentStage == IslandStage.EXPANDED
    val willExpand = target == IslandStage.EXPANDED

    currentStage = target
    render(overlay, input)
    applyExpandedVisibility(overlay, wasExpanded || willExpand, immediate = false)

    ValueAnimator.ofFloat(0f, 1f).apply {
      this.duration = duration
      interpolator = DecelerateInterpolator()
      addUpdateListener { animator ->
        val t = animator.animatedValue as Float
        params.width = lerp(startWidth, targetWidth, t)
        params.height = lerp(startHeight, targetHeight, t)
        params.y = lerp(startY, targetY, t)
        overlay.panelBackground.cornerRadius = lerp(startRadius, targetRadius, t)
        overlay.expandedGroup.alpha = when {
          willExpand -> t
          wasExpanded -> 1f - t
          else -> 0f
        }
        runCatching { manager.updateViewLayout(overlay.root, params) }
      }
      doOnEnd {
        params.width = targetWidth
        params.height = targetHeight
        params.y = targetY
        overlay.panelBackground.cornerRadius = targetRadius
        overlay.expandedGroup.alpha = if (willExpand) 1f else 0f
        applyExpandedVisibility(overlay, willExpand, immediate = true)
        runCatching { manager.updateViewLayout(overlay.root, params) }
      }
      start()
    }
  }

  private fun createOverlayBinding(): OverlayBinding {
    val root = FrameLayout(this).apply {
      alpha = 0f
      elevation = dp(18).toFloat()
      isClickable = true
      setOnClickListener { handleIslandTap() }
      contentDescription = "Rally Android overlay island"
      clipChildren = false
      clipToPadding = false
    }

    val panelBackground = rounded(PANEL, cornerRadiusPx(IslandStage.MINIMAL), ORANGE, dp(1))
    val container = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      background = panelBackground
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(8), dp(6), dp(8), dp(6))
    }
    root.addView(container, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT,
    ))

    val topRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
      minimumHeight = dp(32)
    }
    container.addView(topRow, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ))

    val avatar = FrameLayout(this).apply {
      setPadding(dp(4), dp(4), dp(4), dp(4))
    }
    val avatarInitials = islandText(13f, true).apply {
      gravity = Gravity.CENTER
      setTextColor(DEEP)
    }
    avatar.addView(avatarInitials, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      FrameLayout.LayoutParams.MATCH_PARENT,
      Gravity.CENTER,
    ))
    topRow.addView(avatar, LinearLayout.LayoutParams(dp(32), dp(32)).apply {
      rightMargin = dp(7)
    })

    val textColumn = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(0, 0, 0, 0)
    }
    topRow.addView(textColumn, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f))

    val eyebrow = islandText(10f, true).apply {
      isAllCaps = true
    }
    val title = islandText(15f, true).apply {
      setTextColor(CHALK)
    }
    val body = islandText(12f, true).apply {
      setTextColor(INK_SOFT)
    }
    textColumn.addView(eyebrow)
    textColumn.addView(title, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(2) })
    textColumn.addView(body, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(1) })

    val statusCapsule = FrameLayout(this)
    val statusIcon = ImageView(this).apply {
      setImageResource(R.drawable.ic_notification_rally)
      scaleType = ImageView.ScaleType.CENTER_INSIDE
    }
    statusCapsule.addView(statusIcon, FrameLayout.LayoutParams(dp(18), dp(18), Gravity.CENTER))
    topRow.addView(statusCapsule, LinearLayout.LayoutParams(dp(30), dp(30)).apply {
      leftMargin = dp(7)
    })

    val expandedGroup = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      alpha = 0f
      visibility = View.GONE
      setPadding(0, dp(7), 0, dp(2))
    }
    container.addView(expandedGroup, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ))

    val metricsRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    expandedGroup.addView(metricsRow, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dp(44),
    ).apply { bottomMargin = dp(8) })

    val metricOne = createMetricBinding()
    val metricTwo = createMetricBinding()
    val metricStatus = createMetricBinding()
    metricsRow.addView(metricOne.root, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
      rightMargin = dp(6)
    })
    metricsRow.addView(metricTwo.root, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
      rightMargin = dp(6)
    })
    metricsRow.addView(metricStatus.root, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f))

    val actionsRow = LinearLayout(this).apply {
      orientation = LinearLayout.HORIZONTAL
      gravity = Gravity.CENTER_VERTICAL
    }
    expandedGroup.addView(actionsRow, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      dp(46),
    ))

    val secondaryAction = createActionButton()
    val primaryAction = createActionButton()
    actionsRow.addView(secondaryAction, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f).apply {
      rightMargin = dp(8)
    })
    actionsRow.addView(primaryAction, LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.MATCH_PARENT, 1f))

    val accentRail = View(this)
    root.addView(accentRail, FrameLayout.LayoutParams(
      FrameLayout.LayoutParams.MATCH_PARENT,
      dp(3),
      Gravity.BOTTOM,
    ).apply {
      leftMargin = dp(18)
      rightMargin = dp(18)
      bottomMargin = dp(7)
    })

    attachTouchBehavior(root)

    return OverlayBinding(
      root = root,
      container = container,
      panelBackground = panelBackground,
      avatar = avatar,
      avatarInitials = avatarInitials,
      eyebrow = eyebrow,
      title = title,
      body = body,
      statusCapsule = statusCapsule,
      statusIcon = statusIcon,
      expandedGroup = expandedGroup,
      metricOne = metricOne,
      metricTwo = metricTwo,
      metricStatus = metricStatus,
      primaryAction = primaryAction,
      secondaryAction = secondaryAction,
      accentRail = accentRail,
    )
  }

  private fun render(overlay: OverlayBinding, input: OverlayInput) {
    val accent = parseColor(input.accentColor, ORANGE)
    val expanded = currentStage == IslandStage.EXPANDED
    val strokeColor = if (expanded) Color.argb(84, Color.red(accent), Color.green(accent), Color.blue(accent)) else Color.argb(30, 255, 255, 255)
    overlay.panelBackground.setStroke(dp(1), strokeColor)
    overlay.avatar.background = rounded(accent, dp(999), Color.argb(66, 255, 255, 255), dp(1))
    overlay.avatarInitials.text = initialsFor(if (expanded) input.expandedTitle else input.compactTitle)
    overlay.eyebrow.text = input.eyebrow
    overlay.eyebrow.visibility = if (expanded) View.VISIBLE else View.GONE
    overlay.eyebrow.setTextColor(accent)
    overlay.title.text = if (expanded) input.expandedTitle else input.compactTitle
    overlay.body.visibility = if (expanded) View.VISIBLE else View.GONE
    overlay.body.text = if (expanded) input.expandedSubtitle else input.compactBody
    overlay.statusCapsule.background = rounded(SURFACE_STRONG, dp(999), accent, dp(1))
    overlay.statusIcon.setImageResource(iconResource(input))
    overlay.statusIcon.setColorFilter(accent)
    overlay.accentRail.background = rounded(accent, dp(999))
    overlay.accentRail.alpha = if (expanded) 0.62f else 0f
    renderMetric(overlay.metricOne, input.primaryMetricLabel, input.primaryMetricValue, accent)
    renderMetric(overlay.metricTwo, input.secondaryMetricLabel, input.secondaryMetricValue, accent)
    renderMetric(overlay.metricStatus, "STATUS", input.statusLabel, accent)
    renderAction(overlay.primaryAction, input.primaryAction, accent)
    renderAction(overlay.secondaryAction, input.secondaryAction, accent)
    overlay.root.contentDescription = "${input.eyebrow}. ${input.title}. ${input.body}"
  }

  private fun renderMetric(metric: MetricBinding, label: String, value: String, accent: Int) {
    val hasValue = label.isNotBlank() && value.isNotBlank()
    metric.root.visibility = if (hasValue) View.VISIBLE else View.INVISIBLE
    metric.label.text = label
    metric.label.setTextColor(accent)
    metric.value.text = value
  }

  private fun renderAction(button: TextView, action: ActionInput?, accent: Int) {
    if (action == null || action.label.isBlank()) {
      button.visibility = View.GONE
      button.setOnClickListener(null)
      return
    }

    button.visibility = View.VISIBLE
    button.text = action.label
    button.setTextColor(
      when (action.style) {
        "primary" -> DEEP
        "destructive" -> RED
        else -> CHALK
      },
    )
    button.background = when (action.style) {
      "primary" -> rounded(accent, dp(999), Color.argb(58, 255, 255, 255), dp(1))
      "destructive" -> rounded(Color.argb(42, 199, 63, 65), dp(999), RED, dp(1))
      else -> rounded(SURFACE_STRONG, dp(999), accent, dp(1))
    }
    button.setOnClickListener {
      performAction(action)
    }
  }

  private fun applyExpandedVisibility(overlay: OverlayBinding, visible: Boolean, immediate: Boolean) {
    overlay.expandedGroup.visibility = if (visible) View.VISIBLE else View.GONE
    if (immediate) overlay.expandedGroup.alpha = if (visible) 1f else 0f
  }

  private fun attachTouchBehavior(root: View) {
    var downX = 0f
    var downY = 0f
    var dragging = false
    var dragAxis = 0
    root.setOnTouchListener { view, event ->
      if (
        currentStage == IslandStage.EXPANDED &&
        view.height > dp(100) &&
        event.y > view.height - dp(58)
      ) {
        return@setOnTouchListener false
      }
      when (event.actionMasked) {
        MotionEvent.ACTION_DOWN -> {
          downX = event.rawX
          downY = event.rawY
          dragging = false
          dragAxis = 0
          handler.removeCallbacks(autoDismissRunnable)
          true
        }
        MotionEvent.ACTION_MOVE -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (!dragging && abs(dx) > dp(14) && abs(dx) > abs(dy)) {
            dragging = true
            dragAxis = 1
          }
          if (!dragging && -dy > dp(14) && abs(dy) > abs(dx)) {
            dragging = true
            dragAxis = 2
          }
          if (dragging) {
            if (dragAxis == 2) {
              val upwardDy = dy.coerceAtMost(0f)
              view.translationY = upwardDy
              view.alpha = (1f - min(0.42f, abs(upwardDy) / dp(140).toFloat())).coerceAtLeast(0.58f)
            } else {
              view.translationX = dx
              view.alpha = (1f - min(0.42f, abs(dx) / resources.displayMetrics.widthPixels)).coerceAtLeast(0.58f)
            }
          }
          true
        }
        MotionEvent.ACTION_UP -> {
          val dx = event.rawX - downX
          val dy = event.rawY - downY
          if (dragging && dragAxis == 2 && dy < -dp(56)) {
            dismissOverlay(stopAfter = latestKind != "run")
          } else if (dragging && dragAxis == 1 && abs(dx) > dp(80)) {
            val direction = if (dx >= 0) 1 else -1
            view.animate()
              .translationX(direction * resources.displayMetrics.widthPixels.toFloat())
              .alpha(0f)
              .setDuration(150L)
              .setInterpolator(AccelerateInterpolator())
              .withEndAction {
                removeOverlayView()
                if (latestKind != "run") stopSelf()
              }
              .start()
          } else if (!dragging && abs(dx) < dp(18) && abs(dy) < dp(18)) {
            view.performClick()
          } else {
            view.animate()
              .translationX(0f)
              .translationY(0f)
              .alpha(1f)
              .setDuration(150L)
              .setInterpolator(DecelerateInterpolator())
              .start()
            rescheduleCurrentAutoDismiss()
          }
          true
        }
        MotionEvent.ACTION_CANCEL -> {
          view.animate()
            .translationX(0f)
            .translationY(0f)
            .alpha(1f)
            .setDuration(150L)
            .setInterpolator(DecelerateInterpolator())
            .start()
          rescheduleCurrentAutoDismiss()
          true
        }
        else -> false
      }
    }
  }

  private fun handleIslandTap() {
    val overlay = binding ?: return
    val input = latestInput ?: return
    val manager = windowManager ?: return
    if (currentStage == IslandStage.COMPACT || currentStage == IslandStage.MINIMAL) {
      animateStage(manager, overlay, input, IslandStage.EXPANDED, 220L)
      scheduleCollapse()
      rescheduleCurrentAutoDismiss()
      return
    }
    openRoute()
    if (latestKind != "run") dismissOverlay(stopAfter = true)
  }

  private fun performAction(action: ActionInput) {
    if (action.type == "dismiss" || action.type == "dismiss_friend_request") {
      dismissOverlay(stopAfter = latestKind != "run")
      return
    }
    val target = action.url.takeIf { it.isNotBlank() } ?: routeToUri(latestRoute).toString()
    dismissOverlay(stopAfter = latestKind != "run") {
      openUri(target)
    }
  }

  private var currentAutoDismissMs = 0L
  private val autoDismissRunnable = Runnable {
    dismissOverlay(stopAfter = true)
  }
  private val collapseRunnable = Runnable {
    val overlay = binding ?: return@Runnable
    val input = latestInput ?: return@Runnable
    val manager = windowManager ?: return@Runnable
    if (currentStage == IslandStage.EXPANDED) {
      animateStage(manager, overlay, input, IslandStage.COMPACT, 220L)
    }
  }

  private fun scheduleCollapse() {
    handler.removeCallbacks(collapseRunnable)
    handler.postDelayed(collapseRunnable, COLLAPSE_MS)
  }

  private fun scheduleAutoDismiss(ms: Long) {
    currentAutoDismissMs = ms
    handler.removeCallbacks(autoDismissRunnable)
    if (ms > 0) handler.postDelayed(autoDismissRunnable, ms)
  }

  private fun rescheduleCurrentAutoDismiss() {
    if (currentAutoDismissMs > 0) scheduleAutoDismiss(currentAutoDismissMs)
  }

  private fun openRoute() {
    openUri(routeToUri(latestRoute).toString())
  }

  private fun openUri(value: String) {
    val uri = if (value.startsWith("rallyapp://")) Uri.parse(value) else routeToUri(value)
    val intent = Intent(Intent.ACTION_VIEW, uri).apply {
      setPackage(packageName)
      flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
    }
    runCatching { startActivity(intent) }
  }

  private fun dismissOverlay(stopAfter: Boolean, afterDismiss: (() -> Unit)? = null) {
    handler.removeCallbacks(autoDismissRunnable)
    handler.removeCallbacks(collapseRunnable)
    val root = binding?.root
    if (root == null) {
      afterDismiss?.invoke()
      if (stopAfter) stopSelf()
      return
    }
    currentStage = IslandStage.DISMISSING
    root.animate()
      .translationY(-dp(88).toFloat())
      .scaleX(0.86f)
      .scaleY(0.86f)
      .alpha(0f)
      .setDuration(160L)
      .setInterpolator(AccelerateInterpolator())
      .withEndAction {
        removeOverlayView()
        afterDismiss?.invoke()
        if (stopAfter) stopSelf()
      }
      .start()
  }

  private fun removeOverlayView() {
    handler.removeCallbacks(autoDismissRunnable)
    handler.removeCallbacks(collapseRunnable)
    val manager = windowManager
    val root = binding?.root
    if (manager != null && root != null) {
      runCatching { manager.removeView(root) }
    }
    binding = null
    currentSurfaceKey = null
    currentStage = IslandStage.MINIMAL
  }

  private fun routeToUri(route: String): Uri {
    if (route.startsWith("rallyapp://")) return Uri.parse(route)
    return Uri.parse("rallyapp://${route.trimStart('/')}")
  }

  private fun overlayWidthPx(stage: IslandStage, input: OverlayInput): Int {
    val screenWidth = resources.displayMetrics.widthPixels
    val desired = when (stage) {
      IslandStage.MINIMAL -> dp(108)
      IslandStage.COMPACT -> if (input.kind == "run") dp(164) else dp(156)
      IslandStage.EXPANDED -> screenWidth - dp(12)
      IslandStage.DISMISSING -> dp(108)
    }
    val maxWidth = when (stage) {
      IslandStage.EXPANDED -> screenWidth - dp(12)
      else -> screenWidth - dp(96)
    }
    return min(desired, maxWidth).coerceAtLeast(dp(108))
  }

  private fun overlayHeightPx(stage: IslandStage, input: OverlayInput): Int {
    return when (stage) {
      IslandStage.MINIMAL -> dp(36)
      IslandStage.COMPACT -> dp(44)
      IslandStage.EXPANDED -> when (input.surfaceType) {
        "live_run" -> dp(178)
        "friend_request" -> dp(186)
        else -> dp(198)
      }
      IslandStage.DISMISSING -> dp(36)
    }
  }

  private fun cornerRadiusPx(stage: IslandStage): Int {
    return when (stage) {
      IslandStage.EXPANDED -> dp(36)
      IslandStage.DISMISSING -> dp(999)
      else -> dp(999)
    }
  }

  private fun overlayTopOffsetPx(stage: IslandStage): Int {
    return when (stage) {
      IslandStage.EXPANDED -> dp(TOP_BLEND_EXPANDED_Y_DP)
      else -> dp(TOP_BLEND_Y_DP)
    }
  }

  private fun rounded(
    color: Int,
    radiusPx: Int,
    strokeColor: Int? = null,
    strokeWidthPx: Int = 0,
  ): GradientDrawable {
    return GradientDrawable().apply {
      shape = GradientDrawable.RECTANGLE
      cornerRadius = radiusPx.toFloat()
      setColor(color)
      if (strokeColor != null && strokeWidthPx > 0) setStroke(strokeWidthPx, strokeColor)
    }
  }

  private fun parseColor(value: String, fallback: Int): Int {
    return runCatching { Color.parseColor(value) }.getOrDefault(fallback)
  }

  private fun iconResource(input: OverlayInput): Int {
    return when (input.iconName.lowercase()) {
      "basketball" -> R.drawable.ic_overlay_basketball
      "badminton" -> R.drawable.ic_overlay_badminton
      "run", "run-fast", "running", "pause", "send-check-outline" -> R.drawable.ic_overlay_run
      "account-plus", "friend", "friends" -> R.drawable.ic_overlay_friend
      else -> if (input.surfaceType == "friend_request") {
        R.drawable.ic_overlay_friend
      } else if (input.surfaceType == "live_run") {
        R.drawable.ic_overlay_run
      } else {
        R.drawable.ic_overlay_match
      }
    }
  }

  private fun initialsFor(value: String): String {
    val cleaned = value
      .replace(Regex("[^A-Za-z0-9 ]"), " ")
      .trim()
    if (cleaned.isBlank()) return "RY"
    val parts = cleaned.split(Regex("\\s+")).filter { it.isNotBlank() }
    val initials = if (parts.size >= 2) {
      "${parts[0].first()}${parts[1].first()}"
    } else {
      parts.first().take(2)
    }
    return initials.uppercase()
  }

  private fun islandText(sizeSp: Float, bold: Boolean): TextView {
    return TextView(this).apply {
      setTextSize(TypedValue.COMPLEX_UNIT_SP, sizeSp)
      typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
      maxLines = 1
      ellipsize = TextUtils.TruncateAt.END
      includeFontPadding = false
    }
  }

  private fun createMetricBinding(): MetricBinding {
    val root = LinearLayout(this).apply {
      orientation = LinearLayout.VERTICAL
      gravity = Gravity.CENTER_VERTICAL
      setPadding(dp(10), 0, dp(10), 0)
      background = rounded(SURFACE_STRONG, dp(999), LINE_STRONG, dp(1))
    }
    val label = islandText(9f, true)
    val value = islandText(12f, true).apply {
      setTextColor(CHALK)
    }
    root.addView(label)
    root.addView(value, LinearLayout.LayoutParams(
      LinearLayout.LayoutParams.MATCH_PARENT,
      LinearLayout.LayoutParams.WRAP_CONTENT,
    ).apply { topMargin = dp(1) })
    return MetricBinding(root, label, value)
  }

  private fun createActionButton(): TextView {
    return islandText(13f, true).apply {
      gravity = Gravity.CENTER
      minHeight = dp(44)
      isClickable = true
      isFocusable = false
      setPadding(dp(12), 0, dp(12), 0)
      background = rounded(SURFACE_STRONG, dp(999), LINE_STRONG, dp(1))
    }
  }

  private fun dp(value: Int): Int {
    return (value * resources.displayMetrics.density).roundToInt()
  }

  private fun lerp(start: Int, end: Int, t: Float): Int {
    return (start + ((end - start) * t)).roundToInt()
  }

  private fun lerp(start: Float, end: Float, t: Float): Float {
    return start + ((end - start) * t)
  }

  private fun ValueAnimator.doOnEnd(block: () -> Unit) {
    addListener(object : android.animation.AnimatorListenerAdapter() {
      override fun onAnimationEnd(animation: android.animation.Animator) {
        block()
      }
    })
  }

  private data class OverlayInput(
    val kind: String,
    val surfaceType: String,
    val surfaceKey: String,
    val presentation: String,
    val systemNotificationKey: String,
    val eyebrow: String,
    val title: String,
    val body: String,
    val compactTitle: String,
    val compactBody: String,
    val expandedTitle: String,
    val expandedSubtitle: String,
    val accentColor: String,
    val route: String,
    val iconName: String,
    val avatarUrl: String,
    val statusLabel: String,
    val primaryMetricLabel: String,
    val primaryMetricValue: String,
    val secondaryMetricLabel: String,
    val secondaryMetricValue: String,
    val progress: Double,
    val expiresAt: String,
    val autoDismissMs: Long,
    val primaryAction: ActionInput?,
    val secondaryAction: ActionInput?,
  ) {
    companion object {
      fun from(intent: Intent): OverlayInput {
        val title = intent.getStringExtra(EXTRA_TITLE) ?: "Rally Island"
        val body = intent.getStringExtra(EXTRA_BODY) ?: "Ready"
        val kind = intent.getStringExtra(EXTRA_KIND) ?: "notification"
        return OverlayInput(
          kind = kind,
          surfaceType = intent.getStringExtra(EXTRA_SURFACE_TYPE) ?: kind,
          surfaceKey = intent.getStringExtra(EXTRA_SURFACE_KEY) ?: title,
          presentation = intent.getStringExtra(EXTRA_PRESENTATION) ?: "compact",
          systemNotificationKey = intent.getStringExtra(EXTRA_SYSTEM_NOTIFICATION_KEY) ?: "",
          eyebrow = intent.getStringExtra(EXTRA_EYEBROW) ?: "RALLY",
          title = title,
          body = body,
          compactTitle = intent.getStringExtra(EXTRA_COMPACT_TITLE) ?: title,
          compactBody = intent.getStringExtra(EXTRA_COMPACT_BODY) ?: body,
          expandedTitle = intent.getStringExtra(EXTRA_EXPANDED_TITLE) ?: title,
          expandedSubtitle = intent.getStringExtra(EXTRA_EXPANDED_SUBTITLE) ?: body,
          accentColor = intent.getStringExtra(EXTRA_ACCENT_COLOR) ?: "#eb773c",
          route = intent.getStringExtra(EXTRA_ROUTE) ?: "/",
          iconName = intent.getStringExtra(EXTRA_ICON_NAME) ?: "trophy-award",
          avatarUrl = intent.getStringExtra(EXTRA_AVATAR_URL) ?: "",
          statusLabel = intent.getStringExtra(EXTRA_STATUS_LABEL) ?: "",
          primaryMetricLabel = intent.getStringExtra(EXTRA_PRIMARY_METRIC_LABEL) ?: "",
          primaryMetricValue = intent.getStringExtra(EXTRA_PRIMARY_METRIC_VALUE) ?: "",
          secondaryMetricLabel = intent.getStringExtra(EXTRA_SECONDARY_METRIC_LABEL) ?: "",
          secondaryMetricValue = intent.getStringExtra(EXTRA_SECONDARY_METRIC_VALUE) ?: "",
          progress = intent.getDoubleExtra(EXTRA_PROGRESS, -1.0),
          expiresAt = intent.getStringExtra(EXTRA_EXPIRES_AT) ?: "",
          autoDismissMs = intent.getLongExtra(EXTRA_AUTO_DISMISS_MS, 0L),
          primaryAction = ActionInput.from(intent, "Primary"),
          secondaryAction = ActionInput.from(intent, "Secondary"),
        )
      }
    }
  }

  private data class ActionInput(
    val type: String,
    val label: String,
    val style: String,
    val url: String,
  ) {
    companion object {
      fun from(intent: Intent, prefix: String): ActionInput? {
        val label = intent.getStringExtra("${prefix}ActionLabel") ?: return null
        return ActionInput(
          type = intent.getStringExtra("${prefix}ActionType") ?: "open",
          label = label,
          style = intent.getStringExtra("${prefix}ActionStyle") ?: "secondary",
          url = intent.getStringExtra("${prefix}ActionUrl") ?: "",
        )
      }
    }
  }

  private data class MetricBinding(
    val root: LinearLayout,
    val label: TextView,
    val value: TextView,
  )

  private data class OverlayBinding(
    val root: FrameLayout,
    val container: LinearLayout,
    val panelBackground: GradientDrawable,
    val avatar: FrameLayout,
    val avatarInitials: TextView,
    val eyebrow: TextView,
    val title: TextView,
    val body: TextView,
    val statusCapsule: FrameLayout,
    val statusIcon: ImageView,
    val expandedGroup: LinearLayout,
    val metricOne: MetricBinding,
    val metricTwo: MetricBinding,
    val metricStatus: MetricBinding,
    val primaryAction: TextView,
    val secondaryAction: TextView,
    val accentRail: View,
  )

  companion object {
    const val ACTION_SHOW = "com.rallyactiver.rallyapp.overlay.SHOW"
    const val ACTION_HIDE = "com.rallyactiver.rallyapp.overlay.HIDE"
    const val EXTRA_KIND = "kind"
    const val EXTRA_SURFACE_TYPE = "surfaceType"
    const val EXTRA_SURFACE_KEY = "surfaceKey"
    const val EXTRA_PRESENTATION = "presentation"
    const val EXTRA_SYSTEM_NOTIFICATION_KEY = "systemNotificationKey"
    const val EXTRA_EYEBROW = "eyebrow"
    const val EXTRA_TITLE = "title"
    const val EXTRA_BODY = "body"
    const val EXTRA_COMPACT_TITLE = "compactTitle"
    const val EXTRA_COMPACT_BODY = "compactBody"
    const val EXTRA_EXPANDED_TITLE = "expandedTitle"
    const val EXTRA_EXPANDED_SUBTITLE = "expandedSubtitle"
    const val EXTRA_ACCENT_COLOR = "accentColor"
    const val EXTRA_ROUTE = "route"
    const val EXTRA_ICON_NAME = "iconName"
    const val EXTRA_AVATAR_URL = "avatarUrl"
    const val EXTRA_STATUS_LABEL = "statusLabel"
    const val EXTRA_PRIMARY_METRIC_LABEL = "primaryMetricLabel"
    const val EXTRA_PRIMARY_METRIC_VALUE = "primaryMetricValue"
    const val EXTRA_SECONDARY_METRIC_LABEL = "secondaryMetricLabel"
    const val EXTRA_SECONDARY_METRIC_VALUE = "secondaryMetricValue"
    const val EXTRA_PROGRESS = "progress"
    const val EXTRA_EXPIRES_AT = "expiresAt"
    const val EXTRA_AUTO_DISMISS_MS = "autoDismissMs"

    private const val COLLAPSE_MS = 2800L
    private const val TOP_BLEND_Y_DP = 2
    private const val TOP_BLEND_EXPANDED_Y_DP = 3
    private const val PANEL = 0xF6000000.toInt()
    private const val SURFACE_STRONG = 0x2E2D3836
    private const val LINE_STRONG = 0x3DD1E0DD
    private const val CHALK = Color.WHITE
    private const val INK_SOFT = 0xFFD1E0DD.toInt()
    private const val ORANGE = 0xFFEB773C.toInt()
    private const val RED = 0xFFC73F41.toInt()
    private const val DEEP = 0xFF4D2323.toInt()
  }
}
