const { join } = require('path');

const test = require('ava');
const del = require('del');
const webpack = require('webpack');
const EntryBundleWebpackPlugin = require('../lib');
const compile = require('./helper/compile');
const outputPath = join(__dirname, '../output/');
test.beforeEach(() => del(outputPath));

test('outputs all entries of one file', async (t) => {
    const config = {
        entry: join(__dirname, './fixtures/index.js'),
        output: {
            path: outputPath,
            publicPath: 'auto',
            filename: '[name]-[contenthash].js',
            chunkFilename: 'js/[name]-[contenthash].js'
        }
    };
    const { entry } = await compile(config, t, { filename: 'main.js' });
    t.truthy(entry);
    t.deepEqual(entry, { 'main.js': 'main.js' });
});

// test('works with hashes in the filename', async (t) => {
//     const config = {
//         context: __dirname,
//         entry: {
//             one: '../fixtures/file.js'
//         },
//         output: {
//             filename: `[name].${hashLiteral}.js`,
//             path: join(outputPath, 'hashes')
//         }
//     };
//     const { entry, stats } = await compile(config, t);

//     t.deepEqual(entry, { 'one.js': `one.${stats.hash}.js` });
// });

// test('works with source maps', async (t) => {
//     const config = {
//         context: __dirname,
//         devtool: 'source-map',
//         entry: {
//             one: '../fixtures/file.js'
//         },
//         output: {
//             filename: 'build/[name].js',
//             path: join(outputPath, 'source-maps')
//         }
//     };
//     const { entry } = await compile(config, t);

//     t.deepEqual(entry, {
//         'one.js': 'build/one.js',
//         'one.js.map': 'build/one.js.map'
//     });
// });

// if (!webpack.version.startsWith('4')) {
//     test('works with asset modules', async (t) => {
//         const config = {
//             context: __dirname,
//             entry: '../fixtures/import_image.js',
//             output: {
//                 path: join(outputPath, 'auxiliary-assets'),
//                 assetModuleFilename: `images/[name].[hash:4][ext]`
//             },
//             module: {
//                 rules: [
//                     {
//                         test: /\.(svg)/,
//                         type: 'asset/resource'
//                     }
//                 ]
//             }
//         };

//         const { entry } = await compile(config, t);
//         const expected = {
//             'main.js': 'main.js',
//             'images/entry.svg': `images/entry.14ca.svg`
//         };

//         t.truthy(entry);
//         t.deepEqual(Object.keys(expected), ['main.js', 'images/entry.svg']);
//         t.deepEqual(entry['main.js'], 'main.js');
//         t.regex(entry['images/entry.svg'], /images\/entry\.[a-z|\d]{4}\.svg/);
//     });
// } else {
//     test.skip('works with asset modules', () => { });
// }
