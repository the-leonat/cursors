import { createClient } from "@supabase/supabase-js";

function throwIfEmpty(_var) {
    if (_var === undefined || _var === null) throw "env var not present";
    return _var;
}

export default function useStorage() {
    const apiUrl = throwIfEmpty(process.env.API_URL);
    const apiKey = throwIfEmpty(process.env.API_KEY);
    const supabase = createClient(apiUrl, apiKey, {
        fetch: abortableFetchImplementation,
    });
    // reference to the getframesrequest object
    let currentRequestPromise = null;
    let currentGetFramesAbortController = null;

    async function blockUnitCurrentRequestResolved() {
        await currentRequestPromise;
    }

    async function abortableFetchImplementation(_fetchResource, _fetchInit) {
        // save a reference to the current abort controller if fetching frames
        if (_fetchResource.endsWith("get_frames")) {
            currentGetFramesAbortController = new AbortController();
            const signal = currentGetFramesAbortController.signal;
            const fetchResult = await fetch(_fetchResource, {
                ..._fetchInit,
                signal,
            });
            currentGetFramesAbortController = null;
            return fetchResult;
        } else {
            return fetch(_fetchResource, _fetchInit);
        }
    }

    async function persist(userId, resourceId, xPath, x, y, time) {
        const { data, error } = await supabase.from("cursors").insert([
            {
                user_id: userId,
                resource_id: resourceId,
                xpath: xPath,
                x,
                y,
                time,
            },
        ]);
    }

    async function persistMultiple(_data) {
        // await blockUnitCurrentRequestResolved();
        const { data, error } = await supabase.from("cursors").insert(_data);
    }

    async function getLastFrameTimePerCursor(resourceId) {
        // await blockUnitCurrentRequestResolved();
        const { data, error } = await supabase.rpc("get_last_frame_time", {
            _resource_id: resourceId,
        });
        const singleData = data?.[0]?.data;

        if (!singleData)
            return {
                lastFrameTime: -1,
                lastFrameTimePerCursorDict: {},
            };

        const { lastFrameTime, ...dict } = singleData;

        return {
            lastFrameTime,
            lastFrameTimePerCursorDict: dict,
        };
    }

    async function getFrames(resourceId, from, to) {
        if (currentGetFramesAbortController) {
            // request already in place
            // console.log("abort", currentRequestPromise);
            currentGetFramesAbortController.abort();
        }

        const { data, error } = await supabase.rpc("get_frames", {
            _resource_id: resourceId,
            _from: from,
            _to: to,
        });
        return data;
    }

    return {
        persist,
        persistMultiple,
        getFrames,
        getLastFrameTimePerCursor,
    };
}
