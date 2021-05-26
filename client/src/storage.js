import { createClient } from "@supabase/supabase-js";

export default function useStorage() {
    const url = "https://vhlhmkunpdsosqdsnmru.supabase.co";
    // public anon key
    const key =
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMTk1Mzc2MiwiZXhwIjoxOTM3NTI5NzYyfQ.WQw7TAAcgkBh_NgixX6S0vgy08oBfQlRxBwXQwloJ7s";
    const supabase = createClient(url, key);

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

    async function get(resourceId, from, to) {
        const { data, error } = await supabase
            // .from("cursors")
            // .select(`user_id, x, y, time, xpath`)
            // .filter("resource_id", "eq", resourceId)
            // .gte("time", from)
            // .lt("time", to)
            // .order("time");
            .rpc("get_frames", {
                _resource_id: resourceId,
                _from: from,
                _to: to,
            });

        return data;
    }

    return {
        persist,
        get,
    };
}
