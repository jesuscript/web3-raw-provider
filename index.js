var Tx = require('ethereumjs-tx'),
    BN = require('bn.js'),
    _ = require("lodash"),
    ethUtils = require("ethereumjs-util"),
    Web3 = require("web3");

var HttpProvider = Web3.providers.HttpProvider;

var RawProvider = function(host,pk){
  if(!pk) throw new Error("Private key must be provided");
  
  HttpProvider.call(this, host);

  this._address = ethUtils.privateToAddress(pk).toString("hex");

  this.setPrivateKey(pk);
};

RawProvider.prototype = _.extend({}, HttpProvider.prototype, {
  setPrivateKey: function(pk){
    this._pk = pk;
  },
  sendAsync: function(payload, callback){
    return HttpProvider.prototype.sendAsync.call(this, this._process(payload), function(){
      callback.apply(null,arguments); 
    });
  },
  send: function(payload, callback){
    return HttpProvider.prototype.send.call(this, this._process(payload));
  },
  _process: function(payload){
    if(payload.method === "eth_sendTransaction"){
      var data = payload.params[0].data;

      var tx = _.extend(new Tx(), payload.params[0], {
        nonce: parseInt(this.send({
          jsonrpc: "2.0",
          method: "eth_getTransactionCount",
          params: [this._address, "pending"],
          id: 1
        }).result),
        gasLimit: payload.params[0].gas || 22000,
        data: (data && !_.startsWith(data,"0x")) ? ("0x"+data) : data
      });

      tx.sign(this._pk);
      
      payload =  {
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        id: payload.id,
        params: ['0x' + tx.serialize().toString('hex')]
      };
    }

    return payload;
  }
});


module.exports = RawProvider;
