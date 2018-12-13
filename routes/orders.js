var express = require('express');
var router = express.Router();
var mongojs = require('mongojs');
//var db = mongojs('mongodb://teste:teste123@ds143593.mlab.com:43593/teste');
var db = mongojs('mongodb://teste:teste123@ds143593.mlab.com:43593/teste');
const http = require('http');
var urlpath="http://sicgcapi.azurewebsites.net"

// Get All Orders
router.get('/orders', function (req, res, next) {
    db.orders.find(function (err, orders) {
        if (err) {
            res.send(err);
        }
        res.json(orders);
    })
});

// Get Itens From Order
router.get('/order/:id/itens', function (req, res, next) {
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order.itens);
    })
});

// Get Item From Order
router.get('/order/:id/itens/:idp', function (req, res, next) {
    var done = false;
    var found = false;
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        for (index = 0; index < order.itens.length; ++index) {
            if (order.itens[index].id == req.params.idp) {
                res.json(order.itens[index]);
                found = true;
            }
            if (index == order.itens.length - 1) done = true;
        }
        while (!done);
        if (!found) res.json("Not Found");
    })
});


// Get Single Order
router.get('/order/:id', function (req, res, next) {
    db.orders.findOne({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order);
    })
});


// Save Order
router.post('/order', function (req, res, next) {

    var order = req.body;
    var done = false;
    var host = urlpath;
    if (typeof order.name == 'undefined') return "Invalid Order! Name missing";
    if (typeof order.item.id == 'undefined') return "Invalid Order! Item id missing";
    if (typeof order.item.name == 'undefined') return "Invalid Order! Item name missing";
    /*for (var ele in order.itemProduct) {
        if (typeof ele.id == 'undefined') return "Invalid Order! Item Product id missing";
        if (typeof ele.name == 'undefined') return "Invalid Order! Item Product name missing";
    }*/

    // valida se faltam agregações obrigatorias
    const request = require('request');
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: host + '/api/aggregation/' + order.item.id + '/' + 0 // 0 força ir buscar todas as obrigatorias
    }, function (error, response, body) {
        var aggregationsObrigatorias = JSON.parse(body);
        for (const aggregationObrigatoria of aggregationsObrigatorias) {
            var found = false;
            for (const itemP of order.itemProduct) {
                if (aggregationObrigatoria.productChild == itemP.id) {
                    found = true;
                }
            }
            if (!found) {
                try {
                    res.status(400);
                    res.json("Erro. Faltam agregações obrigatorias do item " + order.item.name);
                    res.end();
                    return "Erro. Faltam agregações obrigatorias do item " + order.item.name;
                } catch (err) {
                    return;
                }
            }
        }
    });
    // vai buscar informacao do Pai
    var productPai;
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: urlpath+'api/product/' + order.item.id
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            productPai = JSON.parse(body);
            // para cada itemProduto
            try {
                for (const itemProduct of order.itemProduct) {
                    if (typeof itemProduct.id == 'undefined') {
                        return "Invalid Order! Item Product id missing";
                    }
                    if (typeof itemProduct.name == 'undefined') {
                        return "Invalid Order! Item Product name missing";
                    }
                    // vai buscar aggregacao
                    request({
                        method: "GET",
                        rejectUnauthorized: false,
                        url: host + '/api/aggregation/' + order.item.id + '/' + itemProduct.id
                    }, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var aggregation = JSON.parse(body);
                            aggregation = aggregation[0];
                            // valida se existe  agregação
                            if (aggregation.length == 0) {
                                try {
                                    res.status(400);
                                    res.json("Erro. Não existe agregação entre" + order.item.name + " e " + itemProduct.name);
                                    res.end();
                                    return "Erro. Não existe agregação entre" + order.item.name + " e " + itemProduct.name;
                                } catch (err) {
                                    return;
                                }
                            }
                            // vai buscar informacao do filho
                            var productFilho;
                            request({
                                method: "GET",
                                "rejectUnauthorized": false,
                                "url": host + '/api/product/' + itemProduct.id
                            }, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    productFilho = JSON.parse(body);
                                    // valida medidas enviadas no pedido
                                    // valida se for discreta
                                    if (productFilho.lengthMin == 0 && productFilho.lengthMax != itemProduct.length) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.heightMin == 0 && productFilho.heightMax != itemProduct.height) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.depthMin == 0 && productFilho.depthMax != itemProduct.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida se for continua
                                    if (productFilho.lengthMin > itemProduct.length || productFilho.lengthMax < itemProduct.length) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.heightMin > itemProduct.height || productFilho.heightMax < itemProduct.height) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.depthMin > itemProduct.depth || productFilho.depthMax < itemProduct.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida o caber
                                    if (itemProduct.depth > order.item.depth || itemProduct.height > order.item.height || itemProduct.length > order.item.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name + ". Nao cabe");
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name + ". Nao cabe";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida same material
                                    if (aggregation.sameMaterialRequired == true) {
                                        if (productPai.materials.length !== productFilho.materials.length) {
                                            try {
                                                res.status(400);
                                                res.json("Erro. Materiais diferentes para os itens " + productPai.name + " e " + productFilho.name);
                                                res.end();
                                                return "Erro. Materiais diferentes";
                                            } catch (err) {
                                                return;
                                            }
                                        }
                                    }
                                    // valida percentage min max
                                    if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 < aggregation.minPercentage) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Produto Filho " + itemProduct.name + " nao preenche ocupação mínima.");
                                            res.end();
                                            return "Erro. Produto Filho " + itemProduct.name + " nao preenche ocupação mínima.";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 > aggregation.maxPercentage) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Produto Filho " + itemProduct.name + " excede ocupação máxima.");
                                            res.end();
                                            return "Erro. Produto Filho " + itemProduct.name + " excede ocupação máxima.";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida de item pai é mesmo pai e tem filhos e tambem que tem todas as agregacoes obrigatorias
                                    //const request = require('request');
                                    request({
                                        method: "GET",
                                        "rejectUnauthorized": false,
                                        "url": host + '/api/product/' + order.item.id + '/Partes'
                                    }, function (error, response, body) {
                                        if (!error && response.statusCode == 200) {
                                            var partes = JSON.parse(body);
                                            // não tem agregações
                                            if (partes.length == 0) {
                                                try {
                                                    res.status(400);
                                                    res.json("item " + order.item.name + "não tem agregações");
                                                    res.end();
                                                    return "item " + order.item.name + "não tem agregações";
                                                } catch (err) {
                                                    return;
                                                }
                                            } else { // order OK - Gravar
                                                db.orders.save(order, function (err, order) {
                                                    if (err) {
                                                        try {
                                                            res.send(err);
                                                        } catch (err) {

                                                        }

                                                    }
                                                    try {
                                                        res.json(order);
                                                    } catch (err) {
                                                        try {
                                                            res.status(400);
                                                            res.json("Ocorreu um erro! " + error);
                                                            res.end();
                                                            return "Ocorreu um erro! " + error;
                                                        } catch (err) {
                                                            return;
                                                        }
                                                    }
                                                });
                                            }
                                            //var i;
                                            /*for (const parte of partes) {
                                                //for (i = 0; i < aggregations.length; i++) {

                                                if (parte.type == true) {
                                                    var j;
                                                    var found = false;
                                                    for (const itemProduct2 of order.itemProduct) {
                                                        //for (j = 0; j < order.itemProduct.length; j++) {
                                                        if (parte.productChild == itemProduct2.id) {
                                                            found = true;
                                                        }
                                                    }
                                                }

                                            }
                                            if (!found) {
                                                return "Agregações obrigatórias em falta";
                                            }*/
                                        } else {
                                            return "Ocorreu um erro! " + error;
                                        }
                                        done = true;
                                    });
                                } else {
                                    try {
                                        res.status(400);
                                        res.json("Ocorreu um erro! " + error);
                                        res.end();
                                        return "Ocorreu um erro! " + error;
                                    } catch (err) {
                                        return;
                                    }

                                }
                            });
                        } else {
                            try {
                                res.status(400);
                                res.json("Ocorreu um erro! " + error);
                                res.end();
                                return "Ocorreu um erro! " + error;
                            } catch (err) {
                                return;
                            }
                        }
                    });
                }
            } catch (err) {

            }
        } else {
            try {
                res.status(400);
                res.json("Ocorreu um erro! " + error);
                res.end();
                return "Ocorreu um erro! " + error;
            } catch (err) {
                return;
            }
        }
    });
    // insere order se OK
    //wait(10000);
    //var order = req.body;
    /*db.orders.save(order, function (err, order) {
        if (err) {
            try {
                res.send(err);
            } catch (err) {

            }

        }
        try {
            res.json(order);
        } catch (err) {

        }
    });*/
    


    /*wait(5000);
    if (ret == "OK") {
        var order = req.body;
        db.orders.save(order, function (err, order) {
            if (err) {
                res.send(err);
            }
            res.json(order);
        });
    } else {
        res.json(ret);
    }*/





    //while(!done);
    //return "OK";
    /*request({
        method: "GET",
        "rejectUnauthorized": false,
        "url": 'http://localhost:5000/api/product/1' }
    , function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body); // Show the HTML for the Google homepage. 
        }

    });*/




    /*var ret = validateOrder(req.body, function () {
        console.log("MAMA CRL");
        if (ret == "OK") {
            var order = req.body;
            db.orders.save(order, function (err, order) {
                if (err) {
                    res.send(err);
                }
                res.json(order);
            });
        } else {
            res.json(ret);
        }
    });  */
});

