<script>
    export let handleStart, handleStop;
    import { dataStore } from "../ui/store";

    $: ({ processing, render, track } = $dataStore);
    $: ({ isProcessing, from, to } = processing);
    $: ({ currentFrameNumber, highestLoadedFrameNumber, lastFrameNumber, fps } =
        render);
    $: ({ frameNumber: trackedFrameNumber, persistedFrameNumber } = track);

    $: processingText = isProcessing ? `processing (${from}/${to}}` : "";
    $: renderText = `render (${currentFrameNumber}/${highestLoadedFrameNumber}/${lastFrameNumber}) fps ${fps?.toFixed()}`;
    $: trackText = `track (${persistedFrameNumber}/${trackedFrameNumber})`;
    $: dataAsText = `${trackText} ${renderText} ${processingText}`;

    let running = false;

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
        <span>{dataAsText}</span>
        <span>{isProcessing}</span>
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
