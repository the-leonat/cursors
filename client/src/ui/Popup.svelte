<script>
    import { onDestroy, onMount } from "svelte";
    import Timeline from "./Timeline.svelte";
    import DebugInfo from "./DebugInfo.svelte";
    import { dataStore } from "../ui/store";
    import cursorImage2XUrlData from "data-url:../../assets/cursor-small_2x.png";
    import iAWriterFont from "data-url:../../assets/fonts/iAWriterQuattroS-Regular.woff";
    import { getScriptOrigin, TRACKING_FPS } from "../config";
    export let handleStart, handleStop, handleReset;

    // append font
    onMount(async () => {
        var newStyle = document.createElement("style");
        newStyle.appendChild(
            document.createTextNode(
                `@font-face{font-family: IAWriter; src: url("${iAWriterFont}") format("woff")}`
            )
        );
        document.body.appendChild(newStyle);
    });

    let visible = false;
    let showDebugInfo = false;
    let timelineProps = {
        frameCurrent: 0,
        frameLoadedTo: 0,
        frameTo: 0,
    };
    let scriptOrigin = getScriptOrigin();
    $: noCursorsToDisplay =
        $dataStore?.render?.lastFrameNumber < 15 * TRACKING_FPS;

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
    class="popup"
    data-visible={visible || showDebugInfo}
    on:pointerover={() => (visible = true)}
    on:mouseleave={() => (visible = false)}
    on:blur={() => (visible = false)}
>
    <Timeline {...timelineProps}>
        <div slot="icon" class="icon">
            <img src={cursorImage2XUrlData} alt="cursor" />
            <!-- <b>{$dataStore?.render?.currentCursorCount || ""}</b> -->
        </div>
    </Timeline>
    <!-- <span>{label}</span> -->
    {#if showDebugInfo}
        <button on:click={handleResetThis}>Reset</button>
    {/if}

    <DebugInfo show={showDebugInfo} />

    <p>
        Cursors is a program to visualize historic browsing data. It anonymously
        records all cursors from everyone visiting this page and displays them
        as an overlay to you. For more information visit
        <a target="blank" href="http://cursors.by.leonat.de"
            >cursors.by.leonat.de</a
        >
    </p>

    {#if noCursorsToDisplay}
        <p>
            You are the first cursor here. So there is nothing more to see than
            yourself. If you reload the page after 30 seconds you should see
            your own historic cursor.
        </p>
    {/if}

    <p class="italic">
        {#if scriptOrigin === "webserver"}
            The website owner activated the plugin on this page.
        {/if}
        {#if scriptOrigin === "extension"}
            You activated the plugin on this page by clicking the browser
            extension. It will stay active in this tab until you browse to
            another domain.
        {/if}
        {#if !noCursorsToDisplay}
            <br /> You can toggle the plugin any time by clicking
            <button on:click={handleClick}
                >{$dataStore.isRunning ? "Pause" : "Start"}</button
            >
        {/if}
    </p>
    {#if !noCursorsToDisplay}
        <label>
            <input type="checkbox" bind:checked={showDebugInfo} />
            debug
        </label>
    {/if}
</div>

<style>
    p {
        font-weight: 100;
    }

    .icon img {
        width: 1.2em;
        margin-right: 0.5em;
        transform: scale(-1, 1);
        image-rendering: -webkit-optimize-contrast;
    }

    a,
    a:visited,
    a:active {
        color: black;
    }

    label {
        color: gray;
    }

    p.italic {
        font-style: italic;
    }

    button {
        font-family: inherit;
        /* font-size: 1em; */
    }
    div.popup[data-visible="true"] {
        transform: translate(0%, 0%);
    }
    div.popup {
        /* font settings */
        font-family: "IAWriter", sans-serif;
        font-weight: normal;
        font-size: 16px;
        line-height: 1.4em;
        /* font-size: clamp(18px, 2.4vw, 24px); */

        will-change: transform;

        color: black;
        text-rendering: optimizeLegibility;
        -webkit-font-smoothing: antialiased;

        white-space: normal;
        overflow-y: scroll;
        transition: transform 0.2s;
        transform: translate(82%, 82%);
        position: fixed;
        bottom: 0px;
        right: 0px;
        max-width: 40vw;
        min-width: 200px;
        max-height: 70vh;
        z-index: 9999;
        background-color: rgba(200, 200, 200, 0.5);
        backdrop-filter: blur(10px);
        /* border: 1px solid rgba(0, 0, 0, 0.1); */
        box-shadow: 0px 0px 40px rgba(0, 0, 0, 0.2);
        border-radius: 1em;
        padding: 1em 1.5em;
    }
</style>
