export const TRACKING_FPS = 4;
export const ANIMATION_FPS = 60;
export const PLUGIN_ORIGIN_VARIABLE_NAME = "lcow";
export const getScriptOrigin = () =>
    !!window[PLUGIN_ORIGIN_VARIABLE_NAME]
        ? ("webserver" as const)
        : ("extension" as const);
export const getDevicePixelRatio = () => window.devicePixelRatio || 1;
