require('dotenv').config();
const { CORE } = require('./core');
const { DATABASE } = require('./database');

const chalk = require('chalk');

const Core = new CORE();
const Database = new DATABASE({ dir_name: "data", database_name: "info" });

var rate = 0, count = 0;

function job(array){
    return new Promise(async (resolve, reject) => {
        try{
            for(let indice of array){
                if(typeof indice === "object"){
                    let { id } = indice;
                    let { data } = Database.findOne({ id }, { order: "desc" });

                    if(data !== null){
                        let { status, file_name, file_path } = data;
                        count++

                        if(status === false){
                            console.log(chalk`Arquivo {red ${file_name}} não foi encontrado no diretorio {yellow ${file_path}}! [{magenta ${count}}]`);

                        }else{
                            console.log(chalk`Arquivo {green ${file_name}} foi redimensionado no diretorio {yellow ${file_path}}! [{magenta ${count}}]`);
                        }
                    }else{
                        let { status: status_2, response: res_2 } = await Core.regenerate(id);

                        if(status_2 === "success" || status_2 === "file_not_found"){
                            let { file_name, file_path } = res_2;
                            count++
                            
                            if(status_2 === "file_not_found"){
                                console.log(chalk`Arquivo {red ${file_name}} não foi encontrado no diretorio {yellow ${file_path}}! [{magenta ${count}}]`);
                                Database.create({ status: false, file_name, file_path, id });
                            }else{
                                console.log(chalk`Arquivo {green ${file_name}} foi redimensionado no diretorio {yellow ${file_path}}! [{magenta ${count}}]`);
                                Database.create({ status: true, file_name, file_path, id });
                            }
                        }else{
                            if(status_2 === "rest_forbidden"){
                                console.log(chalk`{bgGreen *} Não autenticado!`);
                                break;
                            }

                            if(status_2 === "error"){
                                console.log(chalk`{red Erro desconhecido} [{yellow ${res_2}}] [{magenta ${count}}]`);
                                rate++;
                            }
                        }
                    }
                }
            }

            resolve('success');
        }catch(e){ reject(e) }
    });
}

async function run(){
    console.log(chalk`{magenta --------------------------}`);
    console.log(chalk`{magenta *} {cyan Processo foi iniciando} {magenta *}`);
    console.log(chalk`{magenta --------------------------}`);

    for(;;){
        let { status: status_1, response: res_1 } = await Core.getListIdMedia(Core.getPage());
 
        if(status_1 === "success"){
            console.log(chalk`{bgBlue [!]} Novas midias encontradas :) ${res_1.length}`);
            await job(res_1);
            console.log(chalk`{bgBlue [!]} Buscando novas midias...`);
            // break
            Core.addPage();
        }else{
            if(status_1 === "finish"){
                console.log(chalk`{bgGreen *} Fim da lista, total: [{magenta ${count}}]`);
                break;
            }

            if(status_1 === "error"){
                console.log(chalk`{bgRed x} Erro get list idMedia: {yellow [${res_1}]}`);
                Core.addPage();
                rate++;
            }
        }

        if(rate > 15){
            console.log(chalk`{bgRed Limite de rate exedido!}`);
            break;
        }
    }
}

run();