<script>
    import { TRACKING_FPS } from "../config";
    export let frameCurrent, frameTo, frameLoadedTo;

    $: timelineCurrent = frameCurrent / frameTo;
    $: timelineLoadedTo = Math.min(frameLoadedTo / frameTo, 1);

    $: timeTo = (frameTo || 0) / TRACKING_FPS;
    $: secondsTo = `${Math.round(timeTo % 60)}`.padStart(2, "0");
    $: timeStringTo = `${Math.floor(timeTo / 60)}:${secondsTo}`;

    $: timeCurrent = frameCurrent / TRACKING_FPS;
    $: secondsCurrent = `${Math.round(timeCurrent % 60)}`.padStart(2, "0");
    $: timeStringCurrent = `${Math.floor(timeCurrent / 60)}:${secondsCurrent}`;
</script>

<div class="timeline">
    <slot name="icon" />
    {#if frameTo < 15 * TRACKING_FPS}
        No one else was here before you.
    {:else}
        <div
            class="line"
            style={`--timeline-current: ${timelineCurrent}; --timeline-loaded-to: ${timelineLoadedTo}`}
        >
            <span class="buffered" />
            <span class="tick" />
        </div>
        <div class="timelabel">{timeStringCurrent}/{timeStringTo}</div>
    {/if}
</div>

<style>
    .timeline {
        display: flex;
        width: 100%;
        flex-direction: row;
        align-items: center;
        margin-bottom: 0.5em;
    }

    .tick {
        transition: left 0.5s;
        position: absolute;
        left: calc(var(--timeline-current, 0) * 100%);
        display: block;
        height: 0.8em;
        margin-top: -0.4em;
        margin-left: -1px;
        border-right: 2px solid black;
    }

    .buffered {
        position: absolute;
        display: block;
        width: calc(var(--timeline-loaded-to, 0) * 100%);
        border-bottom: 3px solid rgba(0, 0, 0, 0.5);
    }

    .line {
        flex-grow: 1;
        border-bottom: 1px solid black;
        /* height: 1px; */
        line-height: 2px;
        position: relative;
    }

    .timelabel {
        font-size: 0.8em;
        /* width: 5em; */
        margin-left: 0.5em;
        text-align: right;
    }
</style>
