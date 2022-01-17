const sveltePreprocess = require("svelte-preprocess");

const config = {
    compilerOptions: {
        css: true,
        enableSourcemap: false,
    },
    preprocess: sveltePreprocess({
        postcss: {
            plugins: [require("autoprefixer")({ browsers: "> 1%" })],
        },
    }),
};

module.exports = config;
