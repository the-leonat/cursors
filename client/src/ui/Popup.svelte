<script>
    import { onDestroy, afterUpdate } from "svelte";
    import Timeline from "./Timeline.svelte";
    import DebugInfo from "./DebugInfo.svelte";
    import { dataStore } from "../ui/store";
    import cursorImage2XUrlData from "data-url:../../assets/cursor-small_2x.png";
    export let handleStart, handleStop, handleReset;

    let visible = false;
    let showDebugInfo = false;
    let timelineProps = {
        frameCurrent: 0,
        frameLoadedTo: 0,
        frameTo: 0,
    };

    const unsubscribe = dataStore.subscribe((data) => {
        const { render } = data;
        timelineProps = {
            frameCurrent: render?.currentFrameNumber,
            frameLoadedTo: render?.highestLoadedFrameNumber,
            frameTo: render?.lastFrameNumber,
        };
    });

    onDestroy(unsubscribe);

    function handleClick() {
        $dataStore.isRunning = !$dataStore.isRunning;
        if ($dataStore.isRunning) {
            handleStart();
        } else {
            handleStop();
        }
    }

    function handleResetThis() {
        $dataStore.isRunning = false;
        handleReset();
    }
</script>

<div
    data-visible={visible || showDebugInfo}
    on:pointerover={() => (visible = true)}
    on:mouseleave={() => (visible = false)}
    on:blur={() => (visible = false)}
>
    <Timeline {...timelineProps}>
        <img slot="icon" src={cursorImage2XUrlData} alt="cursor" />
    </Timeline>
    <!-- <span>{label}</span> -->
    <button on:click={handleClick}
        >{$dataStore.isRunning ? "Pause" : "Start"}</button
    >
    {#if showDebugInfo}
        <button on:click={handleResetThis}>Reset</button>
    {/if}

    <DebugInfo show={showDebugInfo} />
    <h3>What is this?</h3>
    <p>The web is like</p>

    <label>
        <input type="checkbox" bind:checked={showDebugInfo} />
        show debug info
    </label>
</div>

<style>
    p {
        font-weight: 100;
    }
    img {
        width: 1.2em;
        margin-right: 0.5em;
        transform: scale(-1, 1);
    }
    div[data-visible="true"] {
        transform: translate(0%, 0%);
    }
    div {
        font-size: 16px;
        color: black;
        white-space: normal;
        overflow-y: scroll;
        transition: transform 0.2s;
        transform: translate(80%, 80%);
        position: fixed;
        bottom: 0px;
        right: 0px;
        max-width: 40vw;
        min-height: 30vh;
        max-height: 50vh;
        z-index: 9999;
        background-color: rgba(200, 200, 200, 0.5);
        backdrop-filter: blur(10px);
        /* border: 1px solid rgba(0, 0, 0, 0.1); */
        box-shadow: 0px 0px 40px rgba(0, 0, 0, 0.2);
        font-family: "Arial";
        font-weight: bold;
        border-radius: 1em;
        padding: 1em 1.5em;
    }
</style>
