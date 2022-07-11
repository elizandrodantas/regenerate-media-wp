const { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } = require('fs');
const { join } = require('path');

const uudiv4 = require('uuid');
const { createHash } = require('crypto');
const os = require('os');

class DATABASE {
    #path = "";
    #file = "";
    #options = {};


    /**
     * 
     * @param {{
     *  dir_name?: string,
     *  database_name?: string
     * }} options 
     */

    constructor(options = {}){
        this.#options = Util.patternOptionsContructor(options);

        this.#starting();
    }

    /**
     * @returns {void}
     */

    #starting(){
        let { dir_name, database_name } = this.#options

        this.#path = join(__dirname, '../', '../', dir_name);
        this.#file = `${database_name}.json`;
    }

    /**
     * 
     * @param {{
     *  id?: string | number,
     *  title?: string
     * }} params 
     * @param {{
     *  order: "asc" | "desc"
     * }} options
     * @returns {{
     *  status: "error" | "success",
     *  data: null | object
     * }}
     */

    findOne(find = {}, options = {}){
        if(!find || typeof find !== "object" || Array.isArray(find)) return { status: "error", data: "parameter of find invalid" }

        options = Util.patternOptionsFind(options);

        let allData = this.#read();

        if(options.order){
            if(options.order === "desc") allData.reverse();
        }
        
        let getFind = Util.findFunction(find, allData);

        if(getFind.length === 0) return { status: "success", data: null}

        return { status: "success", data: getFind[0]}
    }

    /**
     * 
     * @param {{
     *  id?: string | number,
     *  title?: string
     * }} params 
     * @param {{
     *  order: "asc" | "desc"
     * }} options
     * @returns {{
     *  status: "error" | "success",
     *  data: null | object[]
     * }}
     */

    findMany(find = {}, options = {}){
        if(!find || typeof find !== "object" || Array.isArray(find)) find = {};
        
        options = Util.patternOptionsFind(options);

        let allData = this.#read();

        if(options.order){
            if(options.order === "desc") allData.reverse();
        }
        
        let getFind = Util.findFunction(find, allData);

        if(getFind.length === 0) return { status: "success", data: null}

        return { status: "success", data: getFind };
    }

    /**
     * 
     * @param {object} object
     * @param {{
     *  timetamps?: boolean | { createdAt: string, updatedAt: string },
     *  autoId?: boolean | { type: "uuid" | "ObjectId" }
     * }} options
     * @returns {{
     *  status: "error" | "success",
     *  message?: string,
     *  data: object
     * }}
     */

    create(object, options = {}){
        if(typeof object !== "object") return { status: "error", message: "format must be in object" }
        
        options = Util.patternOptionsCreate(options);

        if(options.autoId){
            if(typeof options.autoId === "object"){
                if(options.autoId.type === "uuid"){
                    object = Object.assign({}, { _id: uudiv4() }, object);
                }else{
                    object = Object.assign({}, { _id: Util.createObjectId() }, object);
                }
            }else{
                object = Object.assign({}, { _id: Util.createObjectId() }, object);
            }
        }

        if(options.timetamps){
            if(typeof options.timetamps === "object"){
                if(options.timetamps.createdAt) object = Object.assign({}, object, { [options.timetamps.createdAt]: new Date() })
                if(options.timetamps.updatedAt) object = Object.assign({}, object, { [options.timetamps.updatedAt]: new Date() })
            }else{
                object = Object.assign({}, object, { createdAt: new Date() })
                object = Object.assign({}, object, { updatedAt: new Date() })
            }
        }

        let { status, message } = this.#write(object);

        if(status === "error") return { status: "error", message: "Error save: " + message }

        return { status: "success", data: object }
    }

    /**
     * 
     * @returns {any[]}
     */

    #read(){
        if(!existsSync(join(this.#path, this.#file))){
            this.#create();
        }

        let data = readFileSync(join(this.#path, this.#file), { encoding: "utf-8" });

        try { data = JSON.parse(data) } catch(e) {}

        if(typeof data !== "object") return this.#create(), this.#read();

        return data;
    }

    /**
     * 
     * @param {object} object
     * @returns {{
     *  status: "error" | "success",
     *  message?: string,
     *  data?: object
     * }}
     */

    #write(object = {}){
        if(typeof object !== "object") return { status: "error", message: "format must be in object" }

        let alreadyExist = this.#read();

        if(Array.isArray(object)){
            for(let i of object){
                if(i){
                    alreadyExist.push(i);
                }
            }
        }else{
            alreadyExist.push(object);
        }
        
        writeFileSync(join(this.#path, this.#file), JSON.stringify(alreadyExist, null, 2))

        return {status: "success", data: object };
    }

    #create(){
        if(existsSync(join(this.#path))){
            return writeFileSync(join(this.#path, this.#file), '[]');   
        }

        mkdirSync(join(this.#path));
        return writeFileSync(join(this.#path, this.#file), '[]')

    }
}

class Util {
    /**
     * 
     * @param {{
     *  dir_name?: string,
     *  database_name?: string
     * }} options,
     * @returns {{
     *  dir_name: string,
     *  database_name: string
     * }}
     */

    static patternOptionsContructor(options = {}){
        let pattern = {
            dir_name: "data",
            database_name: "database-p"
        }

        return Object.assign({}, pattern, options);
    }

    /**
     * 
     * @param {{
     *  timetamps?: boolean | { createdAt: string, updatedAt: string },
     *  autoId?: boolean | { type: "uuid" | "ObjectId" }
     * }} options
     * @returns {{
     *  timetamps: boolean | { createdAt: string, updatedAt: string },
     *  autoId: boolean | { type: "uuid" | "ObjectId" }
     * }}
     */

    static patternOptionsCreate(options = {}){
        let pattern = {
            timetamps: true,
            autoId: true
        }

        return Object.assign({}, pattern, options)
    }

    /**
     * 
     * @param {{
     *  order?: "asc" | "desc",
     * }} options
     * @returns {{
     *  order: "asc" | "desc",
     * }}
     */

    static patternOptionsFind(options = {}){
        let pattern = {
            order: 'asc'
        }

        return Object.assign({}, pattern, options)
    }

    static createObjectId(){
        const seconds = Math.floor(new Date()/1000).toString(16),
        machineId = createHash('md5').update(os.hostname()).digest('hex').slice(0, 6),
        processId = process.pid.toString(16).slice(0, 4).padStart(4, '0'),
        counter = process.hrtime()[1].toString(16).slice(0, 6).padStart(6, '0');

        return seconds + machineId + processId + counter;
    }

    /**
     * 
     * @param {object} find 
     * @param {object[]} data
     */

    static findFunction(find, data){
        let res = [], keys = Object.keys(find), values = Object.values(find);

        if(keys.length === 0) return data;

        for(let i = 0; i < keys.length; i++){
            res = data.filter(element => element[keys[i]] === values[i]);
        }

        return res;
    }
}

exports.DATABASE = DATABASE;