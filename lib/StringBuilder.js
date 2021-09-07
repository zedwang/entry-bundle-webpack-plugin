'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
class StringBuilder {
    constructor() {
        this.res = '';
    }
    append(str) {
        this.res += str;
        return this;
    }
    toString() {
        return this.res;
    }
}
exports.default = StringBuilder;
//# sourceMappingURL=StringBuilder.js.map
