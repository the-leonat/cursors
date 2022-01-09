<script>
    import { onDestroy } from "svelte";
    import { dataStore } from "../ui/store";
    export let handleStart, handleStop;

    let running = false;
    let label = "";

    const unsubscribe = dataStore.subscribe((data) => {
        const { processing, render, track } = data;
        const { isProcessing, from, to } = processing;
        const {
            currentFrameNumber,
            highestLoadedFrameNumber,
            lastFrameNumber,
            fps,
        } = render;
        const { frameNumber: trackedFrameNumber, persistedFrameNumber } = track;

        const processingText = isProcessing ? `processing (${from}/${to}}` : "";
        const renderText = `render (${currentFrameNumber}/${highestLoadedFrameNumber}/${lastFrameNumber}) fps ${fps?.toFixed()}`;
        const trackText = `track (${persistedFrameNumber}/${trackedFrameNumber})`;

        label = `${trackText} ${renderText} ${processingText}`;
    });

    onDestroy(unsubscribe);

    function handleClick() {
        running = !running;
        if (running) {
            handleStart();
        } else {
            handleStop();
        }
    }
</script>

{#if $dataStore}
    <div>
        <span>{label}</span>
        <button on:click={handleClick}>{running ? "Stop" : "Start"}</button>
    </div>
{/if}

<style>
    div {
        position: fixed;
        bottom: 0px;
        right: 0px;
        z-index: 9999;
        background: white;
        font-family: "Courier New";
        font-weight: bold;
    }
</style>