// Delete order
router.delete('/order/:id', function (req, res, next) {
    db.orders.remove({ _id: mongojs.ObjectId(req.params.id) }, function (err, order) {
        if (err) {
            res.send(err);
        }
        res.json(order);
    })
});

// Update order
router.put('/order/:id', function (req, res, next) {


    var order = req.body;
    var done = false;
    var host = urlpath;
    if (typeof order.name == 'undefined') return "Invalid Order! Name missing";
    if (typeof order.item.id == 'undefined') return "Invalid Order! Item id missing";
    if (typeof order.item.name == 'undefined') return "Invalid Order! Item name missing";
    /*for (var ele in order.itemProduct) {
        if (typeof ele.id == 'undefined') return "Invalid Order! Item Product id missing";
        if (typeof ele.name == 'undefined') return "Invalid Order! Item Product name missing";
    }*/

    // valida se faltam agregações obrigatorias
    const request = require('request');
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: host + '/api/aggregation/' + order.item.id + '/' + 0 // 0 força ir buscar todas as obrigatorias
    }, function (error, response, body) {
        var aggregationsObrigatorias = JSON.parse(body);
        for (const aggregationObrigatoria of aggregationsObrigatorias) {
            var found = false;
            for (const itemP of order.itemProduct) {
                if (aggregationObrigatoria.productChild == itemP.id) {
                    found = true;
                }
            }
            if (!found) {
                try {
                    res.status(400);
                    res.json("Erro. Faltam agregações obrigatorias do item " + order.item.name);
                    res.end();
                    return "Erro. Faltam agregações obrigatorias do item " + order.item.name;
                } catch (err) {
                    return;
                }
            }
        }
    });
    // vai buscar informacao do Pai
    var productPai;
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: urlpath+'api/product/' + order.item.id
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            productPai = JSON.parse(body);
            // para cada itemProduto
            try {
                for (const itemProduct of order.itemProduct) {
                    if (typeof itemProduct.id == 'undefined') {
                        return "Invalid Order! Item Product id missing";
                    }
                    if (typeof itemProduct.name == 'undefined') {
                        return "Invalid Order! Item Product name missing";
                    }
                    // vai buscar aggregacao
                    request({
                        method: "GET",
                        rejectUnauthorized: false,
                        url: host + '/api/aggregation/' + order.item.id + '/' + itemProduct.id
                    }, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            var aggregation = JSON.parse(body);
                            aggregation = aggregation[0];
                            // valida se existe  agregação
                            if (aggregation.length == 0) {
                                try {
                                    res.status(400);
                                    res.json("Erro. Não existe agregação entre" + order.item.name + " e " + itemProduct.name);
                                    res.end();
                                    return "Erro. Não existe agregação entre" + order.item.name + " e " + itemProduct.name;
                                } catch (err) {
                                    return;
                                }
                            }
                            // vai buscar informacao do filho
                            var productFilho;
                            request({
                                method: "GET",
                                "rejectUnauthorized": false,
                                "url": host + '/api/product/' + itemProduct.id
                            }, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    productFilho = JSON.parse(body);
                                    // valida medidas enviadas no pedido
                                    // valida se for discreta
                                    if (productFilho.lengthMin == 0 && productFilho.lengthMax != itemProduct.length) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.heightMin == 0 && productFilho.heightMax != itemProduct.height) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.depthMin == 0 && productFilho.depthMax != itemProduct.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida se for continua
                                    if (productFilho.lengthMin > itemProduct.length || productFilho.lengthMax < itemProduct.length) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.heightMin > itemProduct.height || productFilho.heightMax < itemProduct.height) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if (productFilho.depthMin > itemProduct.depth || productFilho.depthMax < itemProduct.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name);
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name;
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida o caber
                                    if (itemProduct.depth > order.item.depth || itemProduct.height > order.item.height || itemProduct.length > order.item.depth) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Medidas invalidas do produto " + itemProduct.name + ". Nao cabe");
                                            res.end();
                                            return "Erro. Medidas invalidas do produto " + itemProduct.name + ". Nao cabe";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida same material
                                    if (aggregation.sameMaterialRequired == true) {
                                        if (productPai.materials.length !== productFilho.materials.length) {
                                            try {
                                                res.status(400);
                                                res.json("Erro. Materiais diferentes para os itens " + productPai.name + " e " + productFilho.name);
                                                res.end();
                                                return "Erro. Materiais diferentes";
                                            } catch (err) {
                                                return;
                                            }
                                        }
                                    }
                                    // valida percentage min max
                                    if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 < aggregation.minPercentage) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Produto Filho " + itemProduct.name + " nao preenche ocupação mínima.");
                                            res.end();
                                            return "Erro. Produto Filho " + itemProduct.name + " nao preenche ocupação mínima.";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 > aggregation.maxPercentage) {
                                        try {
                                            res.status(400);
                                            res.json("Erro. Produto Filho " + itemProduct.name + " excede ocupação máxima.");
                                            res.end();
                                            return "Erro. Produto Filho " + itemProduct.name + " excede ocupação máxima.";
                                        } catch (err) {
                                            return;
                                        }
                                    }
                                    // valida de item pai é mesmo pai e tem filhos e tambem que tem todas as agregacoes obrigatorias
                                    //const request = require('request');
                                    request({
                                        method: "GET",
                                        "rejectUnauthorized": false,
                                        "url": host + '/api/product/' + order.item.id + '/Partes'
                                    }, function (error, response, body) {
                                        if (!error && response.statusCode == 200) {
                                            var partes = JSON.parse(body);
                                            // não tem agregações
                                            if (partes.length == 0) {
                                                try {
                                                    res.status(400);
                                                    res.json("item " + order.item.name + "não tem agregações");
                                                    res.end();
                                                    return "item " + order.item.name + "não tem agregações";
                                                } catch (err) {
                                                    return;
                                                }
                                            } else { // order OK - Gravar
                                                db.orders.update({ _id: mongojs.ObjectId(req.params.id) }, updOrder, {}, function (err, order) {
                                                    if (err) {
                                                        res.send(err);
                                                    }
                                                    try {
                                                        res.json(order);
                                                    } catch (err) {
                                                        return;
                                                    }
                                                });
                                            }
                                            //var i;
                                            /*for (const parte of partes) {
                                                //for (i = 0; i < aggregations.length; i++) {

                                                if (parte.type == true) {
                                                    var j;
                                                    var found = false;
                                                    for (const itemProduct2 of order.itemProduct) {
                                                        //for (j = 0; j < order.itemProduct.length; j++) {
                                                        if (parte.productChild == itemProduct2.id) {
                                                            found = true;
                                                        }
                                                    }
                                                }

                                            }
                                            if (!found) {
                                                return "Agregações obrigatórias em falta";
                                            }*/
                                        } else {
                                            return "Ocorreu um erro! " + error;
                                        }
                                        done = true;
                                    });
                                } else {
                                    try {
                                        res.status(400);
                                        res.json("Ocorreu um erro! " + error);
                                        res.end();
                                        return "Ocorreu um erro! " + error;
                                    } catch (err) {
                                        return;
                                    }

                                }
                            });
                        } else {
                            try {
                                res.status(400);
                                res.json("Ocorreu um erro! " + error);
                                res.end();
                                return "Ocorreu um erro! " + error;
                            } catch (err) {
                                return;
                            }
                        }
                    });
                }
            } catch (err) {

            }
        } else {
            try {
                res.status(400);
                res.json("Ocorreu um erro! " + error);
                res.end();
                return "Ocorreu um erro! " + error;
            } catch (err) {
                return;
            }
        }
    });


    // fim validação order
    /*var ret = validateOrder(req.params);
    if (ret == "OK") {
        var order = req.params;
        var updOrder = {};
        if (!updOrder) {
            res.status(400);
            res.json({
                "error": "Bad Data"
            });
        } else {
            db.orders.update({ _id: mongojs.ObjectId(req.params.id) }, updOrder, {}, function (err, order) {
                if (err) {
                    res.send(err);
                }
                res.json(order);
            });
        }
    } else {
        res.json(ret);
    }*/
});

