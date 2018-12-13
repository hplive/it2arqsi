var mongoose = require('mongoose');  
var OrderSchema = new mongoose.Schema({  
  name: String,
  item : {
    id : long,
    name : String,
    cathegory : String
     },
  itemProduto : [{
    id : long,
    name : String,
    cathegory : String
     }]
});
mongoose.model('Order', UserSchema);

module.exports = mongoose.model('Order');