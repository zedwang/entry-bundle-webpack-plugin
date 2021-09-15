const webpack = require('webpack');
const { merge } = require('webpack-merge');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const EntryBundleWebpackPlugin = require('../../lib');

const { log } = console;

const flatten = (array) => (array.length > 1 ? array : array[0]);

const prepare = (webpackOpts, entryOptions) => {
    if (Array.isArray(webpackOpts)) {
        return webpackOpts.map((opts) => applyDefaults(opts, entryOptions));
    }
    return applyDefaults(webpackOpts, entryOptions);
};

const applyDefaults = (webpackOpts, entryOptions) => {
    const defaults = {
        mode: 'production',
        optimization: { chunkIds: 'named' },
        output: {
            filename: '[name].js',
            publicPath: ''
        },
        module: {
            rules: [
                {
                    test: /\.((c|le)ss)$/,
                    use: [
                        {
                            loader: 'css-loader'
                        }
                    ]
                }
            ]
        },
        plugins: [
            new EntryBundleWebpackPlugin(entryOptions),
            new HtmlWebpackPlugin({
                minify: false
            })
        ]
        // optimization: {
        //   splitChunks: {
        //     automaticNameDelimiter: ".",
        //     minSize: 2000,
        //     maxSize: 80000,
        // },
        // }
    };
    return merge(defaults, webpackOpts);
};

function compile(config, t, entryOptions = {}) {
    const configs = flatten([config].map((options) => prepare(options, entryOptions)));
    const compiler = webpack(configs);

    return new Promise((p) => {
        compiler.run((error, stats) => {
            t.falsy(error);
            if (stats.hasErrors()) {
                log(stats.toJson());
            }
            t.is(stats.hasErrors(), false);
            p(stats);
        });
    });
}

module.exports = compile;
