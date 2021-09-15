import webpack, { Compiler, WebpackPluginInstance, Compilation } from "webpack";
import { extname, relative, resolve } from 'path';
// @ts-ignore
import NormalModule from 'webpack/lib/NormalModule';
// @ts-ignore
import Entrypoint from 'webpack/lib/Entrypoint';
// @ts-ignore
import {connectChunkGroupAndChunk} from 'webpack/lib/GraphHelpers'
// import { SyncWaterfallHook } from 'tapable';
import { RawSource} from 'webpack-sources';
import StringBuilder from './StringBuilder';

export interface EntryBundleOption {
    filename: string,
    publicPath: string,
    attrs: boolean | AttrOption,
}

interface AttrOption {
    css: Partial<HTMLLinkElement>,
    js: Partial<HTMLScriptElement>,
}

interface EmitHook {
    compiler: Compiler;
    options: EntryBundleOption;
}

interface EmitCompilation {
    emitAsset: Function
}

const defaults = {
    filename: "[name].bundle.js",
    publicPath: null,
    attrs: {},
}


class EntryBundleWebpackPlugin implements WebpackPluginInstance  {
    public static version = 1;
    private options: EntryBundleOption;
    private compiler: Compiler = new Compiler('');
    constructor(opts: Partial<EntryBundleOption>) {
        this.options = Object.assign({}, defaults, opts);
    }

    apply(compiler: Compiler) {

        this.compiler = compiler;

        if (!extname(this.options.filename)) {
            this.options.filename += '.js'
        }

        

        const emit = this.emitHook.bind(this, {
            compiler,
            // entryFileNameId,
            // entryFileName,
            options: this.options
        });

        const hookOptions = {
            name: 'EntryBundleWebpackPlugin',
            stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE
        };

        if (webpack.version.startsWith('4')) {
            compiler.hooks.emit.tap(hookOptions, emit);
        } else {
            compiler.hooks.thisCompilation.tap(hookOptions, (compilation) => {
                compilation.hooks.processAssets.tap(hookOptions, () => emit(compilation));
            });
        }
    }

    replacePlaceholders (filename: string, fileContent: string, compilation: Compilation) {
        if (/\[\\*([\w:]+)\\*\]/i.test(filename) === false) {
          return { path: filename, info: {} };
        }
        const hash = this.compiler.webpack.util.createHash(compilation?.outputOptions.hashFunction ?? "md4");
        hash.update(fileContent);
        if (compilation.outputOptions.hashSalt) {
          hash.update(compilation.outputOptions.hashSalt);
        }
        let contentHash = hash.digest(compilation.outputOptions.hashDigest).slice(0, compilation.outputOptions.hashDigestLength);
        contentHash = typeof contentHash !== "string" ? contentHash.toString() : contentHash;

        return compilation.getPathWithInfo(
            filename,
          {
            contentHash,
            chunk: {
                id: filename,
              hash: contentHash,
              contentHash: {contentHash}
            }
          }
        );
      }
    

    urlencodePath(filePath: string) {
        return filePath.split("/").map(encodeURIComponent).join("/");
    }

    // addFileToAssets(filename: string, content: string, compilation: Compilation) {
    //     return Promise.resolve(new RawSource(content))
    //     .then((rawSource) => {
    //         const bn = basename(filename);
    //         compilation.fileDependencies.add(filename);
    //         (compilation as EmitCompilation).emitAsset(bn, rawSource);
    //         return bn;
    //     })
    // }

    emitHook({ options }: EmitHook, compilation: Compilation) {
        const stats = compilation.getStats().toJson({
            all: false,
            assets: true,
            cachedAssets: true,
            ids: true,
            publicPath: true
        });

        

        const publicPath = (options.publicPath !== null ? options.publicPath : stats.publicPath)?.replace(/^auto/, '');
       
        const entryNames = Array.from(compilation.entrypoints.keys());
        const entryPointPublicPathMap: {[key: string]: boolean} = {};
        const extensionRegexp = /\.(css|js|mjs)(\?|$)/;
        const assets: {
            [key: string]: {[key: string]: string[]};
        } = {};
        for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            assets[entryName] = {js: [], css: []};
            const entryPointFiles = compilation.entrypoints.get(entryName)?.getFiles() || [];
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
                const ext = extMatch[1] === "mjs" ? "js" : extMatch[1];
                assets[entryName][ext].push(entryPointPublicPath);
            });
        }

        // clear
        compilation.entrypoints.clear();

        for (let i = 0; i < entryNames.length; i++) {
            const entryName = entryNames[i];
            const output = new StringBuilder();
            // head
            output.append('!(function(){');
            // body
            output.append(`var css = [${assets[entryName].css.map(f => `"${f}"`).join(',')}], js = [${assets[entryName].js.map(f => `"${f}"`).join(',')}], publicPath = "${publicPath || ""}";`)
            output.append(`css.forEach(f => {var ol = document.createElement('link');ol.href = f;ol.rel='stylesheet';document.head.appendChild(ol);});`)
            output.append(`js.forEach(f => {var os = document.createElement('script');os.src = f;document.head.appendChild(os);})`)
            // foot
            output.append(`})()`);
            
            const replacedInfo = this.replacePlaceholders(this.options.filename.replace(/\[name\]/g, entryName), output.toString(), compilation);
            // full path
            const entryFileName = resolve(this.compiler.options.output.path || './', replacedInfo.path);
            // relative name only
            const entryFileNameId = relative(this.compiler.options.output.path || './', entryFileName);

            const chunk = compilation.addChunk(entryFileNameId);
            chunk.filenameTemplate = this.options.filename;
            chunk.files.add(publicPath + entryFileNameId);
            const entrypoint = new Entrypoint(entryFileNameId);
            
            entrypoint.setEntrypointChunk(chunk);

            compilation.entrypoints.set(`${entryName}.js`, entrypoint);

            if (entrypoint.pushChunk(chunk)) {
                chunk.addGroup(entrypoint);
            }
            
            (compilation as EmitCompilation).emitAsset(entryFileNameId, new RawSource(output.toString()), replacedInfo.info)

        }
    }
}

module.exports = EntryBundleWebpackPlugin;