const webpack = require('webpack');
const { merge } = require('webpack-merge');
const { join, isAbsolute } = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
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

const compile = (config, t, entryOptions = {}) => {
    const configs = flatten([config].map((options) => prepare(options, entryOptions)));
    const compiler = webpack(configs);

    return new Promise((p, f) => {
        compiler.run((error, stats) => {
            if (error) {
                f(error);
                return;
            }

            const outputPath = [].concat(configs)[0].output.path;
            let entryPath = join(outputPath, entryOptions.filename);

            if (isAbsolute(entryOptions.filename || '')) {
                entryPath = entryOptions.filename;
            }
            const entry = entryPath;

            if (stats.hasErrors()) {
                // log('Stat Errors', stats.toJson());
                log('Stat Errors', stats.toString());
            }

            t.is(stats.hasErrors(), false);

            p({ fs, entry, stats });
        });
    });
};

module.exports = compile;
