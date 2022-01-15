<script>
    import { dataStore } from "../ui/store";

    export let show = false;
</script>

{#if show}
    <p>
        <i>
            Cursorcount: {$dataStore.render.currentCursorCount}<br />
            FPS: {($dataStore.render?.fps || 0).toFixed()}<br />
            Render frame {$dataStore.render.currentFrameNumber}/{$dataStore
                .render.highestLoadedFrameNumber}<br />
            {$dataStore.loading?.isLoading ? "Loading" : "Last Loaded"} frames {$dataStore
                .loading?.from}/{$dataStore.loading?.to}<br />
            Tracked frame {$dataStore.track.persistedFrameNumber}/{$dataStore
                .track.frameNumber}
        </i>
    </p>
{/if}

<style>
    p {
        font-size: 0.7em;
        font-weight: 200;
    }
</style>
