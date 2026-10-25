package com.xingfu.kitchen;

import android.content.pm.ActivityInfo;
import android.content.res.Configuration;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private int appliedOrientation = Integer.MIN_VALUE;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        applyOrientation();
    }

    @Override
    public void onConfigurationChanged(Configuration newConfig) {
        super.onConfigurationChanged(newConfig);
        // 折叠屏展开 / 收起时 smallestScreenWidthDp 会变，跟着重算一次
        applyOrientation();
    }

    /**
     * 手机保持竖屏（单手点菜的体验更稳），平板和折叠屏展开后跟随系统横竖屏。
     *
     * 这里必须用 smallestScreenWidthDp 判断，而不是当前宽高：
     * 它是屏幕短边的 dp，横竖屏切换时不变，只有换成大屏设备（或折叠屏展开）才会跨过 600。
     * 之前 manifest 里写死 screenOrientation="portrait"，在平板上会被系统排成一列 16:9 的竖条、
     * 两侧补模糊背景——这就是必须改到代码里按设备判断的原因。
     */
    private void applyOrientation() {
        boolean large = getResources().getConfiguration().smallestScreenWidthDp >= 600;
        int want = large
                ? ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
                : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT;
        if (want == appliedOrientation) return;
        appliedOrientation = want;
        setRequestedOrientation(want);
    }
}
