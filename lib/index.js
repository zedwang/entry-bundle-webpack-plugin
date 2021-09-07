'use strict';
var __createBinding =
    (this && this.__createBinding) ||
    (Object.create
        ? function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              Object.defineProperty(o, k2, {
                  enumerable: true,
                  get: function () {
                      return m[k];
                  }
              });
          }
        : function (o, m, k, k2) {
              if (k2 === undefined) k2 = k;
              o[k2] = m[k];
          });
var __setModuleDefault =
    (this && this.__setModuleDefault) ||
    (Object.create
        ? function (o, v) {
              Object.defineProperty(o, 'default', { enumerable: true, value: v });
          }
        : function (o, v) {
              o['default'] = v;
          });
var __importStar =
    (this && this.__importStar) ||
    function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null)
            for (var k in mod)
                if (k !== 'default' && Object.prototype.hasOwnProperty.call(mod, k))
                    __createBinding(result, mod, k);
        __setModuleDefault(result, mod);
        return result;
    };
var __importDefault =
    (this && this.__importDefault) ||
    function (mod) {
        return mod && mod.__esModule ? mod : { default: mod };
    };
Object.defineProperty(exports, '__esModule', { value: true });
const webpack_1 = __importStar(require('webpack'));
const path_1 = require('path');
const Entrypoint_1 = __importDefault(require('webpack/lib/Entrypoint'));
const webpack_sources_1 = require('webpack-sources');
const StringBuilder_1 = __importDefault(require('./StringBuilder'));
const defaults = {
    filename: '[name].[hash].entry.js',
    publicPath: null,
    attrs: {}
};
class EntryBundleWebpackPlugin {
    constructor(opts) {
        this.compiler = new webpack_1.Compiler('');
        this.options = Object.assign({}, defaults, opts);
    }
    apply(compiler) {
        this.compiler = compiler;
        if (!path_1.extname(this.options.filename)) {
            this.options.filename += '.js';
        }
        const entryFileName = path_1.resolve(
            compiler.options.output.path || './',
            this.options.filename
        );
        const entryFileNameId = path_1.relative(
            compiler.options.output.path || './',
            entryFileName
        );
        const emit = this.emitHook.bind(this, {
            compiler,
            entryFileNameId,
            entryFileName,
            options: this.options
        });
        const hookOptions = {
            name: 'EntryBundleWebpackPlugin',
            stage: webpack_1.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
        };
        if (webpack_1.default.version.startsWith('4')) {
            compiler.hooks.emit.tap(hookOptions, emit);
        } else {
            compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
                compilation.hooks.processAssets.tap(hookOptions, () => emit(compilation));
            });
        }
    }
    replacePlaceholders(filename, fileContent, compilation) {
        var _a;
        if (/\[\\*([\w:]+)\\*\]/i.test(filename) === false) {
            return { path: filename, info: {} };
        }
        const hash = this.compiler.webpack.util.createHash(
            (_a =
                compilation === null || compilation === void 0
                    ? void 0
                    : compilation.outputOptions.hashFunction) !== null && _a !== void 0
                ? _a
                : 'md4'
        );
        hash.update(fileContent);
        if (compilation.outputOptions.hashSalt) {
            hash.update(compilation.outputOptions.hashSalt);
        }
        let contentHash = hash
            .digest(compilation.outputOptions.hashDigest)
            .slice(0, compilation.outputOptions.hashDigestLength);
        contentHash = typeof contentHash !== 'string' ? contentHash.toString() : contentHash;
        return compilation.getPathWithInfo(filename, {
            contentHash,
            chunk: {
                id: filename,
                hash: contentHash,
                contentHash: { contentHash }
            }
        });
    }
    urlencodePath(filePath) {
        return filePath.split('/').map(encodeURIComponent).join('/');
    }
    addFileToAssets(filename, content, compilation) {
        return Promise.resolve(new webpack_sources_1.RawSource(content)).then((rawSource) => {
            const bn = path_1.basename(filename);
            compilation.fileDependencies.add(filename);
            compilation.emitAsset(bn, rawSource);
            return bn;
        });
    }
    emitHook({ entryFileNameId, entryFileName, options }, compilation) {
        var _a, _b;
        const stats = compilation.getStats().toJson({
            all: false,
            assets: true,
            cachedAssets: true,
            ids: true,
            publicPath: true
        });
        const publicPath =
            (_a = options.publicPath !== null ? options.publicPath : stats.publicPath) === null ||
            _a === void 0
                ? void 0
                : _a.replace(/^auto/, '');
        const entryNames = Array.from(compilation.entrypoints.keys());
        const entryPointPublicPathMap = {};
        const extensionRegexp = /\.(css|js|mjs)(\?|$)/;
        for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            console.log('entryName', entryName);
            const entryPointFiles =
                ((_b = compilation.entrypoints.get(entryName)) === null || _b === void 0
                    ? void 0
                    : _b.getFiles()) || [];
            let entryPointPublicPaths = entryPointFiles.map((chunkFile) => {
                const entryPointPublicPath = publicPath + this.urlencodePath(chunkFile);
                return entryPointPublicPath;
            });
            const assets = {
                js: [],
                css: []
            };
            const output = new StringBuilder_1.default();
            output.append('!(function(){');
            entryPointPublicPaths.forEach((entryPointPublicPath) => {
                const extMatch = extensionRegexp.exec(entryPointPublicPath);
                if (!extMatch) {
                    return;
                }
                if (entryPointPublicPathMap[entryPointPublicPath]) {
                    return;
                }
                entryPointPublicPathMap[entryPointPublicPath] = true;
                const ext = extMatch[1] === 'mjs' ? 'js' : extMatch[1];
                assets[ext].push(entryPointPublicPath);
            });
            output.append(
                `var css = [${assets.css.map((f) => `"${f}"`).join(',')}], js = [${assets.js
                    .map((f) => `"${f}"`)
                    .join(',')}], publicPath = "${publicPath || ''}";`
            );
            output.append(
                `css.forEach(f => {var ol = document.createElement('link');ol.href = f;ol.rel='stylesheet';document.head.appendChild(ol);});`
            );
            output.append(
                `js.forEach(f => {var os = document.createElement('script');os.src = f;document.head.appendChild(os);})`
            );
            output.append(`})()`);
            console.log('=======');
            console.log(output);
            console.log('=======');
            try {
                const optionFilename = entryFileName.replace(/\[name\]/g, entryName);
                const optionFilenameId = entryFileNameId.replace(/\[name\]/g, entryName);
                const chunk = compilation.addChunk(optionFilename);
                chunk.filenameTemplate = optionFilenameId;
                chunk.files.add(publicPath + optionFilenameId);
                const entrypoint = new Entrypoint_1.default(optionFilenameId);
                entrypoint.setEntrypointChunk(chunk);
                compilation.namedChunkGroups.set(optionFilenameId, entrypoint);
                compilation.entrypoints.set(optionFilenameId, entrypoint);
                compilation.entrypoints.set(entryFileNameId, entrypoint);
                const realName = this.replacePlaceholders(
                    optionFilenameId,
                    output.toString(),
                    compilation
                );
                compilation.emitAsset(
                    realName.path,
                    new webpack_sources_1.RawSource(output.toString()),
                    realName.info
                );
                console.log('entry render');
            } catch (error) {
                console.log('eer', error);
            }
        }
    }
}
EntryBundleWebpackPlugin.version = 1;
module.exports = EntryBundleWebpackPlugin;
//# sourceMappingURL=index.js.map