function wait(ms){
    var start = new Date().getTime();
    var end = start;
    while(end < start + ms) {
      end = new Date().getTime();
   }
 }

function validateOrder(order) {
    var done = false;
    var host = urlpath;
    if (typeof order.name == 'undefined') return "Invalid Order! Name missing";
    if (typeof order.item.id == 'undefined') return "Invalid Order! Item id missing";
    if (typeof order.item.name == 'undefined') return "Invalid Order! Item name missing";
    /*for (var ele in order.itemProduct) {
        if (typeof ele.id == 'undefined') return "Invalid Order! Item Product id missing";
        if (typeof ele.name == 'undefined') return "Invalid Order! Item Product name missing";
    }*/

    // vai buscar informacao do Pai
    var productPai;
    const request = require('request');
    request({
        method: "GET",
        rejectUnauthorized: false,
        url: urlpath+'api/product/' + order.item.id
    }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            productPai = JSON.parse(body);
        } else {
            return "Ocorreu um erro! " + error;
        }
        // para cada itemProduto
        var i;
        var done = true;
        //for (i = 0; i < order.itemProduct.length; i++) {
        for (const itemProduct of order.itemProduct) {
            //while(!done);
            //done =false;
            console.log('XUXA CRL');
            if (typeof itemProduct.id == 'undefined') return "Invalid Order! Item Product id missing";
            if (typeof itemProduct.name == 'undefined') return "Invalid Order! Item Product name missing";
            // vai buscar aggregacao
            //const request = require('request');
            request({
                method: "GET",
                rejectUnauthorized: false,
                url: host + '/api/aggregation/' + order.item.id + '/' + itemProduct.id
            }, function (error, response, body) {
                console.log('xuxinha');
                console.log(host + '/api/aggregation/' + order.item.id + '/' + itemProduct.id);
                if (!error && response.statusCode == 200) {
                    console.log('XUXA CRL FODASSE');
                    var aggregation = JSON.parse(body);
                    // vai buscar informacao do filho
                    var productFilho;
                    //const request = require('request');
                    request({
                        method: "GET",
                        "rejectUnauthorized": false,
                        "url": host + '/api/product/' + order.item.id
                    }, function (error, response, body) {
                        if (!error && response.statusCode == 200) {
                            productFilho = JSON.parse(body);
                            // valida se medidas enviadas no pedido
                            // valida se for discreta
                            if (productFilho.lengthMin == 0 && productFilho.lengthMax != itemProduct.length) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            if (productFilho.heightMin == 0 && productFilho.heightMax != itemProduct.height) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            if (productFilho.depthMin == 0 && productFilho.depthMax != itemProduct.depth) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            // valida se for continua
                            if (productFilho.lengthMin >= itemProduct.length || productFilho.lengthMax <= itemProduct.length) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            if (productFilho.heightMin >= itemProduct.height || productFilho.heightMax <= itemProduct.height) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            if (productFilho.depthMin >= itemProduct.depth || productFilho.depthMax <= itemProduct.depth) {
                                return "Erro. Medidas invalidas do produto " + itemProduct.name;
                            }
                            // valida same material
                            console.log("aggregation.sameMaterialRequired: " + aggregation.sameMaterialRequired);
                            if (aggregation.sameMaterialRequired == 'true') {
                                if (productPai.materials !== productFilho.materials) {
                                    return "Erro. Materiais diferentes";
                                }
                            }
                            // valida percentage min max
                            if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 < aggregation.minPercentage) {
                                return "Erro. Produto Filho nao preenche ocupação mínima.";
                            }
                            if ((itemProduct.length * itemProduct.height * itemProduct.depth) / (order.item.length * order.item.height * order.item.depth) * 100 > aggregation.maxPercentage) {
                                return "Erro. Produto Filho excede ocupação máxima.";
                            }

                            // valida de item pai é mesmo pai e tem filhos e tambem que tem todas as agregacoes obrigatorias
                            //const request = require('request');
                            /*request({
                                method: "GET",
                                "rejectUnauthorized": false,
                                "url": host + '/api/product/' + order.item.id + '/Partes'
                            }, function (error, response, body) {
                                if (!error && response.statusCode == 200) {
                                    var aggregations = JSON.parse(body);
                                    var i;
                                    for (i = 0; i < aggregations.length; i++) {
                                        if (aggregations[i].type == 'true') {
                                            var j;
                                            var found = false;
                                            for (j = 0; j < order.itemProduct.length; j++) {
                                                if (aggregations[i].productChild == order.itemProduct[j].id) {
                                                    found = true;
                                                }
                                            }
                                        }
                                        if (!found) {
                                            return "Agregações obrigatórias em falta";
                                        }
                                    }
                                } else {
                                    return "Ocorreu um erro! " + error;
                                }
                                done = true;
                            });*/
                        } else {
                            return "Ocorreu um erro! " + error;
                        }
                    });
                } else {
                    return "Ocorreu um erro! " + error;
                }
                done = true;
            });
            //console.log(order.itemProduct[i].id);
            //console.log(order.itemProduct[i].name);
        }
    });
    //while(!done);
    //return "OK";
    /*request({
        method: "GET",
        "rejectUnauthorized": false,
        "url": 'http://localhost:5000/api/product/1' }
    , function (error, response, body) {
        if (!error && response.statusCode == 200) {
            console.log(body); // Show the HTML for the Google homepage. 
        }

    });*/
}

function validaItemProduct() {

}

module.exports = router;