import DiscordJS, { Intents, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import Web3, {response} from './web3';
dotenv.config();

const provider:string = process.env.PROVIDER!;
const token:string = process.env.TOKEN!;
const etherscanApiKey:string = process.env.ETHERSCAN_API_KEY!;

const client = new DiscordJS.Client(
    { 
        intents: [
            Intents.FLAGS.GUILDS,
            Intents.FLAGS.GUILD_MESSAGES,
            Intents.FLAGS.DIRECT_MESSAGES
        ] 
    }
);

function eventHandlerCallback(channelId:string, message:string){
    const channel = client.channels.cache.find(ch => ch.id === channelId);
    (<TextChannel> channel).send(message)
}

const web3: Web3 = new Web3(provider, etherscanApiKey, eventHandlerCallback);

client.once("ready", ()=> {
    console.log("Bot Started");
    
    initCommands();
})

function initCommands(){
    const guildId = "645621908087242762";
    const guild = client.guilds.cache.get(guildId);
    let commands;

    if(guild){
        commands = guild.commands;
    }else{
        commands = client.application?.commands;
    }

    commands?.create({
        name:"addcontract",
        description:"Fetches abi from address then adds contract to list",
        options:[
            {
                name:"address",
                description:"address of mainnet smart contract",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            }
        ]
    });
    commands?.create({
        name:"getcontracts",
        description:"Get list of added contracts"
    });
    commands?.create({
        name:"geteventsall",
        description:"Gets list of all events from given contract address",
        options:[
            {
                name:"address",
                description:"address of the contract to get events from",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            }
        ]
    });
    commands?.create({
        name:"geteventssubscribed",
        description:"Gets list of currently subscribed to events from given contract address",
        options:[
            {
                name:"address",
                description:"address of the contract to get events from",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            }
        ]
    });
    commands?.create({
        name:"eventsubscribe",
        description:"subscribe to event of given address",
        options:[
            {
                name:"address",
                description:"address of the contract that the event is from",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            },
            {
                name:"eventname",
                description:"Name of the event to subscribe to",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            }
        ]
    });
    commands?.create({
        name:"eventunsubscribe",
        description:"Unsubscribe to event of given address",
        options:[
            {
                name:"address",
                description:"address of the contract that the event is from",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            },
            {
                name:"eventname",
                description:"Name of the event to unsubscribe to",
                type: DiscordJS.Constants.ApplicationCommandOptionTypes.STRING,
                required:true
            }
        ]
    });

}

client.on("interactionCreate", async (interaction) => {
    if(!interaction.isCommand()){return;}
    
    const { commandName,options } = interaction;
    if(commandName === "addcontract"){
        const address:string = String(options.get("address")?.value);
        web3.getAbiFromContractAddress(address)
        .then((res:response) => {
            if(res.status === "1"){
                const abi = res.result;
                web3.createContract(address, abi, interaction.channelId);
                interaction.reply({content:`Successfully added contract:${address}`})
            }else{
                interaction.reply({content:"Etherscan failed to provide the abi from this address", ephemeral:true})
            }
        })
        .catch(err => {
            console.log(err);
            interaction.reply({content:"Failed to connect to etherscan api", ephemeral:true})
        })
    }
    else if(commandName === "getcontracts"){
        const contracts:Array<string> = web3.getContracts();
        if(contracts.length > 0){
            const reply:string = contracts.join("\n");
            interaction.reply({content:reply})
        }else{
            interaction.reply({content:"There are no contracts in the list, you can add one with /addcontract"})
        }
        
    }
    else if(commandName === "geteventsall"){
        const address:string = String(options.get("address")?.value);
        web3.getEventsAll(address)
        .then((events:Array<string>)=>{
            interaction.reply({content:events.join("\n")});
        })
        .catch(err=>{
            interaction.reply({content:err,ephemeral:true});
        })
    }
    else if(commandName === "geteventssubscribed"){
        const address:string = String(options.get("address")?.value);
        web3.getEventsSubscribed(address)
        .then((events:Array<string>)=>{
            interaction.reply({content:events.join("\n")});
        })
        .catch(err=>{
            interaction.reply({content:err,ephemeral:true});
        })
    }
    else if(commandName === "eventsubscribe"){
        const address:string = String(options.get("address")?.value);
        const eventName:string = String(options.get("eventname")?.value);
        web3.eventSubscribe(address, eventName)
        .then(()=>{
            interaction.reply({content:`Subscribed to ${eventName}`});
        })
        .catch(err => {
            interaction.reply({content:err,ephemeral:true});
        })
    }
    else if(commandName === "eventunsubscribe"){
        const address:string = String(options.get("address")?.value);
        const eventName:string = String(options.get("eventname")?.value);
        web3.eventUnsubscribe(address, eventName)
        .then(()=>{
            interaction.reply({content:`Unsubscribed to ${eventName}`});
        })
        .catch(err => {
            interaction.reply({content:err,ephemeral:true});
        })
    }
})

client.login(token);