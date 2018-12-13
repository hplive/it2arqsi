var mongoose = require('mongoose');  
var ItemSchema = new mongoose.Schema({  
    id: long,
    name: String,
    idCathegory: long,
    Cathegory: String,
});
mongoose.model('Item', UserSchema);

module.exports = mongoose.model('Item');