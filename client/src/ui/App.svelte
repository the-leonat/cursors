<script>
    import { onDestroy, afterUpdate } from "svelte";
    import Timeline from "./Timeline.svelte";
    import { dataStore } from "../ui/store";
    import cursorImage2XUrlData from "data-url:../../assets/cursor-small_2x.png";
    export let handleStart, handleStop;

    let running = false;
    let visible = false;
    let timelineProps = {
        frameCurrent: 0,
        frameLoadedTo: 0,
        frameTo: 0,
    };

    const unsubscribe = dataStore.subscribe((data) => {
        const { processing, render, track } = data;
        // const { isProcessing, from, to } = processing;
        timelineProps = {
            frameCurrent: render?.currentFrameNumber,
            frameLoadedTo: render?.highestLoadedFrameNumber,
            frameTo: render?.lastFrameNumber,
        };
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
    <div
        data-visible={visible}
        on:pointerover={() => (visible = true)}
        on:mouseleave={() => (visible = false)}
        on:blur={() => (visible = false)}
    >
        <img src={cursorImage2XUrlData} alt="cursor" />
        <Timeline {...timelineProps} />
        <!-- <span>{label}</span> -->
        <button on:click={handleClick}>{running ? "Pause" : "Start"}</button>
        <p>
            Lorem ipsum dolor sit, amet consectetur adipisicing elit. Sunt minus
            fuga mollitia aliquam dolore inventore doloribus tempore, aut illo
            enim quia expedita natus incidunt, quae nemo temporibus, id et
            perferendis?
        </p>
    </div>
{/if}

<style>
    p {
        font-weight: 100;
    }
    img {
        width: 1.5em;
        transform: scale(-1, 1);
    }
    div[data-visible="true"] {
        transform: translate(0%, 0%);
    }
    div {
        transition: transform 0.2s;
        transform: translate(80%, 80%);
        position: fixed;
        bottom: 2px;
        right: 2px;
        max-width: 40vw;
        min-height: 30vh;
        max-height: 50vh;
        z-index: 9999;
        background-color: rgba(255, 255, 255, 0.3);
        backdrop-filter: blur(10px);
        border: 1px solid rgba(0, 0, 0, 0.5);
        font-family: "Arial";
        font-weight: bold;
        border-radius: 1em;
        padding: 1em 1.5em;
    }
</style>
