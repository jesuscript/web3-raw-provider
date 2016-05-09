var Tx = require('ethereumjs-tx'),
    BN = require('bn.js'),
    _ = require("lodash"),
    ethUtils = require("ethereumjs-util"),
    Web3 = require("web3");

var HttpProvider = Web3.providers.HttpProvider;

var RawProvider = function(host,pk){
  HttpProvider.call(this, host);
  if(pk) this.setPrivateKey(pk);
};

RawProvider.prototype = _.extend({}, HttpProvider.prototype, {
  setPrivateKey: function(pk){
    this._pk = pk;
    this._address = "0x"+ethUtils.privateToAddress(pk).toString("hex");
  },
  sendAsync: function(payload, callback){
    var self = this;
    
    return this._process(payload, function(err, payload){
      HttpProvider.prototype.sendAsync.call(self, payload, function(){
        callback.apply(null,arguments); 
      });
    })
  },
  send: function(payload){
    return HttpProvider.prototype.send.call(this, this._process(payload));
  },
  _process: function(payload,cb){
    if(payload.method === "eth_sendTransaction"){
      if(!cb) throw new Error("sync sendTransaction is not supported")

      var self = this;

      this.sendAsync({
        jsonrpc: "2.0",
        method: "eth_getTransactionCount",
        params: [this._address, "pending"],
        id: 1
      }, function(err, res){
        var data = payload.params[0].data;

        var tx = _.extend(new Tx(), payload.params[0], {
          nonce: res.result,
          gasLimit: payload.params[0].gas || 22000,
          data: (data && !_.startsWith(data,"0x")) ? ("0x"+data) : data
        });

        tx.sign(self._pk);
        
        payload =  {
          jsonrpc: "2.0",
          method: "eth_sendRawTransaction",
          id: payload.id,
          params: ['0x' + tx.serialize().toString('hex')]
        };

        cb(err, payload)
      })
    }else{
      return cb ? cb(null, payload) : payload
    }
  }
});


module.exports = RawProvider;
