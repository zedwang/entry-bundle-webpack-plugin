class StringBuilder {
    private res: string = "";

    public append(str: string):StringBuilder {
        this.res += str;
        return this;
    }

    public toString(): string {
        return this.res;
    }
}

export default StringBuilder;