//imports
import { ethers } from "ethers";
import axios from 'axios'

export interface response{
    status:string,
    message:string,
    result:Array<Object>
}

interface contractListener{
    contract: ethers.Contract,
    eventsAll: Array<event>,
    eventsSubscribed: Array<event>,
    channelId:string
}

interface eventInput{
    indexed:Boolean,
    name:string,
    type:string
}

interface event{
    anonymous:Boolean,
    inputs:Array<eventInput>,
    name:string,
    type:string
}

export default class Web3{
    provider: ethers.providers.WebSocketProvider;
    etherscanApiKey:string;
    contractListeners: Array<contractListener> = [];
    eventHandleCallback:Function;


    constructor(provider:string, etherscanApiKey:string, eventHandleCallback:Function){
        this.provider = new ethers.providers.WebSocketProvider(provider);
        this.etherscanApiKey = etherscanApiKey;
        this.eventHandleCallback = eventHandleCallback;
    }

    createContract(address:string, abi:Array<Object>, channelId:string){
        const contract = new ethers.Contract(address, abi, this.provider);
        //if contract not in list then add to list
        if(!this.contractListeners.some(item => item.contract.address === contract.address)){
            this.contractListeners.push(
                {
                    contract:contract,
                    eventsAll:this.getEventsFromAbi(abi),
                    eventsSubscribed: [],
                    channelId
                }
            );
        }
    }

    private eventHandler(){
        const event = arguments[arguments.length-1];
        const eventName = event.event;
        const address = event.address;
        const clIndex = this.contractListeners.findIndex(cl => cl.contract.address === address);
        if(clIndex >= 0){
            const eventIndex = this.contractListeners[clIndex].eventsSubscribed.findIndex(event => event.name === eventName);
            if(eventIndex >= 0){
                const eventInputs:Array<eventInput> = this.contractListeners[clIndex].eventsSubscribed[eventIndex].inputs;
                let stringBuilder = `\n>>> ${this.contractListeners[clIndex].eventsSubscribed[eventIndex].name} - ${this.contractListeners[clIndex].contract.address}\n`
                for(let i=0;i < eventInputs.length;i++){
                    stringBuilder += `${eventInputs[i].name}: ${arguments[i]} \n`;
                }
                this.eventHandleCallback(this.contractListeners[clIndex].channelId, stringBuilder);
            }
        }
    }

    eventUnsubscribe(address:string,eventName:string): Promise<void>{
        return new Promise<void>((resolve,reject)=>{
            const contractIndex = this.contractListeners.findIndex(cl => cl.contract.address === address);
            if(contractIndex >= 0){
                const contractListener: contractListener = this.contractListeners[contractIndex];
                const eventIndex = contractListener.eventsSubscribed.findIndex(event => event.name.toLowerCase() === eventName.toLowerCase());
                if(eventIndex >= 0){
                    const event = contractListener.eventsSubscribed[eventIndex]
                    this.contractListeners[contractIndex].contract.off(event.name, this.eventHandler);
                    this.contractListeners[contractIndex].eventsSubscribed.splice(eventIndex, 1)
                    resolve();
                }else{
                    reject("This event hasn't been subscribed to")
                }
            }else{
                reject("Cant find contract with that address");
            }
        })
    }

    eventSubscribe(address:string, eventName:string): Promise<void>{
        return new Promise<void>((resolve,reject)=>{
            const index = this.contractListeners.findIndex(cl => cl.contract.address === address);
            if(index >= 0){
                const contractListener:contractListener = this.contractListeners[index];
                const events:Array<string> = contractListener.eventsAll.map(el => el.name);
                const eventsSubscribed:Array<string> = contractListener.eventsSubscribed.map(el => el.name);
            
                if(events.some(event=>event.toLowerCase() === eventName.toLowerCase())){
                    if(!eventsSubscribed.some(event => event.toLowerCase() === eventName.toLowerCase())){
                        const eventIndex = events.findIndex(item => item.toLowerCase() === eventName.toLowerCase());
                        this.contractListeners[index].eventsSubscribed.push(contractListener.eventsAll[eventIndex]);
                        this.contractListeners[index].contract.on(events[eventIndex], this.eventHandler.bind(this))
                        resolve();
                    }else{
                        reject("already listening to that event")
                    }
                }else{
                    reject("Cant find event with that name");
                }
                
            }else{
                reject("No contract saved under that address, use /addcontract first");
            }
        })
    }

    getEventsSubscribed(address:string): Promise<Array<string>>{
        return new Promise<Array<string>>((resolve,reject)=>{
            const index = this.contractListeners.findIndex(cl => cl.contract.address === address);
            if(index >= 0){
                const events:Array<string> = this.contractListeners[index].eventsSubscribed.map(el => el.name);
                if(events.length > 0){
                    resolve(events);
                }else{
                    reject("Not subscribed to any events on this contract");
                }
                
            }else{
                reject("No contract saved under that address, use /addcontract first");
            }
        })
    }

    getEventsAll(address:string): Promise<Array<string>>{
        return new Promise<Array<string>>((resolve,reject)=>{
            const index = this.contractListeners.findIndex(cl => cl.contract.address === address);
            if(index >= 0){
                const events:Array<string> = this.contractListeners[index].eventsAll.map(el => el.name);
                if(events.length > 0){
                    resolve(events);
                }else{
                    reject("This contract has no events");
                }
                
            }else{
                reject("No contract saved under that address, use /addcontract first");
            }
        })
    }

    getContracts(): Array<string>{
        if(this.contractListeners.length > 0){
            return this.contractListeners.map(cl => cl.contract.address);
        }else{
            return [];
        }
        
    }

    private getEventsFromAbi(abi:Array<Object>): Array<event>{
        //gets events from abi object
        let events:Array<event> = [];
        for(let item of abi){
            const event = <event>item;
            if(event.type === "event"){
                events.push(event);
            }
        }
        return events;
    }

    getAbiFromContractAddress(address:string): Promise<response>{
        //gets abi from contract address using etherscan api
        const options:Object = {
            method: 'GET',
            url: `https://api.etherscan.io/api`,
            params: {
                module: "contract",
                action: "getabi",
                address: address,
                apikey: this.etherscanApiKey
            },
          };
    
          return new Promise<response>((resolve,rej)=>{
            axios.request(options)
            .then((response) => {
                const data:response = response.data!;
                const abi:string = String(data.result);
                data.result = JSON.parse(abi);
                resolve(data);
            }).catch((error) => {
                rej(error);
            });
        })
    }
}