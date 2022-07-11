const request = require('request-promise');

const {
    COOKIE_AUTH,
    SITE_URL,
    WP_NONCE
} = process.env;

class CORE {
    util = new Util();

    #page = 1;

    /**
     * 
     * @returns {number}
     */

    getPage(){
        return this.#page;
    }

    /**
     * 
     * @param {number} length 
     * @returns {number}
     */

    setPage(length = this.#page){
        return this.#page = length, this.#page;
    }

    /**
     * 
     * @returns {number}
     */

    addPage(){
        return this.#page++, this.#page;
    }

    /**
     * 
     * @param {false | number} page
     * @returns {Promise<{
     *  status: "error" | "finish" | "success",
     *  response: string | {id: number}[]
     * }>}
     */

    async getListIdMedia(page = false){
        if(!page) page = this.#page;
        
        try{
            let data = await request.get(SITE_URL + '/wp-json/wp/v2/media', {
                qs: {
                    page,
                    per_page: 100,
                    _fields: "id",
                    orderby: "id",
                    is_regeneratable: 1,
                    exclude_site_icons: 1,
                    order: "asc"
                },
                json: true
            });

            return { status: "success", response: data }
        }catch(e){
            let { response } = e;

            if(response && response.body){
                let { body } = response;

                try { body = JSON.parse(body) } catch(e) {}

                if(typeof body === "object"){
                    let { code } = body;

                    if(code){
                        if(code === "rest_post_invalid_page_number") return { status: "finish", response: null }
                        return { status: "error", response: code }
                    }

                }
            }  
    
            return { status: "error", response: "unknown" }
        }
    }

    /**
     * 
     * @param {number | string} id
     * @returns {Promise<{
     *  status: "error" | "success" | "rest_forbidden" | "regenerate_thumbnails_regenerator_file_not_found",
     *  response: string | {file_name: string, file_date: string}
     * }>}
     */

    async regenerate(id){
        if(!id) return { status: "error", response: "id required" }

        try{
            let data = await request.get(SITE_URL + '/wp-json/regenerate-thumbnails/v1/regenerate/' + id, {
                qs: {
                    only_regenerate_missing_thumbnails: true,
                    delete_unregistered_thumbnail_files: true,
                    update_usages_in_posts: false
                },
                headers: {
                    'X-WP-Nonce': WP_NONCE,
                    cookie: COOKIE_AUTH
                },
                json: true
            });

            let { name, relative_path } = data;

            return { status: "success", response: {
                file_name: name,
                file_path: relative_path
            }}
        }catch(e){
            let { response } = e;

            if(response && response.body){
                let { body } = response;

                try { body = JSON.parse(body) } catch(e) {}

                if(typeof body === "object"){
                    let { code } = body;
  
                    if(code){
                        if(code === "rest_forbidden")
                            return { status: "error", response: "forbidden" }
                        if(code === "regenerate_thumbnails_regenerator_file_not_found")
                            return { status: "file_not_found", response: {
                                file_name: body.data.attachment.post_title,
                                file_path: body.data.attachment.guid.split('uploads/')[1]
                            }}
                        
                        return { status: "error", response: code }
                    }

                }
            }  
     
            return { status: "error", response: "unknown" }
        }
    }
    
}

class Util {
    /**
     * 
     * @param {string} length 
     * @returns {string}
     */

    nonce(length = 10){
        var text = "";
        var possible = "abcdef0123456789";
        for(var i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }
}

exports.CORE = CORE;