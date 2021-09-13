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
    filename: '[name].bundle.js',
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
        if (!(0, path_1.extname)(this.options.filename)) {
            this.options.filename += '.js';
        }
        const emit = this.emitHook.bind(this, {
            compiler,
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
    replacePlaceholders(filename, fileContent, compilation, entryName) {
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
        const name = filename.replace(/\[name\]/g, entryName);
        return compilation.getPathWithInfo(name, {
            contentHash,
            chunk: {
                id: name,
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
            const bn = (0, path_1.basename)(filename);
            compilation.fileDependencies.add(filename);
            compilation.emitAsset(bn, rawSource);
            return bn;
        });
    }
    emitHook({ options }, compilation) {
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
        const assets = {};
        for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            assets[entryName] = { js: [], css: [] };
            const entryPointFiles =
                ((_b = compilation.entrypoints.get(entryName)) === null || _b === void 0
                    ? void 0
                    : _b.getFiles()) || [];
            let entryPointPublicPaths = entryPointFiles.map((chunkFile) => {
                const entryPointPublicPath = publicPath + this.urlencodePath(chunkFile);
                return entryPointPublicPath;
            });
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
                assets[entryName][ext].push(entryPointPublicPath);
            });
        }
        compilation.entrypoints.clear();
        for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            const output = new StringBuilder_1.default();
            output.append('!(function(){');
            output.append(
                `var css = [${assets[entryName].css
                    .map((f) => `"${f}"`)
                    .join(',')}], js = [${assets[entryName].js
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
            const replacedInfo = this.replacePlaceholders(
                this.options.filename,
                output.toString(),
                compilation,
                entryName
            );
            const entryFileName = (0, path_1.resolve)(
                this.compiler.options.output.path || './',
                replacedInfo.path
            );
            const entryFileNameId = (0, path_1.relative)(
                this.compiler.options.output.path || './',
                entryFileName
            );
            const chunk = compilation.addChunk(entryFileNameId);
            chunk.filenameTemplate = this.options.filename;
            chunk.files.add(publicPath + entryFileNameId);
            const entrypoint = new Entrypoint_1.default(entryFileNameId);
            entrypoint.setEntrypointChunk(chunk);
            compilation.entrypoints.set(entryFileNameId, entrypoint);
            if (entrypoint.pushChunk(chunk)) {
                chunk.addGroup(entrypoint);
            }
            compilation.emitAsset(
                entryFileNameId,
                new webpack_sources_1.RawSource(output.toString()),
                replacedInfo.info
            );
        }
    }
}
EntryBundleWebpackPlugin.version = 1;
module.exports = EntryBundleWebpackPlugin;
//# sourceMappingURL=index.js.map
